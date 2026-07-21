import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted-2)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: 11, fontSize: 15,
  background: 'var(--color-chip-bg)', border: '1px solid var(--color-border-btn)',
  outline: 'none', color: 'var(--color-text)', fontFamily: 'inherit', boxSizing: 'border-box'
}

export default function EditProfileModal({ profile, onSave, onClose }) {
  const { t } = useTranslation()
  const { user, changePassword } = useAuth()

  const STATUS_MSG = {
    idle: null,
    self: null,
    checking: { text: t('editProfile.checking'), color: 'var(--color-muted-3)' },
    available: { text: t('editProfile.available'), color: '#4ade80' },
    taken: { text: t('editProfile.taken'), color: '#f87171' },
    invalid: { text: t('editProfile.invalidHandle'), color: '#f87171' },
  }
  const [handle, setHandle] = useState(profile.handle || '')
  const [email, setEmail] = useState(profile.email || '')
  const [handleStatus, setHandleStatus] = useState('self')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    const h = handle.trim().toLowerCase()
    if (!h || h === (profile.handle || '').toLowerCase()) { setHandleStatus('self'); return }
    if (!/^[a-z0-9_]{2,20}$/.test(h)) { setHandleStatus('invalid'); return }
    setHandleStatus('checking')
    const t = setTimeout(async () => {
      try {
        const snap = await getDoc(doc(db, 'pseudos', h))
        setHandleStatus(snap.exists() && snap.data().uid !== user.uid ? 'taken' : 'available')
      } catch { setHandleStatus('idle') }
    }, 500)
    return () => clearTimeout(t)
  }, [handle, profile.handle, user.uid])

  const passwordFilled = newPassword.length > 0 || currentPassword.length > 0

  async function handleSubmit(e) {
    e.preventDefault()
    if (handleStatus === 'taken' || handleStatus === 'invalid' || handleStatus === 'checking') return
    if (passwordFilled) {
      if (!currentPassword) { setError(t('editProfile.wrongPassword')); return }
      if (newPassword.length < 6) { setError(t('editProfile.passwordTooShort')); return }
      if (newPassword !== confirmPassword) { setError(t('editProfile.passwordMismatch')); return }
    }
    setSaving(true)
    setError(null)
    try {
      const h = handle.trim().toLowerCase()
      if (h !== profile.handle) {
        if (profile.handle) await deleteDoc(doc(db, 'pseudos', profile.handle))
        await setDoc(doc(db, 'pseudos', h), { uid: user.uid })
      }
      await onSave({ handle: h, email: email.trim() })
      if (passwordFilled) await changePassword(currentPassword, newPassword)
      onClose()
    } catch (err) {
      const code = err.code
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError(t('editProfile.wrongPassword'))
      } else {
        setError(err.message || t('editProfile.saveError'))
      }
    }
    setSaving(false)
  }

  const canSave = handle.trim() && (handleStatus === 'available' || handleStatus === 'self') && !saving
  const msg = STATUS_MSG[handleStatus]

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(4px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, background: 'var(--color-modal-bg)', border: '1px solid var(--color-border-btn)', borderRadius: 22, padding: 28, boxShadow: '0 30px 80px rgba(0,0,0,.6)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, marginBottom: 24 }}>{t('editProfile.title')}</div>
        <form onSubmit={handleSubmit}>
          <Field label={t('editProfile.pseudo')}>
            <div style={{ position: 'relative' }}>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder="ton_pseudo"
                maxLength={20}
                style={{ ...inputStyle }}
              />
            </div>
            {msg && <div style={{ fontSize: 12.5, marginTop: 6, color: msg.color }}>{msg.text}</div>}
          </Field>
          <Field label={t('editProfile.email')}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.com"
              style={inputStyle}
            />
          </Field>
          <Field label={t('editProfile.changePassword')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('editProfile.currentPassword')}
                style={inputStyle}
                autoComplete="current-password"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('editProfile.newPassword')}
                style={inputStyle}
                minLength={6}
                autoComplete="new-password"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('editProfile.confirmPassword')}
                style={inputStyle}
                autoComplete="new-password"
              />
            </div>
          </Field>
          {error && <div style={{ fontSize: 13, color: '#f87171', marginBottom: 14 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <div onClick={onClose} style={{ padding: '11px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--color-muted-2)', background: 'var(--color-chip-bg)' }}>{t('editProfile.cancel')}</div>
            <button type="submit" disabled={!canSave} style={{ padding: '11px 22px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: canSave ? 'pointer' : 'not-allowed', border: 'none', background: canSave ? 'var(--color-accent)' : 'var(--color-border-btn)', color: canSave ? '#fff' : 'var(--color-muted-3)' }}>
              {saving ? t('editProfile.saving') : t('editProfile.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
