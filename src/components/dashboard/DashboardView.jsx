import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import PosterBox from '../ui/PosterBox'
import { relText } from '../../lib/domain'
import { nextUpList } from '../../lib/nextUp'
import QuizWidget from './QuizWidget'
import RecoRow from './RecoRow'
import { useFriendsFeed } from '../../hooks/useFriendsFeed'
import { pressable } from '../../lib/a11y'
import Button from '../ui/Button'
import Chip from '../ui/Chip'
import Card from '../ui/Card'

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
            : null
          return (
            <div
              key={item.id || item._type + item.ts + idx}
              {...pressable(() => w && onOpenWork(workId))}
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
                {item._type === 'review' && item.rating > 0 && (
                  <div style={{ fontSize: 15, color: 'var(--color-gold)', marginBottom: 2, letterSpacing: 1 }}>
                    {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
                  </div>
                )}
                {(item.text || item.note) && (
                  <div style={{ fontSize: 14, lineHeight: 1.5 }}>{item.text || item.note}</div>
                )}
                <div style={{ fontSize: 12, color: 'var(--color-muted-3)', marginTop: 6 }}>{relText(item.ts, Date.now(), i18n.language)}</div>
              </div>
            </div>
          )
        })}
      </div>
      {hasMore && (
        <Button variant="secondary" block style={{ marginBottom: 32 }} onClick={() => setShown((n) => n + PAGE_SIZE)}>
          {t('dashboard.showMore')}
        </Button>
      )}
    </>
  )
}

function NextUp({ works, watched, onOpenWork, onWatchNext }) {
  const { t } = useTranslation()
  const items = nextUpList(works, watched, Date.now(), 3)
  if (!items.length) return null
  return (
    <section aria-labelledby="next-up-title" style={{ marginBottom: 32 }}>
      <h2 id="next-up-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, margin: '0 0 14px' }}>{t('dashboard.nextUp')}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(({ w, s, e, remaining }) => (
          <Card key={w.id} dense style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 12 }}>
            <div {...pressable(() => onOpenWork(w.id), { label: w.title })} style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0, cursor: 'pointer' }}>
              <PosterBox id={w.id} title={w.title} poster={w.poster} width={46} height={66} radius={10} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.title}</div>
                <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 2 }}>
                  S{s.n} · {t('term.' + w.category + '.ep')} {e.n}
                  {remaining > 1 && <span style={{ color: 'var(--color-muted-2)' }}> · {t('dashboard.nextUpMore', { count: remaining - 1 })}</span>}
                </div>
              </div>
            </div>
            <Button size="sm" onClick={() => onWatchNext?.(w.id, s.n, e.n)} variant="primary" style={{ flexShrink: 0 }}>{t('calendar.markWatched')}</Button>
          </Card>
        ))}
      </div>
    </section>
  )
}

export default function DashboardView({ works, watched, reviews, feed, onOpenWork, onWatchNext, user, handle, onAddWork, following }) {
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
  return (
    <div>
      <NextUp works={works} watched={watched} onOpenWork={onOpenWork} onWatchNext={onWatchNext} />
      <QuizWidget user={user} handle={handle} following={following} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, margin: 0 }}>{t('dashboard.activity')}</h2>
        {hasFriends && (
          <div style={{ display: 'flex', gap: 4, background: 'var(--color-chip-bg)', borderRadius: 22, padding: 4 }}>
            <Chip flat active={tab === 'me'} onClick={() => setTab('me')}>{t('social.me')}</Chip>
            <Chip flat active={tab === 'friends'} onClick={() => setTab('friends')}>{t('social.friends')}</Chip>
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
