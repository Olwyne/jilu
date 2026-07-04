import { useEffect, useState } from 'react'
import { searchCatalog } from '../../catalog/search'
import { CAT } from '../../lib/domain'

export default function SearchModal({ works, onAdd, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      const r = await searchCatalog(query.trim())
      setResults(r)
    }, 400)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '12vh 20px 20px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, background: '#15151d', border: '1px solid rgba(255,255,255,.1)', borderRadius: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ajouter une série, un film, un animé…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--color-text)', fontSize: 16 }}
          />
        </div>
        <div style={{ maxHeight: '52vh', overflowY: 'auto', padding: 8 }}>
          {query.trim().length >= 2 && results.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-muted-3)', fontSize: 14 }}>Aucun résultat pour « {query} »</div>
          )}
          {results.map((r) => {
            const added = !!works[r.id]
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 12px', borderRadius: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>{r.title}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--color-muted-2)' }}>{CAT[r.category]}{r.year ? ` · ${r.year}` : ''}</div>
                </div>
                <div
                  onClick={() => !added && onAdd(r)}
                  style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: added ? 'default' : 'pointer', color: added ? 'var(--color-green)' : 'var(--color-text)', background: added ? 'rgba(74,222,128,.14)' : 'var(--color-accent)' }}
                >
                  {added ? 'Ajouté ✓' : '+ Ajouter'}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
