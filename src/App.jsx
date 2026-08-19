import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18n from './i18n/index.js'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useAppData } from './hooks/useAppData'
import { useWorkActions } from './hooks/useWorkActions'
import { useImport } from './hooks/useImport'
import { useFollows } from './hooks/useFollows'
import LoginPage from './components/auth/LoginPage'
import LandingPage from './components/auth/LandingPage'
import SignupPage from './components/auth/SignupPage'
import ForgotPasswordPage from './components/auth/ForgotPasswordPage'
import ResetPasswordPage from './components/auth/ResetPasswordPage'
import Sidebar from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileNav'
import Header from './components/layout/Header'
import LibraryView from './components/library/LibraryView'
import DetailView from './components/detail/DetailView'
import PreviewView from './components/detail/PreviewView'
import EpisodeModal from './components/modals/EpisodeModal'
import CalendarView from './components/calendar/CalendarView'
import DashboardView from './components/dashboard/DashboardView'
import StatsView from './components/stats/StatsView'
import AccountView from './components/account/AccountView'
import ProfileView from './components/profile/ProfileView'
import PublicProfilePage from './components/profile/PublicProfilePage'
import Toast from './components/Toast'
import SearchModal from './components/modals/SearchModal'
import PrivacyPage from './components/legal/PrivacyPage'
import TermsPage from './components/legal/TermsPage'
import LegalNoticePage from './components/legal/LegalNoticePage'
import KeyboardHelpModal from './components/ui/KeyboardHelpModal'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

function getRouteCopy(t) {
  return {
    '/': { title: t('route.home.title'), subtitle: t('route.home.sub') },
    '/dashboard': { title: t('route.home.title'), subtitle: t('route.home.sub') },
    '/library': { title: t('route.library.title'), subtitle: t('route.library.sub') },
    '/calendar': { title: t('route.calendar.title'), subtitle: t('route.calendar.sub') },
    '/stats': { title: t('route.stats.title'), subtitle: t('route.stats.sub') },
    '/account': { title: t('route.account.title'), subtitle: t('route.account.sub') },
    '/profile': { title: t('route.profile.title'), subtitle: t('route.profile.sub') },
  }
}

function DetailRoute({ data, workActions, currentUser, onOpenEpisode }) {
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
      currentUser={currentUser}
      onOpenEpisode={onOpenEpisode}
    />
  )
}

