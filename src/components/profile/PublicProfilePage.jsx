import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { doc, getDoc, getDocs, collection } from 'firebase/firestore'
import { db } from '../../firebase'
import ProfileView from './ProfileView'

const EMPTY = { works: {}, watched: {}, ratings: {}, favorites: {}, feed: [], settings: {}, profile: {} }

export default function PublicProfilePage() {
  const { t } = useTranslation()
  const { handle } = useParams()
  const [profileData, setProfileData] = useState(null)
  const [status, setStatus] = useState('loading')

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

        const [worksSnap, watchedSnap] = await Promise.all([
          getDocs(collection(db, 'users', uid, 'works')),
          getDocs(collection(db, 'users', uid, 'watched'))
        ])
        const works = {}
        worksSnap.forEach(d => { works[d.id] = d.data() })
        const watched = {}
        watchedSnap.forEach(d => {
          Object.entries(d.data().eps || {}).forEach(([k, ts]) => {
            watched[`${d.id}-${k}`] = ts
          })
        })

        setProfileData({ ...base, works, watched })
        setStatus('found')
        const pseudo = base.profile?.handle || base.profile?.name || handle
        const title = `${pseudo} on Jilu`
        const desc = `See what ${pseudo} is watching, reading, and playing on Jilu.`
        document.title = title
        document.querySelector('meta[name="description"]')?.setAttribute('content', desc)
        document.querySelector('meta[property="og:title"]')?.setAttribute('content', title)
        document.querySelector('meta[property="og:description"]')?.setAttribute('content', desc)
        document.querySelector('link[rel="canonical"]')?.setAttribute('href', `https://jilu-app.vercel.app/u/${handle}`)
      } catch { setStatus('notfound') }
    }
    load()
    return () => {
      document.title = 'Jilu — Your whole culture, tracked in one place'
      document.querySelector('meta[name="description"]')?.setAttribute('content', 'Series, films, anime, manga, books, video games — episode-by-episode tracking, stats, release calendar, and public profiles. Free TV Time alternative.')
      document.querySelector('link[rel="canonical"]')?.setAttribute('href', 'https://jilu-app.vercel.app/')
    }
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

  return wrap(
    <ProfileView
      data={profileData}
      onOpenWork={() => {}}
      onToggleLike={() => {}}
      onDelete={() => {}}
      readOnly
    />
  )
}
