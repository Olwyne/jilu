# Modèle de données v2 — catalogue partagé, peu d'appels, peu d'écritures

Statut : **proposition à valider** (aucun code écrit). Basé sur l'audit du 2026-10-20 et sur le rapport des comptes réels.

## 1. Objectifs
1. Ne **jamais perdre** une donnée utilisateur pendant la migration (copie, jamais de suppression avant validation).
2. **Moins d'appels API externes** (TMDB, AniList, MangaDex) : une œuvre est récupérée une fois pour tous.
3. **Moins d'écritures** Firestore : une action utilisateur = 1 écriture sur 1 document.
4. **Moins de lectures** : l'ouverture de l'app ne relit pas toute la bibliothèque.
5. Supporter beaucoup plus d'utilisateurs (quota gratuit Firestore : 50 000 lectures et 20 000 écritures par jour).

## 2. Situation actuelle (chiffres du rapport)
| Compte | Docs `works` | Docs `watched` | Lectures à chaque ouverture |
|---|---|---|---|
| mili_mili | 4 010 | 1 376 | ≈ 5 400 |
| fasstech | 1 627 | 437 | ≈ 2 070 |
| olwyne | 1 021 | 556 | ≈ 1 580 |
| 8 autres comptes | 11 | 172 | ≈ 200 |
| **Total** | **6 669** | **2 541** | **≈ 9 200** |

À cela s'ajoute le rafraîchissement client (jusqu'à 100 œuvres par heure et par appareil, chacune = 1 + saisons + 2 appels).

> **Correction d'une estimation précédente** : fusionner `works` et `watched` en un document par œuvre ne divise pas les lectures par deux (la plupart des œuvres n'ont pas de progression : 4 010 œuvres pour 1 376 docs de progression chez `mili_mili`). Le gain réel de la fusion est d'environ **−27 %**. Le gros gain vient de la **synchronisation par delta** (section 5).

## 3. Schéma cible
```
catalog/{workId}                       UNE copie par œuvre, mise à jour côté serveur
   titre(s) fr/en · affiche(s) · catégorie · genre · année · terminé ?
   seasons[] → episodes[] (n, titre, date de sortie)
   updatedAt

users/{uid}                            réglages · objectifs · nom   (sans e-mail, petit document)
users/{uid}/library/{workId}           UN document par œuvre suivie
   résumé : titre · affiche · catégorie · année         (copié à l'ajout, pour afficher la liste sans lire le catalogue)
   statut · favori · note · addedAt · finishedAt
   eps: { "1-3": date, … }             épisodes vus (ancien `watched`)
   watchedCount                        pour les barres de progression
   updatedAt · deleted?                 (suppression douce, voir §5)

publicProfiles/{uid}                   pseudo · avatar · statistiques (pas d'e-mail)
pseudos/{pseudo} → uid                 inchangé
reviews/{id}                           inchangé
follows/{uid}                          inchangé
quiz/{date}/scores/{uid}               inchangé
```
Points de conception :
- **Titre/affiche dans la bibliothèque** : un résumé minimal est copié à l'ajout, sinon l'affichage de la liste exigerait N lectures du catalogue. Le serveur ne propage jamais les changements du catalogue vers les bibliothèques (ce serait 1 écriture par utilisateur et par œuvre) ; une fiche se resynchronise quand l'utilisateur ouvre l'œuvre.
- **Les images** passent par le CDN des fournisseurs (cache navigateur / service worker) : aucun coût Firestore ni API.
- Taille : une série de 1 000 épisodes pèse ≈ 100 Ko (limite Firestore : 1 Mo), donc OK pour le catalogue comme pour `eps`.

## 4. Coût par action (avant → après)
| Action | Avant | Après |
|---|---|---|
| Cocher un épisode | 1–2 écritures (map complète des épisodes + doc œuvre si statut change) | **1 écriture** (champ `eps.1-3`, `watchedCount`, statut, `updatedAt` dans le même document) |
| Marquer une saison / tout | 1 écriture par œuvre, map complète | 1 écriture par œuvre modifiée, champs ciblés |
| Noter / favori | 1 écriture du gros doc utilisateur (tableaux entiers) | 1 écriture du doc de l'œuvre |
| Ajouter une série (S saisons) | 1 + S + 2 appels API (+2 si anime) + 1 écriture lourde | si déjà au catalogue : **0 appel**, 1 écriture ; sinon 1–2 appels (`append_to_response`) une seule fois pour tous |
| Rafraîchissement | client, par appareil, 100 œuvres/h | **serveur**, 1×/jour, seulement les œuvres encore en diffusion |
| Ouverture de l'app (`mili_mili`) | ≈ 5 400 lectures | **≈ 10 lectures** (delta) ; 4 011 la 1re fois sur un nouvel appareil |
| Ouverture (utilisateur moyen) | ≈ 30–2 000 | ≈ 5–10 |

Les cases rapides consécutives sont regroupées (délai ≈ 500 ms) en une seule écriture.

