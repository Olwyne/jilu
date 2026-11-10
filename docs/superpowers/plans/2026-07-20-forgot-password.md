# Forgot Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add forgot-password and reset-password flow using Firebase `sendPasswordResetEmail` and `confirmPasswordReset`.

**Architecture:** Two new pages (`ForgotPasswordPage`, `ResetPasswordPage`) added as public routes alongside `/login` and `/signup`. `AuthContext` exposes two new methods. Firebase sends the reset email; the link points to `/reset-password?mode=resetPassword&oobCode=XXX` (requires one-time Firebase Console config).

**Tech Stack:** React, React Router v6, Firebase Auth, CSS Modules (same pattern as `LoginPage`)

## Global Constraints

- CSS: reuse classes from `LoginPage.module.css` — same `.wrap`, `.card`, `.brand`, `.title`, `.input`, `.error`, `.button`, `.switch` pattern
- French UI copy throughout
- No new dependencies
- Public routes (no auth required, redirect logged-in users to `/library`)

---

### Task 1: Extend AuthContext with reset methods

**Files:**
- Modify: `src/contexts/AuthContext.jsx`

**Interfaces:**
- Produces:
  - `resetPassword(email: string): Promise<void>` — calls `sendPasswordResetEmail(auth, email, { url: 'https://jilu-app.vercel.app/login' })`
  - `confirmReset(oobCode: string, newPassword: string): Promise<void>` — calls `confirmPasswordReset(auth, oobCode, newPassword)`

- [ ] **Step 1: Update AuthContext imports and value**

Replace the file content with:

```jsx
import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut,
  sendPasswordResetEmail, confirmPasswordReset
} from 'firebase/auth'
import { auth } from '../firebase'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false) })
  }, [])

  const value = {
    user,
    loading,
    signup: (email, password) => createUserWithEmailAndPassword(auth, email, password),
    login: (email, password) => signInWithEmailAndPassword(auth, email, password),
    logout: () => signOut(auth),
    resetPassword: (email) => sendPasswordResetEmail(auth, email, { url: 'https://jilu-app.vercel.app/login' }),
    confirmReset: (oobCode, newPassword) => confirmPasswordReset(auth, oobCode, newPassword),
  }

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  return useContext(AuthCtx)
}
```

- [ ] **Step 2: Verify no import errors**

```bash
rtk tsc --noEmit 2>&1 | head -20
```

Expected: no errors on `AuthContext.jsx`

- [ ] **Step 3: Commit**

```bash
rtk git add src/contexts/AuthContext.jsx
rtk git commit -m "feat: add resetPassword and confirmReset to AuthContext"
```

---

### Task 2: Create ForgotPasswordPage

**Files:**
- Create: `src/components/auth/ForgotPasswordPage.jsx`
- Create: `src/components/auth/ForgotPasswordPage.module.css`

**Interfaces:**
- Consumes: `resetPassword(email)` from `useAuth()`
- Produces: page at `/forgot-password`

- [ ] **Step 1: Create CSS module**

`src/components/auth/ForgotPasswordPage.module.css`:

```css
.wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--color-bg); }
.card { width: 100%; max-width: 380px; background: var(--color-surface); border: 1px solid var(--color-border-btn); border-radius: 20px; padding: 32px; display: flex; flex-direction: column; gap: 12px; }
.brand { font-family: var(--font-display); font-weight: 800; font-size: 22px; margin-bottom: 4px; }
.title { font-family: var(--font-display); font-weight: 700; font-size: 20px; margin: 0 0 8px; }
.subtitle { font-size: 13px; color: var(--color-muted); margin: 0 0 4px; }
.input { background: var(--color-chip-bg); border: 1px solid var(--color-border-btn); border-radius: 10px; padding: 11px 14px; color: var(--color-text); font-size: 14px; font-family: var(--font-body); outline: none; }
.error { color: var(--color-pink); font-size: 13px; }
.success { color: var(--color-accent); font-size: 13px; }
.button { background: var(--color-accent); color: #fff; font-weight: 600; font-size: 14px; padding: 11px; border: none; border-radius: 10px; cursor: pointer; }
.switch { text-align: center; font-size: 13px; color: var(--color-muted); cursor: pointer; margin-top: 6px; }
```

- [ ] **Step 2: Create ForgotPasswordPage component**

