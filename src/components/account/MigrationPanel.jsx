import { useState } from 'react'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import { migrateAccount, migrateAllAccounts } from '../../lib/migration'

// TEMPORAIRE (migration v2) : réservé au compte du propriétaire pour l'essai grandeur nature.
// À retirer, avec src/lib/migration.js, quand tous les comptes sont migrés.
export const MIGRATION_OWNER_UID = 'pNGd2tM8Gmg3BSlebv4ZYN8m2yj2'

function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function MigrationPanel() {
  const { user } = useAuth()
  const [status, setStatus] = useState('idle') // idle | running | done | error
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState(null)
  const [allResult, setAllResult] = useState(null)

  if (!user || user.uid !== MIGRATION_OWNER_UID) return null

  async function runAll() {
    if (!window.confirm('Migrer TOUS les comptes ? Une sauvegarde JSON complète est téléchargée d’abord. Rien n’est supprimé dans l’ancien modèle.')) return
    setStatus('running')
    setResult(null)
    setAllResult(null)
    try {
      const res = await migrateAllAccounts(db, {
        onProgress: setProgress,
        onBackup: (data) => downloadJSON(`jilu-sauvegarde-complete-${new Date().toISOString().slice(0, 10)}.json`, data),
      })
      setAllResult(res)
      setStatus('done')
    } catch (e) {
      console.error('[migration]', e)
      setProgress(e?.message || String(e))
      setStatus('error')
    }
  }

  async function run() {
    setStatus('running')
    setResult(null)
    setAllResult(null)
    try {
      const res = await migrateAccount(db, user.uid, {
        onProgress: setProgress,
        // Sauvegarde automatique avant toute écriture
        onBackup: (data) => downloadJSON(`jilu-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`, data),
      })
      setResult(res)
      setStatus('done')
    } catch (e) {
      console.error('[migration]', e)
      setProgress(e?.message || String(e))
      setStatus('error')
    }
  }

  const v = result?.verification
  return (
    <div style={{ borderRadius: 18, border: '1px dashed var(--color-border-btn)', padding: '16px 20px', margin: '24px 0' }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Migration vers le nouveau modèle (temporaire)</div>
      <div style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5, marginBottom: 12 }}>
        Copie ta bibliothèque vers le nouveau modèle. Une sauvegarde JSON est téléchargée d’abord, rien n’est supprimé ni modifié dans l’ancien modèle, et tu peux relancer sans risque.
      </div>
      <button
        onClick={run}
        disabled={status === 'running'}
        style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: 'var(--color-accent)', color: '#fff', fontWeight: 600, cursor: status === 'running' ? 'wait' : 'pointer', opacity: status === 'running' ? 0.6 : 1 }}
      >
        {status === 'running' ? 'Migration en cours…' : 'Migrer mon compte'}
      </button>
      <button
        onClick={runAll}
        disabled={status === 'running'}
        style={{ marginLeft: 10, padding: '10px 20px', borderRadius: 12, border: '1px solid var(--color-border-btn)', background: 'transparent', color: 'var(--color-text)', fontWeight: 600, cursor: status === 'running' ? 'wait' : 'pointer', opacity: status === 'running' ? 0.6 : 1 }}
      >
        Migrer tous les comptes
      </button>
      {status === 'running' && <div style={{ fontSize: 13, marginTop: 10 }}>{progress}</div>}
      {status === 'error' && <div style={{ fontSize: 13, marginTop: 10, color: 'var(--color-danger-text)' }}>Erreur : {progress}</div>}
      {status === 'done' && allResult && (() => {
        const entries = Object.entries(allResult.results)
        const failed = entries.filter(([, r]) => !r.verification.ok)
        return (
          <div style={{ fontSize: 13, marginTop: 10, lineHeight: 1.6 }}>
            <div style={{ fontWeight: 600, color: failed.length ? 'var(--color-danger-text)' : 'var(--color-green, #22c55e)' }}>
              {failed.length ? `⚠ ${failed.length} compte(s) avec un contrôle en échec` : `✓ ${entries.length} compte(s) migrés, contrôle OK`}
            </div>
            <div>{allResult.catalogWritten} fiches de catalogue créées</div>
            {entries.map(([uid, r]) => (
              <div key={uid}>{uid.slice(0, 8)}… : {r.report.works} œuvres, {r.report.episodesWatched} épisodes vus {r.verification.ok ? '✓' : `⚠ manquants: ${r.verification.missing.length}, différents: ${r.verification.mismatched.length}`}</div>
            ))}
          </div>
        )
      })()}
      {status === 'done' && result && (
        <div style={{ fontSize: 13, marginTop: 10, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600, color: v.ok ? 'var(--color-green, #22c55e)' : 'var(--color-danger-text)' }}>
            {v.ok ? '✓ Contrôle OK : rien ne manque' : `⚠ Contrôle : ${v.missing.length} manquant(s), ${v.mismatched.length} différent(s)`}
          </div>
          <div>{result.report.works} œuvres · {result.report.episodesWatched} épisodes vus · {result.report.catalog} fiches de catalogue ({result.report.localWorks} locales)</div>
          <div>Écrit maintenant : {result.written.libraryWritten} fiches de bibliothèque, {result.written.catalogWritten} fiches de catalogue</div>
          {result.report.orphanProgress > 0 && <div>Progression sans œuvre conservée : {result.report.orphanProgress}</div>}
          {result.report.unassignedRatings.length > 0 && <div>Notes non rattachées : {result.report.unassignedRatings.join(', ')}</div>}
          {!v.ok && <div>Manquants : {v.missing.slice(0, 10).join(', ')} · Différents : {v.mismatched.slice(0, 10).join(', ')}</div>}
        </div>
      )}
    </div>
  )
}
