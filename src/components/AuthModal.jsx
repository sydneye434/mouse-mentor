/**
 * Developed by Sydney Edwards
 * Sign-in / Create account modal. Calls /auth/login or /auth/register; on success invokes onSuccess({ token, email }) and onClose.
 * Shows generic error for failed sign-in to avoid user enumeration.
 */
import { useState } from 'react'
import './AuthModal.css'

export default function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const API_BASE =
    import.meta.env.VITE_API_URL ??
    (import.meta.env.DEV ? '' : 'http://localhost:8000')

  const backendUnavailableMessage =
    "Can't reach the server. Is the backend running? Start it with: cd backend && uvicorn main:app --reload --port 8000"

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.trim()) {
      setError('Email required')
      return
    }
    if (!password) {
      setError('Password required')
      return
    }
    if (mode === 'register' && password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const url =
        mode === 'login'
          ? `${API_BASE}/auth/login`
          : `${API_BASE}/auth/register`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      let data
      try {
        data = await res.json()
      } catch {
        setError(
          res.status === 404
            ? backendUnavailableMessage
            : "Server didn't respond correctly. Is the backend running?"
        )
        return
      }
      if (!res.ok) {
        if (res.status === 404) {
          setError(backendUnavailableMessage)
          return
        }
        const detail = data.detail
        const message = Array.isArray(detail)
          ? detail.map((d) => d.msg || d.message).join(', ')
          : detail ||
            (mode === 'login'
              ? 'Invalid email or password'
              : 'Registration failed')
        const isNotFound =
          typeof message === 'string' &&
          message.toLowerCase().includes('not found')
        const isLogin = mode === 'login'
        setError(
          isNotFound
            ? backendUnavailableMessage
            : isLogin
              ? 'Invalid email or password'
              : message
        )
        return
      }
      onSuccess({ token: data.access_token, email: data.email })
      onClose()
    } catch (err) {
      const isLogin = mode === 'login'
      const isFetchError = err.message?.toLowerCase().includes('fetch')
      setError(
        isFetchError
          ? backendUnavailableMessage
          : isLogin
            ? 'Invalid email or password'
            : err.message || 'Something went wrong'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="auth-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <h2 id="auth-modal-title" className="auth-modal__title">
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </h2>
        <form onSubmit={handleSubmit} className="auth-modal__form">
          <label className="auth-modal__label">
            Email
            <input
              type="email"
              className="auth-modal__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
            />
          </label>
          <label className="auth-modal__label">
            Password
            <input
              type="password"
              className="auth-modal__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
              disabled={loading}
            />
          </label>
          {mode === 'register' && (
            <p className="auth-modal__hint">At least 8 characters</p>
          )}
          {error && (
            <p className="auth-modal__error" role="alert">
              {error}
            </p>
          )}
          <div className="auth-modal__actions">
            <button
              type="submit"
              className="auth-modal__submit"
              disabled={loading}
            >
              {loading
                ? 'Please wait…'
                : mode === 'login'
                  ? 'Sign in'
                  : 'Create account'}
            </button>
            <button
              type="button"
              className="auth-modal__cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
        <p className="auth-modal__toggle">
          {mode === 'login'
            ? "Don't have an account? "
            : 'Already have an account? '}
          <button
            type="button"
            className="auth-modal__toggle-btn"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setError('')
            }}
          >
            {mode === 'login' ? 'Register' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
