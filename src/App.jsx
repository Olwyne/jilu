import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useAppData } from './hooks/useAppData'
import { useWorkActions } from './hooks/useWorkActions'
import { useImport } from './hooks/useImport'
import LoginPage from './components/auth/LoginPage'
import SignupPage from './components/auth/SignupPage'
import Sidebar from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileNav'
import Header from './components/layout/Header'
import LibraryView from './components/library/LibraryView'
import DetailView from './components/detail/DetailView'
import EpisodeModal from './components/modals/EpisodeModal'
import CalendarView from './components/calendar/CalendarView'
import DashboardView from './components/dashboard/DashboardView'
import StatsView from './components/stats/StatsView'
import AccountView from './components/account/AccountView'
import FeedView from './components/feed/FeedView'
import ProfileView from './components/profile/ProfileView'
import Toast from './components/Toast'
import SearchModal from './components/modals/SearchModal'

const HEADER_COPY = {
  dashboard: { title: 'Bonsoir 👋', subtitle: "Voici ce qui t'attend" },
  library: { title: 'Ma bibliothèque', subtitle: '' },
  calendar: { title: 'Calendrier', subtitle: 'À rattraper et à venir' },
  stats: { title: 'Statistiques', subtitle: 'Ton année en chiffres' },
  account: { title: 'Compte & paramètres', subtitle: 'Profil, préférences et données' },
  profile: { title: 'Mon profil', subtitle: 'Tes stats, favoris et bibliothèque' },
  feed: { title: 'Journal', subtitle: 'Tes commentaires et réactions' }
}

function Shell() {
  const { user, logout } = useAuth()
  const { data, loading, mutate, syncAll } = useAppData(user)
  const [view, setView] = useState('library')
  const [selectedId, setSelectedId] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 860)
  const [searchOpen, setSearchOpen] = useState(false)
  const [episodeModal, setEpisodeModal] = useState(null)
  const [toast, setToast] = useState(null)
  const workActions = useWorkActions(data, mutate)
  const { importTVTime, importTVTimeOut } = useImport(data, mutate)
  const openWork = (id) => { setSelectedId(id); setView('detail') }

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 860)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(t)
  }, [toast])

  if (loading) return null

  const copy = HEADER_COPY[view] || HEADER_COPY.library

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {!isMobile && <Sidebar view={view} setView={setView} profile={data.profile} />}
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
          {view === 'calendar' && (
            <CalendarView
              works={data.works}
              watched={data.watched}
              onOpenWork={(id) => { setSelectedId(id); setView('detail') }}
              onMarkWatched={(id, s, e) => workActions.markWatchedToast(data.works[id], s, e, setToast)}
            />
          )}
          {view === 'dashboard' && (
            <DashboardView
              works={data.works}
              watched={data.watched}
              reviews={data.reviews}
              ratings={data.ratings}
              onOpenWork={openWork}
              onWatchNext={(id, s, e) => workActions.markWatchedToast(data.works[id], s, e, setToast)}
            />
          )}
          {view === 'stats' && (
            <StatsView
              works={data.works}
              watched={data.watched}
              ratings={data.ratings}
              onOpenWork={openWork}
            />
          )}
          {view === 'account' && (
            <AccountView
              settings={data.settings}
              profile={data.profile}
              onToggleSetting={(k) => mutate({ settings: { ...data.settings, [k]: !data.settings[k] } })}
              onSetStartPage={(k) => mutate({ settings: { ...data.settings, startPage: k } })}
              onEditField={(k, label) => { const v = window.prompt('Modifier ' + label, data.profile[k]); if (v != null && v.trim()) mutate({ profile: { ...data.profile, [k]: v.trim() } }) }}
              onMarkAll={() => workActions.markAllWatched()}
              onReset={() => workActions.resetProgress()}
              onClearAll={() => workActions.clearAll()}
              onSync={syncAll}
              onImportTVTime={importTVTime}
              onImportTVTimeOut={importTVTimeOut}
              onLogout={logout}
            />
          )}
          {view === 'profile' && (
            <ProfileView
              data={data}
              onOpenWork={(id) => { if (id === '__library') { setView('library') } else { openWork(id) } }}
              onToggleLike={workActions.toggleLike}
              onDelete={workActions.deleteComment}
            />
          )}
          {view === 'feed' && (
            <FeedView
              feed={data.feed}
              works={data.works}
              onOpenWork={openWork}
              onToggleLike={workActions.toggleLike}
              onDelete={workActions.deleteComment}
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
              favorites={data.favorites}
              onOpenEpisode={(w, s, e) => setEpisodeModal({ workId: w.id, sNum: s.n, eNum: e.n })}
            />
          )}
        </main>
      </div>
      {isMobile && <MobileNav view={view} setView={setView} />}
      <Toast
        toast={toast}
        onClose={() => setToast(null)}
        onOpenRating={() => setToast(null)}
      />
      {searchOpen && (
        <SearchModal
          works={data.works}
          onAdd={(r) => workActions.addWork(r)}
          onClose={() => setSearchOpen(false)}
        />
      )}
      {episodeModal && data.works[episodeModal.workId] && (
        <EpisodeModal
          work={data.works[episodeModal.workId]}
          sNum={episodeModal.sNum}
          eNum={episodeModal.eNum}
          ratings={data.ratings}
          feed={data.feed}
          actions={workActions}
          onClose={() => setEpisodeModal(null)}
        />
      )}
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