`src/components/auth/ForgotPasswordPage.jsx`:

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import styles from './ForgotPasswordPage.module.css'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await resetPassword(email)
      setSent(true)
    } catch {
      setError("Impossible d'envoyer l'e-mail. Vérifie l'adresse saisie.")
    }
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.brand}>Jilu</div>
        <h1 className={styles.title}>Mot de passe oublié</h1>
        {!sent ? (
          <>
            <p className={styles.subtitle}>Saisis ton adresse e-mail pour recevoir un lien de réinitialisation.</p>
            <input
              className={styles.input}
              type="email"
              placeholder="Adresse e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <div className={styles.error}>{error}</div>}
            <button className={styles.button} type="submit">Envoyer le lien</button>
          </>
        ) : (
          <p className={styles.success}>
            E-mail envoyé ! Vérifie ta boîte de réception et clique sur le lien pour réinitialiser ton mot de passe.
          </p>
        )}
        <div className={styles.switch} onClick={() => navigate('/login')}>
          Retour à la connexion
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/auth/ForgotPasswordPage.jsx src/components/auth/ForgotPasswordPage.module.css
rtk git commit -m "feat: add ForgotPasswordPage"
```

---

### Task 3: Create ResetPasswordPage

**Files:**
- Create: `src/components/auth/ResetPasswordPage.jsx`
- Create: `src/components/auth/ResetPasswordPage.module.css`

**Interfaces:**
- Consumes: `confirmReset(oobCode, newPassword)` from `useAuth()`; `oobCode` from `?oobCode=` URL param
- Produces: page at `/reset-password`

- [ ] **Step 1: Create CSS module**

`src/components/auth/ResetPasswordPage.module.css`:

```css
.wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--color-bg); }
.card { width: 100%; max-width: 380px; background: var(--color-surface); border: 1px solid var(--color-border-btn); border-radius: 20px; padding: 32px; display: flex; flex-direction: column; gap: 12px; }
.brand { font-family: var(--font-display); font-weight: 800; font-size: 22px; margin-bottom: 4px; }
.title { font-family: var(--font-display); font-weight: 700; font-size: 20px; margin: 0 0 8px; }
.input { background: var(--color-chip-bg); border: 1px solid var(--color-border-btn); border-radius: 10px; padding: 11px 14px; color: var(--color-text); font-size: 14px; font-family: var(--font-body); outline: none; }
.error { color: var(--color-pink); font-size: 13px; }
.success { color: var(--color-accent); font-size: 13px; }
.button { background: var(--color-accent); color: #fff; font-weight: 600; font-size: 14px; padding: 11px; border: none; border-radius: 10px; cursor: pointer; }
.switch { text-align: center; font-size: 13px; color: var(--color-muted); cursor: pointer; margin-top: 6px; }
```

- [ ] **Step 2: Create ResetPasswordPage component**

`src/components/auth/ResetPasswordPage.jsx`:

```jsx
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import styles from './ResetPasswordPage.module.css'

export default function ResetPasswordPage() {
  const { confirmReset } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const oobCode = searchParams.get('oobCode')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!oobCode) {
      setError("Lien invalide ou expiré. Recommence la procédure.")
      return
    }
    try {
      await confirmReset(oobCode, password)
      setDone(true)
    } catch {
      setError("Impossible de réinitialiser le mot de passe. Le lien est peut-être expiré.")
    }
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.brand}>Jilu</div>
        <h1 className={styles.title}>Nouveau mot de passe</h1>
        {!done ? (
          <>
            <input
              className={styles.input}
              type="password"
              placeholder="Nouveau mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            {error && <div className={styles.error}>{error}</div>}
            <button className={styles.button} type="submit">Réinitialiser</button>
          </>
        ) : (
          <p className={styles.success}>Mot de passe mis à jour ! Tu peux maintenant te connecter.</p>
        )}
        <div className={styles.switch} onClick={() => navigate('/login')}>
          Retour à la connexion
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/auth/ResetPasswordPage.jsx src/components/auth/ResetPasswordPage.module.css
rtk git commit -m "feat: add ResetPasswordPage"
```

---

### Task 4: Wire routes and update LoginPage

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/auth/LoginPage.jsx`

**Interfaces:**
- Consumes: `ForgotPasswordPage`, `ResetPasswordPage` components
- Produces: `/forgot-password` and `/reset-password` public routes; "Mot de passe oublié ?" link on LoginPage

- [ ] **Step 1: Add routes to App.jsx**

In `src/App.jsx`, add imports at top (with existing auth imports):

```jsx
import ForgotPasswordPage from './components/auth/ForgotPasswordPage'
import ResetPasswordPage from './components/auth/ResetPasswordPage'
```

Add two routes alongside `/login` and `/signup` (inside the outer `<Routes>`):

```jsx
<Route path="/forgot-password" element={<ForgotPasswordRoute />} />
<Route path="/reset-password" element={<ResetPasswordPage />} />
```

Add `ForgotPasswordRoute` component (redirects logged-in users, same pattern as `LoginRoute`):

```jsx
function ForgotPasswordRoute() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/library" replace />
  return <ForgotPasswordPage />
}
```

- [ ] **Step 2: Add "Mot de passe oublié ?" link to LoginPage**

In `src/components/auth/LoginPage.jsx`, add `useNavigate` is already imported. Add the link between the password input and the error/button block:

```jsx
// After the password <input>, before {error && ...}
<div className={styles.switch} style={{ textAlign: 'right', marginTop: -4 }} onClick={() => navigate('/forgot-password')}>
  Mot de passe oublié ?
</div>
```

- [ ] **Step 3: Verify build**

```bash
rtk tsc --noEmit 2>&1 | head -30
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
rtk git add src/App.jsx src/components/auth/LoginPage.jsx
rtk git commit -m "feat: wire forgot-password and reset-password routes"
```

---

## Post-Implementation: Firebase Console Config

**Required manual step** (one-time, cannot be automated):

1. Firebase Console → project → Authentication → Templates → "Password Reset"
2. Click "Edit template" (pencil icon)
3. Click "Customize action URL"
4. Set URL to: `https://jilu-app.vercel.app/reset-password`
5. Save

Without this step, Firebase reset links point to Firebase's hosted page instead of the app's `/reset-password` route.
