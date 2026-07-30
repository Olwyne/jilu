export const ACHIEVEMENTS = [
  // Bibliothèque
  { id: 'lib_10',    emoji: '📖', label: 'Curieux',       desc: '10 œuvres',    getValue: (s) => s.totalWorks,      threshold: 10 },
  { id: 'lib_50',    emoji: '📚', label: 'Lecteur',        desc: '50 œuvres',    getValue: (s) => s.totalWorks,      threshold: 50 },
  { id: 'lib_100',   emoji: '🗂️', label: 'Bibliothécaire', desc: '100 œuvres',   getValue: (s) => s.totalWorks,      threshold: 100 },
  { id: 'lib_500',   emoji: '🏛️', label: 'Archiviste',     desc: '500 œuvres',   getValue: (s) => s.totalWorks,      threshold: 500 },
  { id: 'lib_1000',  emoji: '🌌', label: 'Encyclopédie',   desc: '1 000 œuvres', getValue: (s) => s.totalWorks,      threshold: 1000 },
  // Épisodes
  { id: 'ep_10',    emoji: '▶️',  label: 'Premier épisode', desc: '10 épisodes',   getValue: (s) => s.totalEps,       threshold: 10 },
  { id: 'ep_100',   emoji: '📺',  label: 'Binge-watcher',   desc: '100 épisodes',  getValue: (s) => s.totalEps,       threshold: 100 },
  { id: 'ep_500',   emoji: '🎬',  label: 'Cinéphile',       desc: '500 épisodes',  getValue: (s) => s.totalEps,       threshold: 500 },
  { id: 'ep_1000',  emoji: '🏆',  label: 'Marathonien',     desc: '1 000 épisodes',getValue: (s) => s.totalEps,       threshold: 1000 },
  { id: 'ep_5000',  emoji: '🌟',  label: 'Légende',         desc: '5 000 épisodes',getValue: (s) => s.totalEps,       threshold: 5000 },
  // Films
  { id: 'films_10', emoji: '🎥',  label: 'Ciné du dimanche', desc: '10 films',    getValue: (s) => s.filmsSeen,      threshold: 10 },
  { id: 'films_25', emoji: '🎞️',  label: 'Cinéaste',         desc: '25 films',    getValue: (s) => s.filmsSeen,      threshold: 25 },
  { id: 'films_50', emoji: '🎭',  label: 'Critique de film', desc: '50 films',    getValue: (s) => s.filmsSeen,      threshold: 50 },
  { id: 'films_100',emoji: '🎦',  label: 'Directeur',        desc: '100 films',   getValue: (s) => s.filmsSeen,      threshold: 100 },
  // Séries
  { id: 'series_5', emoji: '📡',  label: 'Accroché',         desc: '5 séries terminées',  getValue: (s) => s.seriesVues,    threshold: 5 },
  { id: 'series_10',emoji: '📻',  label: 'Sériephile',       desc: '10 séries terminées', getValue: (s) => s.seriesVues,    threshold: 10 },
  { id: 'series_25',emoji: '🎙️',  label: 'Bingeur pro',      desc: '25 séries terminées', getValue: (s) => s.seriesVues,    threshold: 25 },
  { id: 'series_50',emoji: '🥇',  label: 'Grand bingeur',    desc: '50 séries terminées', getValue: (s) => s.seriesVues,    threshold: 50 },
  // Animés
  { id: 'anime_5',  emoji: '⛩️',  label: 'Otaku débutant',  desc: '5 animés terminés',   getValue: (s) => s.animesVus,     threshold: 5 },
  { id: 'anime_10', emoji: '🌸',  label: 'Otaku confirmé',  desc: '10 animés terminés',  getValue: (s) => s.animesVus,     threshold: 10 },
  { id: 'anime_25', emoji: '🗡️',  label: 'Otaku légendaire',desc: '25 animés terminés',  getValue: (s) => s.animesVus,     threshold: 25 },
  // Mangas
  { id: 'manga_5',  emoji: '📕',  label: 'Lecteur manga',   desc: '5 mangas terminés',   getValue: (s) => s.mangasLus,     threshold: 5 },
  { id: 'manga_10', emoji: '📗',  label: 'Mangaka fan',     desc: '10 mangas terminés',  getValue: (s) => s.mangasLus,     threshold: 10 },
  // Jeux
  { id: 'game_5',   emoji: '🎮',  label: 'Gamer',           desc: '5 jeux terminés',     getValue: (s) => s.jeuxFinis,     threshold: 5 },
  { id: 'game_10',  emoji: '🕹️',  label: 'Hardcore gamer',  desc: '10 jeux terminés',    getValue: (s) => s.jeuxFinis,     threshold: 10 },
  // Livres
  { id: 'book_5',   emoji: '📓',  label: 'Bookworm',        desc: '5 livres lus',        getValue: (s) => s.livresLus,     threshold: 5 },
  { id: 'book_10',  emoji: '📒',  label: 'Lecteur assidu',  desc: '10 livres lus',       getValue: (s) => s.livresLus,     threshold: 10 },
  // Avis
  { id: 'rate_10',  emoji: '✍️',  label: 'Critique amateur', desc: '10 avis',            getValue: (s) => s.ratedN,        threshold: 10 },
  { id: 'rate_50',  emoji: '🖊️',  label: 'Critique sérieux', desc: '50 avis',            getValue: (s) => s.ratedN,        threshold: 50 },
  { id: 'rate_100', emoji: '📝',  label: 'Grand critique',   desc: '100 avis',           getValue: (s) => s.ratedN,        threshold: 100 },
  // Diversité
  { id: 'diverse',  emoji: '🌈',  label: 'Omnivore',        desc: '5 catégories',        getValue: (s) => s.catCount,      threshold: 5 },
]

export function computeStats(works, watched, ratings) {
  let totalEps = 0, filmsSeen = 0, seriesVues = 0, animesVus = 0, mangasLus = 0, livresLus = 0, jeuxFinis = 0, ratedN = 0
  const cats = new Set()
  Object.values(works).forEach((w) => {
    cats.add(w.category)
    const r = ratings[`w:${w.id}`]
    if (r > 0) ratedN++
    if (w.category === 'films' && w.status === 'termine') filmsSeen++
    if (w.category === 'series' && w.status === 'termine') seriesVues++
    if (w.category === 'animes' && w.status === 'termine') animesVus++
    if (w.category === 'mangas' && w.status === 'termine') mangasLus++
    if (w.category === 'livres' && w.status === 'termine') livresLus++
    if (w.category === 'jeux' && w.status === 'termine') jeuxFinis++
    if (w.seasons) {
      w.seasons.forEach((s) => s.episodes.forEach((e) => {
        if (watched[`${w.id}-${s.n}-${e.n}`]) totalEps++
      }))
    }
  })
  return { totalWorks: Object.keys(works).length, totalEps, filmsSeen, seriesVues, animesVus, mangasLus, livresLus, jeuxFinis, ratedN, catCount: cats.size }
}

export function getUnlocked(works, watched, ratings) {
  const stats = computeStats(works, watched, ratings)
  return ACHIEVEMENTS.map((a) => ({ ...a, value: a.getValue(stats), unlocked: a.getValue(stats) >= a.threshold }))
}
