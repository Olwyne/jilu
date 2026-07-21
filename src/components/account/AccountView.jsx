import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n/index.js'
import emailjs from '@emailjs/browser'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import { initials } from '../../lib/domain'
import EditProfileModal from '../modals/EditProfileModal'

const TYPE_EMOJI = { bug: '🐛', suggestion: '💡', other: '💬' }

const RATE_LIMIT = 3
const WINDOW_MS = 24 * 60 * 60 * 1000

function FeedbackSection({ profile }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [type, setType] = useState('suggestion')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('idle')

  const FEEDBACK_TYPES = [
    { value: 'bug', label: t('feedback.bug') },
    { value: 'suggestion', label: t('feedback.suggestion') },
    { value: 'other', label: t('feedback.other') },
  ]

  async function handleSend() {
    if (!subject.trim() || !message.trim() || !user) return
    setStatus('loading')
    try {
      const userRef = doc(db, 'users', user.uid)
      const snap = await getDoc(userRef)
      const now = Date.now()
      const prev = (snap.data()?.feedbackTimestamps ?? []).filter(t => now - t < WINDOW_MS)
      if (prev.length >= RATE_LIMIT) {
        setStatus('ratelimit')
        setTimeout(() => setStatus('idle'), 4000)
        return
      }
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        {
          type: FEEDBACK_TYPES.find(ft => ft.value === type)?.label ?? type,
          emoji: TYPE_EMOJI[type],
          subject: subject.trim(),
          message: message.trim(),
          user_handle: profile?.handle || '—',
          user_uid: profile?.uid || '—',
          user_agent: navigator.userAgent,
          language: navigator.language,
          screen: `${screen.width}×${screen.height} (viewport ${window.innerWidth}×${window.innerHeight})`,
          sent_at: new Date().toLocaleString('fr-FR'),
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
      )
      await setDoc(userRef, { feedbackTimestamps: [...prev, now] }, { merge: true })
      setStatus('success')
      setSubject('')
      setMessage('')
      setType('suggestion')
      setTimeout(() => setStatus('idle'), 4000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  return (
    <div style={{ borderRadius: 18, background: 'var(--color-surface)', border: '1px solid var(--color-border)', overflow: 'hidden', marginBottom: 24, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {FEEDBACK_TYPES.map(ft => (
          <button
            key={ft.value}
            onClick={() => setType(ft.value)}
            style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: type === ft.value ? 'var(--color-accent)' : 'transparent', color: type === ft.value ? '#fff' : 'var(--color-muted)', borderColor: type === ft.value ? 'var(--color-accent)' : 'var(--color-border-btn)', transition: 'all .15s' }}
          >
            {ft.label}
          </button>
        ))}
      </div>
      <input
        value={subject}
        onChange={e => setSubject(e.target.value)}
        placeholder={t('feedback.subjectPlaceholder')}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-border-btn)', background: 'var(--color-surface-row)', color: 'var(--color-text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
      />
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder={t('feedback.messagePlaceholder')}
        rows={4}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-border-btn)', background: 'var(--color-surface-row)', color: 'var(--color-text)', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={handleSend}
          disabled={status === 'loading' || !subject.trim() || !message.trim()}
          style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: status === 'loading' ? 'wait' : 'pointer', opacity: (!subject.trim() || !message.trim()) ? 0.5 : 1, transition: 'opacity .15s' }}
        >
          {status === 'loading' ? t('feedback.sending') : t('feedback.send')}
        </button>
        {status === 'success' && <span style={{ fontSize: 13, color: 'var(--color-green, #22c55e)', fontWeight: 600 }}>{t('feedback.success')}</span>}
        {status === 'error' && <span style={{ fontSize: 13, color: 'var(--color-danger-text)', fontWeight: 600 }}>{t('feedback.error')}</span>}
        {status === 'ratelimit' && <span style={{ fontSize: 13, color: 'var(--color-danger-text)', fontWeight: 600 }}>{t('feedback.rateLimit')}</span>}
      </div>
    </div>
  )
}

function Toggle({ on, onToggle }) {
  return (
    <div onClick={onToggle} style={{ width: 44, height: 26, borderRadius: 26, flexShrink: 0, cursor: 'pointer', position: 'relative', background: on ? 'var(--color-accent)' : 'rgba(128,128,160,.25)', transition: 'background .18s' }}>
      <div style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .18s' }} />
    </div>
  )
}

