import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function FollowButton({ targetUid, targetHandle, isFollowing, onFollow, onUnfollow }) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (loading) return
    setLoading(true)
    try {
      if (isFollowing) await onUnfollow(targetUid)
      else await onFollow(targetUid, targetHandle)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label={isFollowing ? t('social.unfollow') : t('social.follow')}
      style={{
        padding: '9px 20px', borderRadius: 12,
        border: isFollowing ? '1px solid var(--color-border-btn)' : 'none',
        background: isFollowing ? 'transparent' : 'var(--color-accent)',
        color: isFollowing ? 'var(--color-muted)' : '#fff',
        fontWeight: 700, fontSize: 14, cursor: loading ? 'wait' : 'pointer',
        opacity: loading ? 0.6 : 1, transition: 'all .15s',
      }}
    >
      {loading ? '…' : isFollowing ? t('social.following') : t('social.follow')}
    </button>
  )
}