function Shell() {
  const { user, logout } = useAuth()
  const { data, loading, mutate, syncAll } = useAppData(user)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const [isMobile, setIsMobile] = useState(window.innerWidth < 860)
  const [searchOpen, setSearchOpen] = useState(false)
  const [episodeModal, setEpisodeModal] = useState(null)
  const [toast, setToast] = useState(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const workActions = useWorkActions(data, mutate)
  const { importTVTime, importTVTimeOut } = useImport(data, mutate)
  const currentUser = user ? { uid: user.uid, handle: data.profile?.handle } : null
  const { following, follow, unfollow, isFollowing } = useFollows(user)

  useKeyboardShortcuts({
    navigate,
    onToggleHelp: () => setShortcutsOpen((v) => !v),
    onBack: () => navigate(-1),
  })


  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.darkMode === false ? 'light' : 'dark'
  }, [data.settings.darkMode])

  useEffect(() => {
    if (data.settings.language) {
      i18n.changeLanguage(data.settings.language)
    }
  }, [data.settings.language])
  const openWork = (id) => navigate('/work/' + id)

  const now = Date.now()
  const toCatch = Object.values(data.works)
    .filter(w => w.status === 'en_cours' && w.seasons)
    .reduce((n, w) => n + w.seasons.reduce((m, s) => m + s.episodes.filter(e => e.air > 0 && e.air <= now && !data.watched[`${w.id}-${s.n}-${e.n}`]).length, 0), 0)

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

  const autoRefreshDone = useRef(false)
  useEffect(() => {
    if (loading || autoRefreshDone.current) return
    autoRefreshDone.current = true
    workActions.refreshStaleWorks(24 * 60 * 60 * 1000)
  }, [loading])

  function handleChangeLanguage(lang) {
    i18n.changeLanguage(lang)
    mutate({ settings: { ...data.settings, language: lang } })
  }

  function handleExportJSON() {
    const payload = {
      exported: new Date().toISOString(),
      works: data.works,
      watched: data.watched,
      ratings: data.ratings,
      games: data.games,
      feed: data.feed,
      reviews: data.reviews,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jilu-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleExportCSV() {
    const headers = ['title', 'category', 'status', 'year', 'rating', 'minutes_played']
    const rows = Object.values(data.works).map((w) => {
      const rating = data.ratings?.[`w:${w.id}`] || ''
      const g = data.games?.[w.id]
      const mins = g ? (g.minutes != null ? g.minutes : (g.hours || 0) * 60) : ''
      return [
        `"${(w.title || '').replace(/"/g, '""')}"`,
        w.category || '',
        w.status || '',
        w.year || '',
        rating,
        mins,
      ].join(',')
    })
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jilu-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return null

  const routeCopy = getRouteCopy(t)
  const isDetail = pathname.startsWith('/work/')
  const isProfile = pathname.startsWith('/profile')
  const copy = routeCopy[pathname] || (isDetail ? { title: '', subtitle: '' } : isProfile ? routeCopy['/profile'] : routeCopy['/library'])

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      <a href="#main-content" className="skip-link">{t('a11y.skipToContent')}</a>
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
        <main id="main-content" style={{ padding: `22px ${isMobile ? 16 : 30}px 40px`, maxWidth: 1240, width: '100%', margin: '0 auto' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
                onMarkDone={(id) => workActions.setStatus(id, 'termine')}
                isMobile={isMobile}
              />
            } />
            <Route path="/dashboard" element={
              <DashboardView
                works={data.works}
                watched={data.watched}
                reviews={data.reviews}
                ratings={data.ratings}
                feed={data.feed}
                onOpenWork={openWork}
                onWatchNext={(id, s, e) => workActions.markWatchedToast(data.works[id], s, e, setToast)}
                user={user}
                handle={data.profile?.handle}
                onAddWork={workActions.addWork}
                following={following}
              />
            } />
            <Route path="/stats" element={
              <StatsView
                works={data.works}
                watched={data.watched}
                ratings={data.ratings}
                onOpenWork={openWork}
                isMobile={isMobile}
                settings={data.settings}
                onSaveSettings={(updates) => mutate({ settings: { ...data.settings, ...updates } })}
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
                onExportJSON={handleExportJSON}
                onExportCSV={handleExportCSV}
                onLogout={logout}
                onChangeLanguage={handleChangeLanguage}
              />
            } />
            <Route path="/profile/:handle?" element={
              <ProfileView
                data={data}
                onOpenWork={(id) => id === '__library' ? navigate('/library') : openWork(id)}
                onToggleLike={workActions.toggleLike}
                onDelete={workActions.deleteComment}
                isMobile={isMobile}
              />
            } />
            <Route path="/work/:workId" element={
              <DetailRoute
                data={data}
                workActions={workActions}
                currentUser={currentUser}
                onOpenEpisode={(w, s, e) => setEpisodeModal({ workId: w.id, sNum: s.n, eNum: e.n })}
              />
            } />
            <Route path="/preview/:workId" element={
              <PreviewView works={data.works} onAddWork={workActions.addWork} />
            } />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
      {isMobile && <MobileNav />}
      <Toast toast={toast} onClose={() => setToast(null)} onOpenRating={() => { if (toast?.workId) setEpisodeModal({ workId: toast.workId, sNum: toast.sNum, eNum: toast.eNum }); setToast(null) }} />
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
          onNavigate={(r) => { setSearchOpen(false); navigate('/work/' + r.id) }}
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
          watched={data.watched}
          currentUser={currentUser}
          onClose={() => setEpisodeModal(null)}
        />
      )}
      {shortcutsOpen && <KeyboardHelpModal onClose={() => setShortcutsOpen(false)} />}
    </div>
  )
}

function AuthGuard() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <LandingPage />
  return <Shell />
}

function LoginRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (user) return <Navigate to={location.state?.from || '/dashboard'} replace />
  return <LoginPage />
}

function SignupRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (user) return <Navigate to={location.state?.from || '/dashboard'} replace />
  return <SignupPage />
}

function ForgotPasswordRoute() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return <ForgotPasswordPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/u/:handle" element={<PublicProfilePage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/legal" element={<LegalNoticePage />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/signup" element={<SignupRoute />} />
          <Route path="/forgot-password" element={<ForgotPasswordRoute />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/*" element={<AuthGuard />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
