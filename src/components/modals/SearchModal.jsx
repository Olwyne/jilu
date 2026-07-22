import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { searchCatalog } from '../../catalog/search'
import PosterBox from '../ui/PosterBox'

export default function SearchModal({ works, onAdd, onClose, onNavigate }) {
  const { t } = useTranslation()
  const CATS = [
    { k: 'series', label: t('cat.series') },
    { k: 'animes', label: t('cat.animes') },
    { k: 'films', label: t('cat.films') },
    { k: 'livres', label: t('cat.livres') },
    { k: 'jeux', label: t('cat.jeux') },
    { k: 'musique', label: t('cat.musique') },
    { k: 'all', label: t('cat.all') },
  ]
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('series')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return }
    let cancelled = false
    const t = setTimeout(async () => {
      setLoading(true)
      const r = await searchCatalog(query.trim(), cat === 'all' ? null : cat)
      if (!cancelled) { setResults(r); setLoading(false) }
    }, 400)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query, cat])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(4px)', zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '12vh 20px 20px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, background: 'color-mix(in srgb, var(--color-bg) 96%, var(--color-text))', border: '1px solid var(--color-border-btn)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 30px 80px var(--color-shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px', borderBottom: '1px solid var(--color-border)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--color-text)', fontSize: 16, fontFamily: 'inherit' }}
          />
          <div onClick={onClose} style={{ color: 'var(--color-muted-2)', cursor: 'pointer', fontSize: 14, padding: '4px 8px' }}>{t('search.escape')}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, padding: '12px 14px 0', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {CATS.map((c) => {
            const disabled = c.k === 'musique'
            return (
              <div
                key={c.k}
                onClick={() => { if (!disabled) { setCat(c.k); setResults([]) } }}
                style={{ position: 'relative', padding: '6px 13px', borderRadius: 20, fontSize: 13, fontWeight: cat === c.k ? 600 : 500, cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', color: disabled ? 'var(--color-muted-3)' : cat === c.k ? '#fff' : 'var(--color-muted)', background: disabled ? 'var(--color-surface-row)' : cat === c.k ? 'var(--color-accent)' : 'var(--color-surface-row)', border: `1px solid ${!disabled && cat === c.k ? 'transparent' : 'var(--color-border)'}`, opacity: disabled ? 0.5 : 1, flexShrink: 0 }}
              >
                {c.label}
                {disabled && (
                  <span style={{ position: 'absolute', top: -5, right: -5, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 10, padding: '1px 5px', lineHeight: 1.4, whiteSpace: 'nowrap' }}>
                    {t('search.comingSoon')}
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ maxHeight: '48vh', overflowY: 'auto', padding: 8 }}>
          {loading && <div style={{ padding: '16px 32px', textAlign: 'center', color: 'var(--color-muted-3)', fontSize: 13 }}>{t('search.searching')}</div>}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-muted-3)', fontSize: 14 }}>{t('search.noResults', { query })}</div>
          )}
          {results.map((r) => {
            const added = !!works[r.id]
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 12px', borderRadius: 12 }}>
                <div
                  onClick={() => added && onNavigate?.(r)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0, cursor: added ? 'pointer' : 'default' }}
                >
                  <PosterBox id={r.id} title={r.title} poster={r.poster} width={44} height={62} radius={9} fontSize={16} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14.5 }}>{r.title}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--color-muted-2)' }}>{t('cat.' + r.category)}{r.year ? ` · ${r.year}` : ''}</div>
                  </div>
                </div>
                <div
                  onClick={() => !added && onAdd(r)}
                  style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: added ? 'default' : 'pointer', color: added ? 'var(--color-green)' : '#fff', background: added ? 'rgba(74,222,128,.14)' : 'var(--color-accent)' }}
                >
                  {added ? t('search.added') : t('search.add')}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