function Section({ rows, settings, onToggleSetting }) {
  const { t } = useTranslation()
  return (
    <div style={{ borderRadius: 18, background: 'var(--color-surface)', border: '1px solid var(--color-border)', overflow: 'hidden', marginBottom: 24 }}>
      {rows.map(([key, label, desc, disabled]) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderTop: '1px solid var(--color-border-sm)', opacity: disabled ? 0.45 : 1 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14.5, display: 'flex', alignItems: 'center', gap: 8 }}>
              {label}
              {disabled && (
                <span style={{ background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 10, padding: '1px 6px', lineHeight: 1.5 }}>
                  {t('settings.comingSoon')}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--color-muted)', marginTop: 2 }}>{desc}</div>
          </div>
          <div style={{ pointerEvents: disabled ? 'none' : 'auto' }}>
            <Toggle on={disabled ? false : !!settings[key]} onToggle={() => onToggleSetting(key)} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AccountView({ profile, settings, onToggleSetting, onSaveProfile, onMarkAll, onReset, onLogout, onSync, onClearAll, onImportTVTime, onImportTVTimeOut, onRefreshAll, onChangeLanguage }) {
  const { t, i18n: i18nInstance } = useTranslation()
  const [syncLabel, setSyncLabel] = useState(null)
  const [refreshLabel, setRefreshLabel] = useState(null)
  const [importLabel, setImportLabel] = useState(null)
  const [importOutLabel, setImportOutLabel] = useState(null)
  const [failedItems, setFailedItems] = useState([])
  const [failedOutItems, setFailedOutItems] = useState([])
  const [editOpen, setEditOpen] = useState(false)

  const PREF_ROWS = [
    ['notifNewEp', t('settings.notifNewEp'), t('settings.notifNewEpDesc'), true],
    ['notifCalendar', t('settings.notifCalendar'), t('settings.notifCalendarDesc'), true],
    ['notifWeekly', t('settings.notifWeekly'), t('settings.notifWeeklyDesc'), true],
  ]
  const PLAYBACK_ROWS = [
    ['autoNext', t('settings.autoNext'), t('settings.autoNextDesc'), true],
    ['spoilerFree', t('settings.spoilerFree'), t('settings.spoilerFreeDesc'), true],
    ['adult', t('settings.adult'), t('settings.adultDesc'), true],
  ]
  const PRIVACY_ROWS = [
    ['publicProfile', t('settings.publicProfile'), t('settings.publicProfileDesc')],
  ]

  async function handleRefreshAll() {
    await onRefreshAll((msg) => setRefreshLabel(msg))
    setTimeout(() => setRefreshLabel(null), 4000)
  }

  async function handleSync() {
    setSyncLabel(t('settings.syncing'))
    try { await onSync(); setSyncLabel(t('settings.synced')) } catch { setSyncLabel(t('settings.syncError')) }
    setTimeout(() => setSyncLabel(null), 3000)
  }

  async function handleImport() {
    setFailedItems([])
    await onImportTVTime(msg => setImportLabel(msg), list => setFailedItems(list))
    setTimeout(() => setImportLabel(null), 6000)
  }

  async function handleImportOut() {
    setFailedOutItems([])
    await onImportTVTimeOut(msg => setImportOutLabel(msg), list => setFailedOutItems(list))
    setTimeout(() => setImportOutLabel(null), 6000)
  }

  const isDark = settings.darkMode !== false

  return (
    <div>
      {editOpen && (
        <EditProfileModal
          profile={profile}
          onSave={onSaveProfile}
          onClose={() => setEditOpen(false)}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', padding: 24, borderRadius: 20, background: 'var(--color-surface)', border: '1px solid var(--color-border)', marginBottom: 26 }}>
        <div style={{ width: 76, height: 76, flexShrink: 0, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-accent), var(--color-pink))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: '#fff' }}>
          {initials(profile.handle || profile.name)}
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, margin: 0 }}>{profile.handle || '—'}</h2>
            <span onClick={() => setEditOpen(true)} style={{ fontSize: 12.5, color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 600 }}>{t('settings.modify')}</span>
          </div>
          <div style={{ color: 'var(--color-muted)', fontSize: 14, marginTop: 3 }}>{profile.email}</div>
          <div style={{ color: 'var(--color-muted-3)', fontSize: 12.5, marginTop: 8 }}>{t('settings.memberSince') + ' '}{profile.memberSince}</div>
        </div>
      </div>

      <div style={{ padding: '8px 4px 4px', fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{t('settings.appearance')}</div>
      <div style={{ borderRadius: 18, background: 'var(--color-surface)', border: '1px solid var(--color-border)', overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderTop: '1px solid var(--color-border-sm)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>{t('settings.darkMode')}</div>
            <div style={{ fontSize: 12.5, color: 'var(--color-muted)', marginTop: 2 }}>{t('settings.darkModeDesc')}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>{isDark ? '🌙' : '☀️'}</span>
            <Toggle on={isDark} onToggle={() => onToggleSetting('darkMode')} />
          </div>
        </div>
        {/* Language row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderTop: '1px solid var(--color-border-sm)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>{t('settings.language')}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['en', 'fr'].map(lang => (
              <button
                key={lang}
                onClick={() => onChangeLanguage?.(lang)}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: '1px solid',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: i18nInstance.language === lang ? 'var(--color-accent)' : 'transparent',
                  color: i18nInstance.language === lang ? '#fff' : 'var(--color-muted)',
                  borderColor: i18nInstance.language === lang ? 'var(--color-accent)' : 'var(--color-border-btn)',
                  transition: 'all .15s',
                }}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '8px 4px 4px', fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{t('settings.notifications')}</div>
      <Section rows={PREF_ROWS} settings={settings} onToggleSetting={onToggleSetting} />

      <div style={{ padding: '8px 4px 4px', fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{t('settings.playback')}</div>
      <Section rows={PLAYBACK_ROWS} settings={settings} onToggleSetting={onToggleSetting} />

      <div style={{ padding: '8px 4px 4px', fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{t('settings.privacy')}</div>
      <Section rows={PRIVACY_ROWS} settings={settings} onToggleSetting={onToggleSetting} />

      <div style={{ padding: '8px 4px 4px', fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{t('settings.import')}</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: failedItems.length || failedOutItems.length ? 12 : 24 }}>
        <div onClick={handleImport} style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid var(--color-border-btn)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{importLabel ?? t('settings.importTVTime')}</div>
        <div onClick={handleImportOut} style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid var(--color-border-btn)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{importOutLabel ?? t('settings.importTVTimeOut')}</div>
      </div>
      {(failedItems.length > 0 || failedOutItems.length > 0) && (
        <div style={{ marginBottom: 24 }}>
          {[{ label: 'TVTime RGPD', items: failedItems }, { label: 'TVTime Out', items: failedOutItems }]
            .filter(g => g.items.length > 0)
            .map(g => (
              <div key={g.label} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12.5, color: 'var(--color-muted)', marginBottom: 6 }}>
                  {t('settings.importFailed', { count: g.items.length, label: g.label })}
                </div>
                <textarea
                  readOnly
                  value={g.items.join('\n')}
                  onClick={e => e.target.select()}
                  style={{ width: '100%', minHeight: Math.min(g.items.length * 22, 180), resize: 'vertical', background: 'var(--color-surface-row)', border: '1px solid var(--color-border-btn)', borderRadius: 10, color: 'var(--color-muted)', fontSize: 13, padding: '10px 12px', fontFamily: 'monospace', boxSizing: 'border-box', cursor: 'text' }}
                />
              </div>
            ))}
        </div>
      )}

      <div style={{ padding: '8px 4px 4px', fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{t('settings.data')}</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
        <div onClick={handleSync} style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid var(--color-border-btn)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{syncLabel ?? t('settings.sync')}</div>
        <div onClick={handleRefreshAll} style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid var(--color-border-btn)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{refreshLabel ?? t('settings.refresh')}</div>
        <div onClick={onMarkAll} style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid var(--color-border-btn)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{t('settings.markAll')}</div>
        <div onClick={onReset} style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid var(--color-danger-border)', background: 'var(--color-danger-bg)', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--color-danger-text)' }}>{t('settings.reset')}</div>
        <div onClick={onClearAll} style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid var(--color-danger-border-2)', background: 'var(--color-danger-bg-2)', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--color-danger-text)' }}>{t('settings.clearAll')}</div>
      </div>

      <div style={{ padding: '8px 4px 4px', fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{t('settings.feedback')}</div>
      <FeedbackSection profile={profile} />

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 24 }}>
        <div onClick={onLogout} style={{ display: 'inline-block', padding: '11px 20px', borderRadius: 12, border: '1px solid var(--color-danger-border)', background: 'var(--color-danger-bg)', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--color-danger-text)' }}>{t('settings.logout')}</div>
      </div>
    </div>
  )
}
