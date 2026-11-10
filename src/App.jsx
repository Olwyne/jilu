import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18n from './i18n/index.js'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useAppData, clearLocalCaches } from './hooks/useAppData'
import { useWorkActions } from './hooks/useWorkActions'
import { useImport } from './hooks/useImport'
import { useFollows } from './hooks/useFollows'
import LoginPage from './components/auth/LoginPage'
import SignupPage from './components/auth/SignupPage'
import ForgotPasswordPage from './components/auth/ForgotPasswordPage'
import ResetPasswordPage from './components/auth/ResetPasswordPage'
import Sidebar from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileNav'
import Header from './components/layout/Header'
import LibraryView from './components/library/LibraryView'
import DashboardView from './components/dashboard/DashboardView'
import Toast from './components/Toast'
import SearchModal from './components/modals/SearchModal'
import KeyboardHelpModal from './components/ui/KeyboardHelpModal'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { ensureHandle } from './lib/handle'
import Button from './components/ui/Button'

const EpisodeModal = lazy(() => import('./components/modals/EpisodeModal'))
const LandingPage = lazy(() => import('./components/auth/LandingPage'))
const DetailView = lazy(() => import('./components/detail/DetailView'))
const PreviewView = lazy(() => import('./components/detail/PreviewView'))
const CalendarView = lazy(() => import('./components/calendar/CalendarView'))
const StatsView = lazy(() => import('./components/stats/StatsView'))
const AccountView = lazy(() => import('./components/account/AccountView'))
const ProfileView = lazy(() => import('./components/profile/ProfileView'))
const PublicProfilePage = lazy(() => import('./components/profile/PublicProfilePage'))
const PrivacyPage = lazy(() => import('./components/legal/PrivacyPage'))
const TermsPage = lazy(() => import('./components/legal/TermsPage'))
const LegalNoticePage = lazy(() => import('./components/legal/LegalNoticePage'))

function RouteFallback() {
  const { t } = useTranslation()
  return <div role="status" aria-busy="true" className="jilu-fallback">{t('profile.loading')}</div>
}

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

// Prépare le compte (rattrapage à la première ouverture) avant d'afficher l'application.
const fullScreenBox = { minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--color-muted)', fontSize: 15, padding: 24, textAlign: 'center' }

function ErrorScreen({ message, onRetry, onLogout }) {
  const { t } = useTranslation()
  return (
    <div role="alert" style={fullScreenBox}>
      <div>
        <p style={{ marginBottom: 14 }}>{message}</p>
        <Button variant="primary" style={{ marginRight: 10 }} onClick={onRetry}>{t('data.retry')}</Button>
        <Button variant="secondary" onClick={onLogout}>{t('data.logout')}</Button>
      </div>
    </div>
  )
}

