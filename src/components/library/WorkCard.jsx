import { useTranslation } from 'react-i18next'
import PosterBox from '../ui/PosterBox'
import { localizedTitle, localizedPoster } from '../../lib/domain'

export default function WorkCard({ work, watchedCount, totalCount, rating, isFavorite, onClick }) {
  const { t, i18n } = useTranslation()
  const pct = totalCount ? Math.round((watchedCount / totalCount) * 100) : 0
  const showProgress = work.seasons && watchedCount > 0 && watchedCount < totalCount
  return (
    <div onClick={onClick} style={{ cursor: 'pointer' }}>
      <PosterBox id={work.id} title={localizedTitle(work, i18n.language)} poster={localizedPoster(work, i18n.language)} width="100%" radius={14} aspectRatio="2/3" fontSize={38}>
        {isFavorite && (
          <div style={{ position: 'absolute', top: 7, right: 7, fontSize: 14, color: '#ffc24b', textShadow: '0 1px 4px rgba(0,0,0,.6)', zIndex: 1 }}>★</div>
        )}
        {showProgress && (
          <div style={{ position: 'absolute', left: 9, right: 9, bottom: 9, zIndex: 1 }}>
            <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,.25)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--color-accent), var(--color-pink))', borderRadius: 4 }} />
            </div>
          </div>
        )}
      </PosterBox>
      <div style={{ marginTop: 9, fontWeight: 600, fontSize: 14.5 }}>{localizedTitle(work, i18n.language)}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3 }}>
        <span style={{ fontSize: 12.5, color: 'var(--color-muted-2)' }}>{t('cat.' + work.category)} · {work.year}</span>
        {rating > 0 && <span style={{ fontSize: 12.5, color: 'var(--color-gold)', fontWeight: 600, marginLeft: 'auto' }}>★ {rating}</span>}
      </div>
    </div>
  )
}
