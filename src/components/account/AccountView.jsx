import { useState } from 'react'
import { initials } from '../../lib/domain'

function Toggle({ on, onToggle }) {
  return (
    <div onClick={onToggle} style={{ width: 44, height: 26, borderRadius: 26, flexShrink: 0, cursor: 'pointer', position: 'relative', background: on ? 'var(--color-accent)' : 'rgba(255,255,255,.14)', transition: 'background .18s' }}>
      <div style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .18s' }} />
    </div>
  )
}

const PREF_ROWS = [
  ['notifNewEp', 'Nouveaux épisodes', "Être notifié quand un épisode d'une série suivie sort"],
  ['notifCalendar', 'Rappels de sortie', 'Alerte la veille des sorties du calendrier'],
  ['notifWeekly', 'Résumé hebdomadaire', 'Un récap de ta semaine chaque dimanche']
]
const PLAYBACK_ROWS = [
  ['autoNext', "Marquer l'épisode suivant", "Coche automatiquement en cascade jusqu'à l'épisode choisi"],
  ['spoilerFree', 'Mode sans spoiler', 'Masque les titres et vignettes des épisodes non vus'],
  ['adult', 'Contenu mature', 'Afficher les œuvres classées 18+']
]
const PRIVACY_ROWS = [
  ['publicProfile', 'Profil public', 'Rendre ta bibliothèque et tes notes visibles']
]

function Section({ rows, settings, onToggleSetting }) {
  return (
    <div style={{ borderRadius: 18, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', overflow: 'hidden', marginBottom: 24 }}>
      {rows.map(([key, label, desc]) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,.05)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>{label}</div>
            <div style={{ fontSize: 12.5, color: 'var(--color-muted)', marginTop: 2 }}>{desc}</div>
          </div>
          <Toggle on={!!settings[key]} onToggle={() => onToggleSetting(key)} />
        </div>
      ))}
    </div>
  )
}

export default function AccountView({ profile, settings, onToggleSetting, onEditField, onMarkAll, onReset, onLogout, onSync, onClearAll, onImportTVTime, onImportTVTimeOut }) {
  const [syncLabel, setSyncLabel] = useState('Synchroniser')
  const [importLabel, setImportLabel] = useState('Importer TVTime (RGPD)')
  const [importOutLabel, setImportOutLabel] = useState('Importer TVTime Out')

  async function handleSync() {
    setSyncLabel('Synchronisation…')
    try { await onSync(); setSyncLabel('✓ Synchronisé') } catch { setSyncLabel('Erreur') }
    setTimeout(() => setSyncLabel('Synchroniser'), 3000)
  }

  async function handleImport() {
    await onImportTVTime(msg => setImportLabel(msg))
    setTimeout(() => setImportLabel('Importer TVTime (RGPD)'), 6000)
  }

  async function handleImportOut() {
    await onImportTVTimeOut(msg => setImportOutLabel(msg))
    setTimeout(() => setImportOutLabel('Importer TVTime Out'), 6000)
  }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', padding: 24, borderRadius: 20, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', marginBottom: 26 }}>
        <div style={{ width: 76, height: 76, flexShrink: 0, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-accent), var(--color-pink))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: '#fff' }}>
          {initials(profile.name)}
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, margin: 0 }}>{profile.name}</h2>
            <span onClick={() => onEditField('name', 'le nom')} style={{ fontSize: 12.5, color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 600 }}>Modifier</span>
          </div>
          <div style={{ color: 'var(--color-muted)', fontSize: 14, marginTop: 3 }}>{profile.handle} · {profile.email}</div>
          <div style={{ color: 'var(--color-muted-3)', fontSize: 12.5, marginTop: 8 }}>Membre depuis {profile.memberSince}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div onClick={() => onEditField('handle', 'le pseudo')} style={{ padding: '9px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,.1)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Pseudo</div>
          <div onClick={() => onEditField('email', "l'email")} style={{ padding: '9px 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,.1)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>E-mail</div>
        </div>
      </div>

      <div style={{ padding: '8px 4px 4px', fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Notifications</div>
      <Section rows={PREF_ROWS} settings={settings} onToggleSetting={onToggleSetting} />

      <div style={{ padding: '8px 4px 4px', fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Lecture & suivi</div>
      <Section rows={PLAYBACK_ROWS} settings={settings} onToggleSetting={onToggleSetting} />

      <div style={{ padding: '8px 4px 4px', fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Confidentialité</div>
      <Section rows={PRIVACY_ROWS} settings={settings} onToggleSetting={onToggleSetting} />

      <div style={{ padding: '8px 4px 4px', fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Import</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <div onClick={handleImport} style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,.1)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{importLabel}</div>
        <div onClick={handleImportOut} style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,.1)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{importOutLabel}</div>
      </div>

      <div style={{ padding: '8px 4px 4px', fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Données</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
        <div onClick={handleSync} style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,.1)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{syncLabel}</div>
        <div onClick={onMarkAll} style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,.1)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Tout marquer comme vu</div>
        <div onClick={onReset} style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid rgba(255,92,138,.35)', background: 'rgba(255,92,138,.1)', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#ff8fab' }}>Réinitialiser la progression</div>
        <div onClick={onClearAll} style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid rgba(255,92,138,.5)', background: 'rgba(255,92,138,.12)', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#ff8fab' }}>Tout effacer</div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,.07)', paddingTop: 24 }}>
        <div onClick={onLogout} style={{ display: 'inline-block', padding: '11px 20px', borderRadius: 12, border: '1px solid rgba(255,92,138,.35)', background: 'rgba(255,92,138,.08)', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#ff8fab' }}>Se déconnecter</div>
      </div>
    </div>
  )
}