## 5. Synchronisation par delta
Chaque document `library/*` porte `updatedAt`. Au démarrage :
1. Lire le cache local (Firestore `persistentLocalCache`, IndexedDB) : 0 lecture.
2. Interroger `library where updatedAt > derniereSynchro` : seuls les documents modifiés sont lus et facturés.
3. Les suppressions sont des **suppressions douces** (`deleted: true`), purgées plus tard, pour que les autres appareils les voient.

Le cache de Firestore seul ne suffit pas : un écouteur rouvert après plus de 30 minutes relit tout.

## 6. Catalogue : remplissage et sécurité
- Phase migration : les navigateurs autorisés peuvent **créer** (jamais modifier) une fiche `catalog/*` si elle n'existe pas, avec validation de forme dans les règles. Acceptable à 11 utilisateurs de confiance.
- Phase suivante : écriture réservée au serveur (fonction Vercel + clés TMDB/AniList/MangaDex), règles resserrées à lecture seule.
- Le serveur rafraîchit chaque jour uniquement les œuvres dont `ended === false`.

## 7. Plan de migration (aucune perte)
Prérequis : sauvegarde complète de la base (export JSON par script, ou export natif si forfait Blaze) ; répétition sur les émulateurs avec des données ressemblant à la production.

| Étape | Action | Réversible ? |
|---|---|---|
| 0 | Correctifs de la phase 0 déployés (site puis règles), audit des comptes, nettoyage de l'orphelin | oui |
| 1 | Règles : ajouter `catalog` (création seule) et `library` (propriétaire). Aucun changement du site | oui |
| 2 | Site « double lecture » : lit `library` si présent, sinon l'ancien modèle ; **écrit dans les deux** | oui (redéployer l'ancien site) |
| 3 | **Migration par utilisateur** (script ou bouton réservé à votre compte pour le premier essai) : copie `works` + `watched` → `catalog` + `library`. Idempotente, sans suppression | oui |
| 4 | Script de contrôle : pour chaque utilisateur, nombre d'œuvres, d'épisodes et statuts avant/après | — |
| 5 | Bascule : le site ne lit plus que le nouveau modèle | oui tant que l'ancien existe |
| 6 | Attendre plusieurs jours, sauvegarde, puis suppression de l'ancien modèle et du code de double écriture | **non** |
| 7 | Rafraîchissement serveur ; retrait du rafraîchissement client ; règles du catalogue resserrées | oui |

Retour arrière avant l'étape 6 : redéployer le site précédent. Les anciennes données n'ont jamais été modifiées.

## 8. Cas particuliers repérés dans le rapport
1. **Pas de document `users`** (compte `l1ts…`, 6 œuvres) : normal tant qu'aucun réglage n'a été modifié ; la migration doit créer `users/{uid}` au besoin.
2. **Progression sans œuvre** (`zJjs…`, 164 docs `watched`, 0 `works`) : copier la progression dans `library/{workId}` avec un champ `orphanProgress: true` pour ne rien perdre et décider ensuite. À vérifier dans la console avant la migration.
3. **Orphelin** `gQR4…` : à inspecter via `--backup`, puis supprimer.
4. **Œuvres sans `sourceId`** (imports sans correspondance) : migrer telles quelles avec `catalog` local à l'utilisateur (`catalog/local-{uid}-{slug}`).
5. **Très grosses bibliothèques** (4 010 œuvres) : écritures en lots de 400, reprise possible après interruption, durée estimée quelques minutes.

## 8bis. État d'avancement (étape 1 faite)
- `src/lib/migration.js` : copie `works` + `watched` + notes/favoris/jeux vers `catalog` + `users/{uid}/library`, sans écrire dans l'ancien modèle ; idempotente ; contrôle avant/après.
- Règles : `catalog` (création seule, validée), `library` et `migrations` ; bloc **TEMPORAIRE** `isMigrationAdmin()` (lecture de l'ancien modèle, écriture du nouveau uniquement) à retirer après la migration.
- Boutons « Migrer mon compte » et « Migrer tous les comptes » (compte du propriétaire uniquement), sauvegarde JSON téléchargée avant toute écriture.
- Le site lit encore l'ancien modèle : les données v2 sont écrites mais pas encore utilisées.
- À retirer après migration : bloc `isMigrationAdmin` et règles `{path=**}` dans `firestore.rules`, `MigrationPanel.jsx`, `src/lib/migration.js`.

## 8ter. Étape 1 de la bascule : fonction serveur de rafraîchissement (faite, non utilisée par le site)
- `POST /api/refresh-work { id }` + jeton Firebase : met à jour **une fiche du catalogue partagé**. Aucun effet tant que le site ne l'appelle pas.
- Garde-fous : une fiche rafraîchie depuis moins de 6 h n'appelle jamais les API ; verrou transactionnel (2 min) contre les requêtes simultanées ; un résultat vide ou sans titre ne remplace jamais une fiche ; les champs propres à l'utilisateur ne vont jamais dans le catalogue.
- Les modules `src/catalog/*` sont utilisables côté navigateur et côté serveur (transport `http.js`, langue `locale.js`, imports avec extension `.js`).
- Configuration Vercel requise : variable `FIREBASE_SERVICE_ACCOUNT`, plus `TMDB_API_KEY` (déjà en place) ; durée max de la fonction : 60 s (`vercel.json`).
- Limite connue : les titres d'épisodes du catalogue partagé sont récupérés en français (langue par défaut de l'application) ; une version bilingue pourra être ajoutée.

