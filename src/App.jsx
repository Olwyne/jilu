import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useAppData } from './hooks/useAppData'
import { useWorkActions } from './hooks/useWorkActions'
import LoginPage from './components/auth/LoginPage'
import SignupPage from './components/auth/SignupPage'
import Sidebar from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileNav'
import Header from './components/layout/Header'
import LibraryView from './components/library/LibraryView'
import DetailView from './components/detail/DetailView'

const HEADER_COPY = {
  dashboard: { title: 'Bonsoir 👋', subtitle: "Voici ce qui t'attend" },
  library: { title: 'Ma bibliothèque', subtitle: '' },
  calendar: { title: 'Calendrier', subtitle: 'À rattraper et à venir' },
  stats: { title: 'Statistiques', subtitle: 'Ton année en chiffres' },
  account: { title: 'Compte & paramètres', subtitle: 'Profil, préférences et données' },
  feed: { title: 'Journal', subtitle: 'Tes commentaires et réactions' }
}

function Shell() {
  const { user } = useAuth()
  const { data, loading, mutate } = useAppData(user)
  const [view, setView] = useState('library')
  const [selectedId, setSelectedId] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 860)
  const [searchOpen, setSearchOpen] = useState(false)
  const [episodeModal, setEpisodeModal] = useState(null)
  const workActions = useWorkActions(data, mutate)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 860)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (loading) return null

  const copy = HEADER_COPY[view] || HEADER_COPY.library

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {!isMobile && <Sidebar view={view} setView={setView} onOpenSearch={() => setSearchOpen(true)} />}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', paddingBottom: isMobile ? 74 : 0 }}>
        <Header
          title={copy.title}
          subtitle={copy.subtitle}
          showBack={view === 'detail'}
          onBack={() => setView('library')}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenAccount={() => setView('account')}
          isMobile={isMobile}
        />
        <main style={{ padding: '22px 30px 40px', maxWidth: 1240, width: '100%' }}>
          {view === 'library' && (
            <LibraryView
              works={data.works}
              watched={data.watched}
              ratings={data.ratings}
              onOpenWork={(id) => { setSelectedId(id); setView('detail') }}
            />
          )}
          {view === 'detail' && data.works[selectedId] && (
            <DetailView
              work={data.works[selectedId]}
              watched={data.watched}
              ratings={data.ratings}
              games={data.games}
              feed={data.feed}
              actions={workActions}
              onOpenEpisode={(w, s, e) => setEpisodeModal({ workId: w.id, sNum: s.n, eNum: e.n })}
            />
          )}
        </main>
      </div>
      {isMobile && <MobileNav view={view} setView={setView} />}
    </div>
  )
}

function Gate() {
  const { user, loading } = useAuth()
  const [showSignup, setShowSignup] = useState(false)
  if (loading) return null
  if (!user) {
    return showSignup
      ? <SignupPage onSwitchToLogin={() => setShowSignup(false)} />
      : <LoginPage onSwitchToSignup={() => setShowSignup(true)} />
  }
  return <Shell />
}

export default function App() {
  return <AuthProvider><Gate /></AuthProvider>
}
