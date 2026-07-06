import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc, getDocs, collection } from 'firebase/firestore'
import { db } from '../../firebase'
import ProfileView from './ProfileView'

const EMPTY = { works: {}, watched: {}, ratings: {}, favorites: {}, feed: [], settings: {}, profile: {} }

export default function PublicProfilePage() {
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
      } catch { setStatus('notfound') }
    }
    load()
  }, [handle])

  const wrap = (children) => (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '24px 20px' }}>
      <div style={{ maxWidth: 740, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <Link to="/" style={{ color: 'var(--color-accent)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>← Ouvrir Jilu</Link>
        </div>
        {children}
      </div>
    </div>
  )

  if (status === 'loading') return wrap(<div style={{ color: 'var(--color-muted-3)', padding: 40, textAlign: 'center' }}>Chargement…</div>)
  if (status === 'notfound') return wrap(<div style={{ color: 'var(--color-muted-3)', padding: 40, textAlign: 'center' }}>Profil introuvable.</div>)
  if (status === 'private') return wrap(<div style={{ color: 'var(--color-muted-3)', padding: 40, textAlign: 'center' }}>🔒 Ce profil est privé.</div>)

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
