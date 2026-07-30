import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import PosterBox from '../ui/PosterBox'
import { relText } from '../../lib/domain'
import QuizWidget from './QuizWidget'
import RecoRow from './RecoRow'
import { useFriendsFeed } from '../../hooks/useFriendsFeed'

const PAGE_SIZE = 5

function ActivityList({ items, works, onOpenWork, emptyKey }) {
  const { t, i18n } = useTranslation()
  const [shown, setShown] = useState(PAGE_SIZE)
  const visible = items.slice(0, shown)
  const hasMore = shown < items.length

  if (items.length === 0) return (
    <div style={{ color: 'var(--color-muted-3)', fontSize: 14, padding: '16px 0', marginBottom: 28 }}>{t(emptyKey)}</div>
  )

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: hasMore ? 12 : 32 }}>
        {visible.map((item, idx) => {
          const workId = item._type === 'review' ? item.id : item.workId
          const w = works[workId]
          const subtitle = item._type === 'comment' && item.sNum
            ? `S${item.sNum} · Ep. ${item.eNum}`
            : item._type === 'review' ? t('dashboard.globalReview') : null
          return (
            <div
              key={item.id || item._type + item.ts + idx}
              onClick={() => w && onOpenWork(workId)}
              style={{ display: 'flex', gap: 14, padding: 14, borderRadius: 16, background: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: w ? 'pointer' : 'default' }}
            >
              <PosterBox id={workId} title={w?.title || ''} poster={w?.poster} width={46} height={66} radius={10} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  {item._handle && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)' }}>@{item._handle}</span>
                  )}
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{w?.title || workId}</span>
                  {subtitle && <span style={{ fontSize: 12, color: 'var(--color-muted-2)', fontWeight: 600 }}>{subtitle}</span>}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.5 }}>{item.text || item.note}</div>
                <div style={{ fontSize: 12, color: 'var(--color-muted-3)', marginTop: 6 }}>{relText(item.ts, Date.now(), i18n.language)}</div>
              </div>
            </div>
          )
        })}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE_SIZE)}
          style={{ width: '100%', padding: '11px 0', borderRadius: 12, border: '1px solid var(--color-border-btn)', background: 'transparent', color: 'var(--color-muted)', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 32 }}
        >
          {t('dashboard.showMore')}
        </button>
      )}
    </>
  )
}

export default function DashboardView({ works, watched, reviews, feed, onOpenWork, user, handle, onAddWork, following }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState('me')
  const { friendsFeed, loading: friendsLoading } = useFriendsFeed(following)

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
  const myActivity = [
    ...feedItems.map((f) => ({ ...f, _type: 'comment' })),
    ...reviewItems.map((r) => ({ ...r, _type: 'review' })),
  ].sort((a, b) => b.ts - a.ts)

  const hasFriends = Object.keys(following || {}).length > 0
  const tabStyle = (active) => ({
    padding: '7px 16px', borderRadius: 20, border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer',
    background: active ? 'var(--color-accent)' : 'transparent',
    color: active ? '#fff' : 'var(--color-muted)',
  })

  return (
    <div>
      <QuizWidget user={user} handle={handle} following={following} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, margin: 0 }}>{t('dashboard.activity')}</h3>
        {hasFriends && (
          <div style={{ display: 'flex', gap: 4, background: 'var(--color-chip-bg)', borderRadius: 22, padding: 4 }}>
            <button type="button" style={tabStyle(tab === 'me')} onClick={() => setTab('me')}>{t('social.me')}</button>
            <button type="button" style={tabStyle(tab === 'friends')} onClick={() => setTab('friends')}>{t('social.friends')}</button>
          </div>
        )}
      </div>

      {tab === 'me'
        ? <ActivityList items={myActivity} works={works} onOpenWork={onOpenWork} emptyKey="dashboard.noActivity" />
        : friendsLoading
          ? <div style={{ color: 'var(--color-muted-3)', fontSize: 14, padding: '16px 0' }}>…</div>
          : <ActivityList items={friendsFeed} works={works} onOpenWork={onOpenWork} emptyKey="social.noFriendsActivity" />
      }

      {onAddWork && <RecoRow works={works} onAddWork={onAddWork} />}
    </div>
  )
}
