import { useTranslation } from 'react-i18next'
import PosterBox from '../ui/PosterBox'
import { relText } from '../../lib/domain'
import QuizWidget from './QuizWidget'
import RecoRow from './RecoRow'

export default function DashboardView({ works, watched, reviews, feed, onOpenWork, onWatchNext, user, handle, onAddWork }) {
  const { t, i18n } = useTranslation()

  const activeStatuses = new Set(['en_cours', 'termine'])
  const feedItems = (feed || []).filter((f) => {
    const w = works[f.workId]
    if (!w || !activeStatuses.has(w.status)) return false
    if (f.sNum) return !!watched[`${f.workId}-${f.sNum}-${f.eNum}`]
    return true
  })
  const reviewItems = (reviews || []).filter((r) => {
    const w = works[r.id]
    return w && activeStatuses.has(w.status)
  })
  const allActivity = [
    ...feedItems.map((f) => ({ ...f, _type: 'comment' })),
    ...reviewItems.map((r) => ({ ...r, _type: 'review' })),
  ].sort((a, b) => b.ts - a.ts)

  return (
    <div>
      {/* Activity feed */}
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, marginBottom: 14 }}>{t('dashboard.activity')}</h3>
      {allActivity.length === 0
        ? <div style={{ color: 'var(--color-muted-3)', fontSize: 14, padding: '16px 0', marginBottom: 28 }}>{t('dashboard.noActivity')}</div>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            {allActivity.map((item) => {
              const w = works[item._type === 'review' ? item.id : item.workId]
              const subtitle = item._type === 'comment' && item.sNum
                ? `S${item.sNum} · Ep. ${item.eNum}`
                : item._type === 'review' ? t('dashboard.globalReview') : null
              return (
                <div key={item.id || item._type + item.ts} onClick={() => w && onOpenWork(w.id)} style={{ display: 'flex', gap: 14, padding: 14, borderRadius: 16, background: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
                  <PosterBox id={w?.id || item.workId || item.id} title={w?.title || ''} poster={w?.poster} width={46} height={66} radius={10} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{w?.title || item.id}</span>
                      {subtitle && <span style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 600 }}>{subtitle}</span>}
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.5 }}>{item.text || item.note}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-muted-3)', marginTop: 6 }}>{relText(item.ts, Date.now(), i18n.language)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      }

      {/* Quiz du jour */}
      <QuizWidget user={user} handle={handle} />

      {/* Recommandations */}
      {onAddWork && <RecoRow works={works} onAddWork={onAddWork} />}
    </div>
  )
}
