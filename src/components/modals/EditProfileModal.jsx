import { useState, useEffect } from 'react'
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
  background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)',
  outline: 'none', color: 'var(--color-text)', fontFamily: 'inherit', boxSizing: 'border-box'
}

const STATUS_MSG = {
  idle: null,
  self: null,
  checking: { text: 'Vérification…', color: 'var(--color-muted-3)' },
  available: { text: '✓ Disponible', color: '#4ade80' },
  taken: { text: '✗ Déjà utilisé', color: '#f87171' },
  invalid: { text: 'Uniquement lettres, chiffres et _ (2–20 caractères)', color: '#f87171' }
}

export default function EditProfileModal({ profile, onSave, onClose }) {
  const { user } = useAuth()
  const [handle, setHandle] = useState(profile.handle || '')
  const [email, setEmail] = useState(profile.email || '')
  const [handleStatus, setHandleStatus] = useState('self')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

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

  async function handleSubmit(e) {
    e.preventDefault()
    if (handleStatus === 'taken' || handleStatus === 'invalid' || handleStatus === 'checking') return
    setSaving(true)
    setError(null)
    try {
      const h = handle.trim().toLowerCase()
      if (h !== profile.handle) {
        if (profile.handle) await deleteDoc(doc(db, 'pseudos', profile.handle))
        await setDoc(doc(db, 'pseudos', h), { uid: user.uid })
      }
      await onSave({ handle: h, email: email.trim() })
      onClose()
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde')
    }
    setSaving(false)
  }

  const canSave = handle.trim() && (handleStatus === 'available' || handleStatus === 'self') && !saving
  const msg = STATUS_MSG[handleStatus]

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(4px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, background: '#15151d', border: '1px solid rgba(255,255,255,.1)', borderRadius: 22, padding: 28, boxShadow: '0 30px 80px rgba(0,0,0,.6)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, marginBottom: 24 }}>Modifier le profil</div>
        <form onSubmit={handleSubmit}>
          <Field label="Pseudo">
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted-2)', fontSize: 15, pointerEvents: 'none' }}>@</span>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder="ton_pseudo"
                maxLength={20}
                style={{ ...inputStyle, paddingLeft: 28 }}
              />
            </div>
            {msg && <div style={{ fontSize: 12.5, marginTop: 6, color: msg.color }}>{msg.text}</div>}
          </Field>
          <Field label="Adresse e-mail">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.com"
              style={inputStyle}
            />
            <div style={{ fontSize: 12, color: 'var(--color-muted-3)', marginTop: 6 }}>Modifie uniquement dans les paramètres Firebase Auth si besoin.</div>
          </Field>
          {error && <div style={{ fontSize: 13, color: '#f87171', marginBottom: 14 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <div onClick={onClose} style={{ padding: '11px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--color-muted-2)', background: 'rgba(255,255,255,.05)' }}>Annuler</div>
            <button type="submit" disabled={!canSave} style={{ padding: '11px 22px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: canSave ? 'pointer' : 'not-allowed', border: 'none', background: canSave ? 'var(--color-accent)' : 'rgba(255,255,255,.1)', color: canSave ? '#fff' : 'var(--color-muted-3)' }}>
              {saving ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
