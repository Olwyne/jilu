import { useState } from 'react'
import { initials } from '../../lib/domain'
import EditProfileModal from '../modals/EditProfileModal'

function Toggle({ on, onToggle }) {
  return (
    <div onClick={onToggle} style={{ width: 44, height: 26, borderRadius: 26, flexShrink: 0, cursor: 'pointer', position: 'relative', background: on ? 'var(--color-accent)' : 'rgba(128,128,160,.25)', transition: 'background .18s' }}>
      <div style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .18s' }} />
    </div>
  )
}

const PREF_ROWS = [
  ['notifNewEp', 'Nouveaux épisodes', "Être notifié quand un épisode d'une série suivie sort", true],
  ['notifCalendar', 'Rappels de sortie', 'Alerte la veille des sorties du calendrier', true],
  ['notifWeekly', 'Résumé hebdomadaire', 'Un récap de ta semaine chaque dimanche', true]
]
const PLAYBACK_ROWS = [
  ['autoNext', "Marquer l'épisode suivant", "Coche automatiquement en cascade jusqu'à l'épisode choisi", true],
  ['spoilerFree', 'Mode sans spoiler', 'Masque les titres et vignettes des épisodes non vus', true],
  ['adult', 'Contenu mature', 'Afficher les œuvres classées 18+', true]
]
const PRIVACY_ROWS = [
  ['publicProfile', 'Profil public', 'Rendre ta bibliothèque et tes notes visibles']
]