function Shell() {
  const { user, logout } = useAuth()
  const {
    data, loading, error, saveError, mutate, syncAll, getFullData, getCatalogDoc,
    ensureAllCatalog, ensureProgressCatalog, ensureWorkCatalog, refreshWork, refreshStale, refreshAll,
  } = useAppData(user)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const [isMobile, setIsMobile] = useState(window.innerWidth < 860)
  const [searchOpen, setSearchOpen] = useState(false)
  const [episodeModal, setEpisodeModal] = useState(null)
  const [toast, setToast] = useState(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const workActions = useWorkActions(data, mutate, { getCatalogDoc, refreshWork, refreshAll })
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

  const [toastHold, setToastHold] = useState(false)
  useEffect(() => {
    if (!toast) { setToastHold(false); return }
    if (toastHold) return
    const t = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(t)
  }, [toast, toastHold])

  useEffect(() => { setEpisodeModal(null) }, [pathname])

  // Écriture refusée par le serveur : l'écran est déjà revenu à l'état enregistré, on le dit
  useEffect(() => {
    if (!saveError) return
    setToast({ tone: 'error', header: t('data.saveError'), title: t('data.saveErrorHint'), action: { label: t('data.reload'), fn: () => window.location.reload() } })
  }, [saveError])

  // Comptes sans pseudo (inscription sans étape pseudo, anciens comptes) : on réserve un pseudo
  // neutre (membre_xxxxxx) une seule fois par appareil ; l'utilisateur peut le changer ensuite.
  useEffect(() => {
    if (loading || !user) return
    const flag = `handleChecked:${user.uid}`
    try { if (localStorage.getItem(flag)) return } catch { /* stockage indisponible : on vérifie à chaque fois */ }
    ensureHandle(user, data.profile?.handle).then((handle) => {
      if (!handle) return
      if (handle !== data.profile?.handle) return mutate({ profile: { ...data.profile, handle } })
    }).then(() => {
      try { localStorage.setItem(flag, '1') } catch { /* ignoré */ }
    }).catch((e) => console.warn('[handle]', e))
  }, [loading, user?.uid])

  // Les épisodes viennent du catalogue partagé, chargés selon l'écran affiché
  useEffect(() => {
    if (loading) return
    if (pathname.startsWith('/work/')) ensureWorkCatalog(pathname.split('/')[2])
    else if (pathname.startsWith('/stats') || pathname.startsWith('/profile') || pathname.startsWith('/account')) ensureAllCatalog()
    else if (pathname.startsWith('/library')) ensureProgressCatalog()
  }, [pathname, loading])

  // Rafraîchissement automatique : quelques œuvres en cours de diffusion par session, via le serveur
  // (qui ne rappelle les API que si la fiche partagée date de plus de 24 h)
  const autoRefreshDone = useRef(false)
  useEffect(() => {
    if (loading || autoRefreshDone.current) return
    autoRefreshDone.current = true
    refreshStale().catch((e) => console.warn('[auto-refresh]', e))
  }, [loading])

  function handleChangeLanguage(lang) {
    i18n.changeLanguage(lang)
    mutate({ settings: { ...data.settings, language: lang } })
  }

  async function handleExportJSON() {
    const full = await getFullData() // tous les épisodes chargés, même ceux qu'on n'a pas encore ouverts
    const payload = {
      exported: new Date().toISOString(),
      works: full.works,
      watched: full.watched,
      ratings: full.ratings,
      games: full.games,
      feed: full.feed,
      reviews: full.reviews,
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
  // Sans ce garde-fou, un chargement raté affiche une bibliothèque vide (« tout est perdu »)
  if (error) return <ErrorScreen message={t('data.loadError')} onRetry={() => window.location.reload()} onLogout={logout} />

  const routeCopy = getRouteCopy(t)
  const isDetail = pathname.startsWith('/work/')
  const isProfile = pathname.startsWith('/profile')
  const copy = routeCopy[pathname] || (isDetail ? { title: '', subtitle: '' } : isProfile ? routeCopy['/profile'] : routeCopy['/library'])

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      <a href="#main-content" className="skip-link">{t('a11y.skipToContent')}</a>
      <Toast toast={toast} onClose={() => setToast(null)} onHold={setToastHold} onUndo={() => { if (toast?.workId) workActions.toggleEpisode(toast.workId, toast.sNum, toast.eNum); setToast(null) }} onOpenRating={() => { if (toast?.workId) setEpisodeModal({ workId: toast.workId, sNum: toast.sNum, eNum: toast.eNum }); setToast(null) }} />
      {!isMobile && <Sidebar profile={{ ...data.profile, email: user?.email }} toCatch={toCatch} />}
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
          <Suspense fallback={<RouteFallback />}>
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
                onLogout={async () => { try { await clearLocalCaches(user.uid) } catch { /* cache indisponible */ } await logout() }}
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
          </Suspense>
        </main>
      </div>
      {isMobile && <MobileNav />}
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
        <Suspense fallback={null}>
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
        </Suspense>
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
        <Suspense fallback={<RouteFallback />}>
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
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
