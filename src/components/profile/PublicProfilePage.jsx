import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { doc, getDoc, getDocs, collection } from 'firebase/firestore'
import { createCache } from '../../data/cache.js'
import { loadCatalog } from '../../data/catalog.js'
import { assembleData } from '../../data/assemble.js'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import { useFollows } from '../../hooks/useFollows'
import ProfileView from './ProfileView'
import FollowButton from '../social/FollowButton'

const EMPTY = { works: {}, watched: {}, ratings: {}, favorites: {}, feed: [], settings: {}, profile: {} }

export default function PublicProfilePage() {
  const { t } = useTranslation()
  const { handle } = useParams()
  const { user } = useAuth()
  const { following, isFollowing, follow, unfollow } = useFollows(user)
  const [profileData, setProfileData] = useState(null)
  const [targetUid, setTargetUid] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const noindex = document.createElement('meta')
    noindex.name = 'robots'
    noindex.content = 'noindex, nofollow'
    document.head.appendChild(noindex)
    return () => document.head.removeChild(noindex)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const pseudoSnap = await getDoc(doc(db, 'pseudos', handle.toLowerCase()))
        if (!pseudoSnap.exists()) { setStatus('notfound'); return }
        const { uid } = pseudoSnap.data()
        const userSnap = await getDoc(doc(db, 'users', uid))
        if (!userSnap.exists()) { setStatus('notfound'); return }
        const base = { ...EMPTY, ...userSnap.data() }
        if (!base.settings?.publicProfile) { setStatus('private'); return }

        // Bibliothèque publique de l'utilisateur + fiches du catalogue partagé (épisodes pour les statistiques)
        const libSnap = await getDocs(collection(db, 'users', uid, 'library'))
        const library = {}
        libSnap.forEach(d => { if (!d.data().deleted) library[d.id] = { ...d.data(), id: d.id } })
        const catalogIds = Object.values(library).map(l => l.catalogId).filter(Boolean)
        const cache = await createCache('jilu-public')
        const { catalog } = await loadCatalog(db, catalogIds, cache, { maxAgeMs: 30 * 24 * 60 * 60 * 1000 })
        const assembled = assembleData({ library, catalog })

        setTargetUid(uid)
        setProfileData({ ...base, ...assembled })
        setStatus('found')
      } catch { setStatus('notfound') }
    }
    load()
  }, [handle])

  const wrap = (children) => (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '24px 20px' }}>
      <div style={{ maxWidth: 740, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <Link to="/" style={{ color: 'var(--color-accent)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>{t('profile.openApp')}</Link>
        </div>
        {children}
      </div>
    </div>
  )

  if (status === 'loading') return wrap(<div style={{ color: 'var(--color-muted-3)', padding: 40, textAlign: 'center' }}>{t('profile.loading')}</div>)
  if (status === 'notfound') return wrap(<div style={{ color: 'var(--color-muted-3)', padding: 40, textAlign: 'center' }}>{t('profile.notFound')}</div>)
  if (status === 'private') return wrap(<div style={{ color: 'var(--color-muted-3)', padding: 40, textAlign: 'center' }}>{t('profile.privateMsg')}</div>)

  const isOwnProfile = user && targetUid && user.uid === targetUid
  return wrap(
    <>
      {user && targetUid && !isOwnProfile && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <FollowButton
            targetUid={targetUid}
            targetHandle={profileData?.profile?.handle}
            isFollowing={isFollowing(targetUid)}
            onFollow={follow}
            onUnfollow={unfollow}
          />
        </div>
      )}
      <ProfileView
        data={profileData}
        onOpenWork={() => {}}
        onToggleLike={() => {}}
        onDelete={() => {}}
        readOnly
      />
    </>
  )
}
