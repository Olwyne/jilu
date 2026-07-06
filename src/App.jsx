import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom'
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
import ProfileView from './components/profile/ProfileView'
import PublicProfilePage from './components/profile/PublicProfilePage'
import Toast from './components/Toast'
import SearchModal from './components/modals/SearchModal'

const ROUTE_COPY = {
  '/': { title: 'Accueil', subtitle: "Voici ce qui t'attend" },
  '/library': { title: 'Ma bibliothèque', subtitle: '' },
  '/calendar': { title: 'Calendrier', subtitle: 'À rattraper et à venir' },
  '/stats': { title: 'Statistiques', subtitle: 'Ton année en chiffres' },
  '/account': { title: 'Compte & paramètres', subtitle: 'Profil, préférences et données' },
  '/profile': { title: 'Mon profil', subtitle: 'Tes stats, favoris et bibliothèque' },
}

function DetailRoute({ data, workActions, onOpenEpisode }) {
  const { workId } = useParams()
  const work = data.works[workId]
  if (!work) return <Navigate to="/library" replace />
  return (
    <DetailView
      work={work}
      watched={data.watched}
      ratings={data.ratings}
      games={data.games}
      feed={data.feed}
      actions={workActions}
      favorites={data.favorites}
      onOpenEpisode={onOpenEpisode}
    />
  )
}

function Shell() {
  const { user, logout } = useAuth()
  const { data, loading, mutate, syncAll } = useAppData(user)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [isMobile, setIsMobile] = useState(window.innerWidth < 860)
  const [searchOpen, setSearchOpen] = useState(false)
  const [episodeModal, setEpisodeModal] = useState(null)
  const [toast, setToast] = useState(null)
  const workActions = useWorkActions(data, mutate)
  const { importTVTime, importTVTimeOut } = useImport(data, mutate)

  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.darkMode === false ? 'light' : 'dark'
  }, [data.settings.darkMode])
  const openWork = (id) => navigate('/work/' + id)

  const now = Date.now()
  const toCatch = Object.values(data.works)
    .filter(w => w.status === 'en_cours' && w.seasons)
    .reduce((n, w) => n + w.seasons.reduce((m, s) => m + s.episodes.filter(e => e.air <= now && !data.watched[`${w.id}-${s.n}-${e.n}`]).length, 0), 0)

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

  useEffect(() => { setEpisodeModal(null) }, [pathname])

  if (loading) return null

  const isDetail = pathname.startsWith('/work/')
  const copy = ROUTE_COPY[pathname] || (isDetail ? { title: '', subtitle: '' } : ROUTE_COPY['/library'])

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {!isMobile && <Sidebar profile={data.profile} toCatch={toCatch} />}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', paddingBottom: isMobile ? 74 : 0 }}>
        <Header
          title={copy.title}
          subtitle={copy.subtitle}
          showBack={isDetail}
          onBack={() => navigate(-1)}
          onOpenSearch={() => setSearchOpen(true)}
          isMobile={isMobile}
        />
        <main style={{ padding: '22px 30px 40px', maxWidth: 1240, width: '100%' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/library" replace />} />
            <Route path="/library" element={
              <LibraryView
                works={data.works}
                watched={data.watched}
                ratings={data.ratings}
                favorites={data.favorites}
                onOpenWork={openWork}
              />
            } />
            <Route path="/calendar" element={
              <CalendarView
                works={data.works}
                watched={data.watched}
                onOpenWork={openWork}
                onMarkWatched={(id, s, e) => workActions.markWatchedToast(data.works[id], s, e, setToast)}
              />
            } />
            <Route path="/dashboard" element={
              <DashboardView
                works={data.works}
                watched={data.watched}
                reviews={data.reviews}
                ratings={data.ratings}
                onOpenWork={openWork}
                onWatchNext={(id, s, e) => workActions.markWatchedToast(data.works[id], s, e, setToast)}
              />
            } />
            <Route path="/stats" element={
              <StatsView
                works={data.works}
                watched={data.watched}
                ratings={data.ratings}
                onOpenWork={openWork}
              />
            } />
            <Route path="/account" element={
              <AccountView
                settings={data.settings}
                profile={data.profile}
                onToggleSetting={(k) => mutate({ settings: { ...data.settings, [k]: !data.settings[k] } })}
                onSaveProfile={(updates) => mutate({ profile: { ...data.profile, ...updates } })}
                onMarkAll={() => workActions.markAllWatched()}
                onReset={() => workActions.resetProgress()}
                onClearAll={() => workActions.clearAll()}
                onSync={syncAll}
                onRefreshAll={workActions.refreshAllWorks}
                onImportTVTime={importTVTime}
                onImportTVTimeOut={importTVTimeOut}
                onLogout={logout}
              />
            } />
            <Route path="/profile/:handle?" element={
              <ProfileView
                data={data}
                onOpenWork={(id) => id === '__library' ? navigate('/library') : openWork(id)}
                onToggleLike={workActions.toggleLike}
                onDelete={workActions.deleteComment}
              />
            } />
            <Route path="/work/:workId" element={
              <DetailRoute
                data={data}
                workActions={workActions}
                onOpenEpisode={(w, s, e) => setEpisodeModal({ workId: w.id, sNum: s.n, eNum: e.n })}
              />
            } />
            <Route path="*" element={<Navigate to="/library" replace />} />
          </Routes>
        </main>
      </div>
      {isMobile && <MobileNav />}
      <Toast toast={toast} onClose={() => setToast(null)} onOpenRating={() => setToast(null)} />
      {searchOpen && (
        <SearchModal
          works={data.works}
          onAdd={(r) => {
            workActions.addWork(r)
            setToast({
              header: 'Ajouté à ta bibliothèque',
              title: r.title,
              action: {
                label: 'Voir',
                fn: () => {
                  setSearchOpen(false)
                  setToast(null)
                  navigate('/work/' + r.id)
                }
              }
            })
          }}
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

function AuthGuard() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <Shell />
}

function LoginRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (user) return <Navigate to={location.state?.from || '/library'} replace />
  return <LoginPage />
}

function SignupRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (user) return <Navigate to={location.state?.from || '/library'} replace />
  return <SignupPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/u/:handle" element={<PublicProfilePage />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/signup" element={<SignupRoute />} />
          <Route path="/*" element={<AuthGuard />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