## 8quater. Étape 2a : couche de lecture v2 (faite, pas branchée sur l'interface)
- `src/data/assemble.js` : reconstitue `works / watched / ratings / favorites / games / reviews` **au même format que l'ancien modèle** à partir de la bibliothèque + catalogue → les écrans n'ont pas à changer. Test d'aller-retour ancien → v2 → reconstitué (identique, `Infinity` compris).
- `src/data/library.js` : synchronisation par delta (`updatedAt`) depuis un cache IndexedDB : 1re ouverture = tout lire, ouvertures suivantes = 0 lecture si rien n'a changé ; fenêtre de recouvrement de 10 min (horloges), relecture complète hebdomadaire (filet de sécurité), suppression douce, cache effaçable à la déconnexion.
- `src/data/catalog.js` : fiches du catalogue en cache 24 h, lecture par lots de 30, fiches absentes mémorisées.
- Au démarrage on charge le catalogue des œuvres « en cours » / « à voir » (badge « à rattraper », calendrier) ; le reste à la demande (fiche d'une œuvre, statistiques).
- Test de bout en bout sur l'émulateur : ancien modèle → vraie migration → lecture v2 → reconstitution identique.

## 8quinquies. Bascule définitive : tout le monde sur le nouveau modèle (faite)
Décision du propriétaire : pas d'interrupteur, pas de double écriture, pas de retour au modèle précédent.
- **Rattrapage à la première ouverture de chaque compte** (`useCutover` / `ensureCutover`) : ce qui a changé dans l'ancien modèle depuis la première copie est repris (progression, statuts, œuvres ajoutées ou retirées), contrôlé, puis marqué `cutoverAt`. Écran de progression ; en cas d'échec : message + « Réessayer » (rien n'est perdu, l'ancien modèle n'est pas touché).
- **Une seule écriture** : `users/{uid}/library/{œuvre}` (une écriture par document touché) ; le document utilisateur ne reçoit plus que réglages, profil, fil d'activité… et une copie des avis personnels (le fil d'amis la lit). **L'ancien modèle n'est plus écrit** ; ses données restent en place, inutilisées (suppression à décider plus tard).
- **Lecture** : cache local + synchronisation par delta ; catalogue des œuvres « en cours / à voir » à l'ouverture, avec durée de validité par fiche (24 h si encore en diffusion, 30 jours sinon) ; épisodes des autres œuvres à la demande selon l'écran ; export complet = charge tout avant d'exporter.
- **Rafraîchissement 100 % côté serveur** (`api/refresh-work`) : le navigateur n'appelle plus TMDB/AniList/MangaDex pour mettre à jour une fiche. Automatique : au plus 5 œuvres en diffusion par ouverture, fraîcheur demandée 24 h ; manuel : bouton de la fiche et réglages (100 œuvres en diffusion max), plancher serveur 6 h. Le serveur ne rappelle les API qu'une fois par fiche et par période, quel que soit le nombre d'utilisateurs.
- **Ajout d'une œuvre** : si la fiche existe déjà au catalogue, aucun appel aux API ; sinon le premier qui l'ajoute la crée pour tous (création seule).
- **Profils publics** : lecture de la bibliothèque publique + catalogue (lisible par tous). **Suppression de compte** : efface aussi `library` et `migrations`.
- Règles : `library` lisible si profil public ; `catalog` lisible par tous (métadonnées publiques) ; plus de document de configuration.
- Limites connues : pas encore de tâche planifiée (les œuvres que personne n'ouvre ne sont pas rafraîchies) ; en développement local, `/api/refresh-work` n'existe pas (le serveur de dev ne le simule pas) ; la fiche créée par le premier utilisateur n'est pas vérifiée côté serveur (acceptable à petite échelle).

## 9. Décisions
Tranchées :
- **Méthode de migration** : depuis le site, dans le navigateur, avec la session de l'utilisateur (aucune clé de compte de service, aucun script local). D'abord un bouton visible uniquement pour le compte du propriétaire (essai grandeur nature), puis exécution automatique à la connexion de chaque utilisateur, une seule fois, avec contrôle avant/après. Le code de migration est retiré une fois tous les comptes actifs migrés.
- **Sauvegarde** : export JSON des données de l'utilisateur téléchargé automatiquement avant la copie (fonction d'export déjà présente), en plus du fait que la migration ne supprime rien.
- **Audit des comptes** : fait ; l'orphelin restant (sans donnée) est supprimé à la main dans la console.

Restent à valider :
1. Le schéma (en particulier : résumé copié dans `library` vs lecture du catalogue).
2. Nombre de jours d'observation avant de supprimer l'ancien modèle (proposition : 14 jours).
