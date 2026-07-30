import { useTranslation } from 'react-i18next'
import { getUnlocked } from '../../lib/achievements'

export default function AchievementsGrid({ works, watched, ratings, compact = false }) {
  const { t } = useTranslation()
  const all = getUnlocked(works, watched, ratings)
  const unlocked = all.filter((a) => a.unlocked)
  const locked = all.filter((a) => !a.unlocked)

  if (compact) {
    return (
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-muted-2)', marginBottom: 10 }}>
          {t('achievements.title')} · {unlocked.length}/{all.length}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {all.map((a) => (
            <div
              key={a.id}
              title={`${a.label} — ${a.desc}`}
              aria-label={`${a.unlocked ? t('achievements.unlocked') : t('achievements.locked')} : ${a.label}, ${a.desc}`}
              style={{ fontSize: 22, opacity: a.unlocked ? 1 : 0.2, filter: a.unlocked ? 'none' : 'grayscale(1)', cursor: 'default' }}
            >
              {a.emoji}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {unlocked.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-muted-2)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 14 }}>
            {t('achievements.unlocked')} · {unlocked.length}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 24 }}>
            {unlocked.map((a) => (
              <div key={a.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 10px', borderRadius: 14, background: 'var(--color-chip-bg)', border: '1px solid var(--color-border-btn)' }}>
                <span style={{ fontSize: 32 }} role="img" aria-label={a.label}>{a.emoji}</span>
                <span style={{ fontWeight: 700, fontSize: 13, textAlign: 'center' }}>{a.label}</span>
                <span style={{ fontSize: 11.5, color: 'var(--color-muted-3)', textAlign: 'center' }}>{a.desc}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {locked.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-muted-2)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 14 }}>
            {t('achievements.locked')} · {locked.length}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {locked.map((a) => (
              <div key={a.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 10px', borderRadius: 14, background: 'var(--color-chip-bg)', border: '1px dashed var(--color-border)', opacity: 0.5 }}>
                <span style={{ fontSize: 32, filter: 'grayscale(1)' }} role="img" aria-label={a.label}>{a.emoji}</span>
                <span style={{ fontWeight: 600, fontSize: 13, textAlign: 'center' }}>{a.label}</span>
                <span style={{ fontSize: 11.5, color: 'var(--color-muted-3)', textAlign: 'center' }}>{a.desc}</span>
                <span style={{ fontSize: 11, color: 'var(--color-muted-3)' }}>{a.value}/{a.threshold}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