function Section({ rows, settings, onToggleSetting }) {
  return (
    <div style={{ borderRadius: 18, background: 'var(--color-surface)', border: '1px solid var(--color-border)', overflow: 'hidden', marginBottom: 24 }}>
      {rows.map(([key, label, desc, disabled]) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderTop: '1px solid var(--color-border-sm)', opacity: disabled ? 0.45 : 1 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14.5, display: 'flex', alignItems: 'center', gap: 8 }}>
              {label}
              {disabled && (
                <span style={{ background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 10, padding: '1px 6px', lineHeight: 1.5 }}>
                  À venir
                </span>
              )}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--color-muted)', marginTop: 2 }}>{desc}</div>
          </div>
          <div style={{ pointerEvents: disabled ? 'none' : 'auto' }}>
            <Toggle on={disabled ? false : !!settings[key]} onToggle={() => onToggleSetting(key)} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AccountView({ profile, settings, onToggleSetting, onSaveProfile, onMarkAll, onReset, onLogout, onSync, onClearAll, onImportTVTime, onImportTVTimeOut, onRefreshAll }) {
  const [syncLabel, setSyncLabel] = useState('Synchroniser')
  const [refreshLabel, setRefreshLabel] = useState('Rafraîchir les métadonnées')
  const [importLabel, setImportLabel] = useState('Importer TVTime (RGPD)')
  const [importOutLabel, setImportOutLabel] = useState('Importer TVTime Out')
  const [failedItems, setFailedItems] = useState([])
  const [failedOutItems, setFailedOutItems] = useState([])
  const [editOpen, setEditOpen] = useState(false)

  async function handleRefreshAll() {
    await onRefreshAll((msg) => setRefreshLabel(msg))
    setTimeout(() => setRefreshLabel('Rafraîchir les métadonnées'), 4000)
  }

  async function handleSync() {
    setSyncLabel('Synchronisation…')
    try { await onSync(); setSyncLabel('✓ Synchronisé') } catch { setSyncLabel('Erreur') }
    setTimeout(() => setSyncLabel('Synchroniser'), 3000)
  }

  async function handleImport() {
    setFailedItems([])
    await onImportTVTime(msg => setImportLabel(msg), list => setFailedItems(list))
    setTimeout(() => setImportLabel('Importer TVTime (RGPD)'), 6000)
  }

  async function handleImportOut() {
    setFailedOutItems([])
    await onImportTVTimeOut(msg => setImportOutLabel(msg), list => setFailedOutItems(list))
    setTimeout(() => setImportOutLabel('Importer TVTime Out'), 6000)
  }

  const isDark = settings.darkMode !== false

  return (
    <div>
      {editOpen && (
        <EditProfileModal
          profile={profile}
          onSave={onSaveProfile}
          onClose={() => setEditOpen(false)}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', padding: 24, borderRadius: 20, background: 'var(--color-surface)', border: '1px solid var(--color-border)', marginBottom: 26 }}>
        <div style={{ width: 76, height: 76, flexShrink: 0, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-accent), var(--color-pink))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: '#fff' }}>
          {initials(profile.handle || profile.name)}
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, margin: 0 }}>{profile.handle || '—'}</h2>
            <span onClick={() => setEditOpen(true)} style={{ fontSize: 12.5, color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 600 }}>Modifier</span>
          </div>
          <div style={{ color: 'var(--color-muted)', fontSize: 14, marginTop: 3 }}>{profile.email}</div>
          <div style={{ color: 'var(--color-muted-3)', fontSize: 12.5, marginTop: 8 }}>Membre depuis {profile.memberSince}</div>
        </div>
      </div>

      <div style={{ padding: '8px 4px 4px', fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Apparence</div>
      <div style={{ borderRadius: 18, background: 'var(--color-surface)', border: '1px solid var(--color-border)', overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderTop: '1px solid var(--color-border-sm)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>Mode sombre</div>
            <div style={{ fontSize: 12.5, color: 'var(--color-muted)', marginTop: 2 }}>Basculer entre le thème sombre et le thème clair</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>{isDark ? '🌙' : '☀️'}</span>
            <Toggle on={isDark} onToggle={() => onToggleSetting('darkMode')} />
          </div>
        </div>
      </div>

      <div style={{ padding: '8px 4px 4px', fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Notifications</div>
      <Section rows={PREF_ROWS} settings={settings} onToggleSetting={onToggleSetting} />

      <div style={{ padding: '8px 4px 4px', fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Lecture & suivi</div>
      <Section rows={PLAYBACK_ROWS} settings={settings} onToggleSetting={onToggleSetting} />

      <div style={{ padding: '8px 4px 4px', fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Confidentialité</div>
      <Section rows={PRIVACY_ROWS} settings={settings} onToggleSetting={onToggleSetting} />

      <div style={{ padding: '8px 4px 4px', fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Import</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: failedItems.length || failedOutItems.length ? 12 : 24 }}>
        <div onClick={handleImport} style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid var(--color-border-btn)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{importLabel}</div>
        <div onClick={handleImportOut} style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid var(--color-border-btn)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{importOutLabel}</div>
      </div>
      {(failedItems.length > 0 || failedOutItems.length > 0) && (
        <div style={{ marginBottom: 24 }}>
          {[{ label: 'TVTime RGPD', items: failedItems }, { label: 'TVTime Out', items: failedOutItems }]
            .filter(g => g.items.length > 0)
            .map(g => (
              <div key={g.label} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12.5, color: 'var(--color-muted)', marginBottom: 6 }}>
                  {g.items.length} non trouvé{g.items.length > 1 ? 's' : ''} ({g.label}) — copiez pour réessayer manuellement :
                </div>
                <textarea
                  readOnly
                  value={g.items.join('\n')}
                  onClick={e => e.target.select()}
                  style={{ width: '100%', minHeight: Math.min(g.items.length * 22, 180), resize: 'vertical', background: 'var(--color-surface-row)', border: '1px solid var(--color-border-btn)', borderRadius: 10, color: 'var(--color-muted)', fontSize: 13, padding: '10px 12px', fontFamily: 'monospace', boxSizing: 'border-box', cursor: 'text' }}
                />
              </div>
            ))}
        </div>
      )}

      <div style={{ padding: '8px 4px 4px', fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Données</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
        <div onClick={handleSync} style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid var(--color-border-btn)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{syncLabel}</div>
        <div onClick={handleRefreshAll} style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid var(--color-border-btn)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{refreshLabel}</div>
        <div onClick={onMarkAll} style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid var(--color-border-btn)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Tout marquer comme vu</div>
        <div onClick={onReset} style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid var(--color-danger-border)', background: 'var(--color-danger-bg)', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--color-danger-text)' }}>Réinitialiser la progression</div>
        <div onClick={onClearAll} style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid var(--color-danger-border-2)', background: 'var(--color-danger-bg-2)', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--color-danger-text)' }}>Tout effacer</div>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 24 }}>
        <div onClick={onLogout} style={{ display: 'inline-block', padding: '11px 20px', borderRadius: 12, border: '1px solid var(--color-danger-border)', background: 'var(--color-danger-bg)', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--color-danger-text)' }}>Se déconnecter</div>
      </div>
    </div>
  )
}
