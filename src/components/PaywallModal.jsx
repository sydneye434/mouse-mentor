/**
 * Pro upgrade modal: Stripe Checkout (test mode) for one-time $12 unlock.
 * Developed by Sydney Edwards.
 */
import { useState } from 'react'
import './PaywallModal.css'

const FEATURE_COPY = {
  export: {
    title: 'Export your itinerary',
    body: 'Download a polished PDF itinerary from your chat—perfect for sharing or printing before you go.',
  },
  'multi-day': {
    title: 'Multi-day park plan',
    body: 'Unlock deeper planning: structured day-by-day suggestions and priority prompts tailored to your trip.',
  },
  default: {
    title: 'Unlock Mouse Mentor Pro',
    body: 'Get the full planning experience with exports and premium planning tools.',
  },
}

export default function PaywallModal({
  feature = 'default',
  onClose,
  onStartedCheckout,
  user,
}) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const copy = FEATURE_COPY[feature] ?? FEATURE_COPY.default

  const API_BASE =
    import.meta.env.VITE_API_URL ??
    (import.meta.env.DEV ? '' : 'http://localhost:8000')

  async function handleUnlock() {
    setError('')
    if (!user?.token) {
      setError('Sign in first to upgrade.')
      return
    }
    setLoading(true)
    try {
      const origin = window.location.origin
      const path = window.location.pathname || '/'
      const res = await fetch(`${API_BASE}/billing/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          success_url: `${origin}${path}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}${path}?checkout=cancel`,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const d = data.detail
        setError(
          typeof d === 'string'
            ? d
            : 'Could not start checkout. Is Stripe configured on the server?'
        )
        return
      }
      if (data.url) {
        if (onStartedCheckout) onStartedCheckout()
        window.location.href = data.url
        return
      }
      setError('No checkout URL returned.')
    } catch (e) {
      setError(e.message || 'Network error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="paywall-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-modal-title"
    >
      <div className="paywall-modal" onClick={(e) => e.stopPropagation()}>
        <h2 id="paywall-modal-title" className="paywall-modal__title">
          {copy.title}
        </h2>
        <p className="paywall-modal__lede">{copy.body}</p>
        <ul className="paywall-modal__list">
          <li>PDF itinerary export from your conversation</li>
          <li>Multi-day &amp; structured planning prompts</li>
          <li>One-time payment — no subscription</li>
        </ul>
        <div className="paywall-modal__price">
          <span className="paywall-modal__amount">$12</span>
          <span className="paywall-modal__once">one-time</span>
        </div>
        {error && (
          <p className="paywall-modal__error" role="alert">
            {error}
          </p>
        )}
        <div className="paywall-modal__actions">
          <button
            type="button"
            className="paywall-modal__primary"
            onClick={handleUnlock}
            disabled={loading}
          >
            {loading ? 'Redirecting…' : 'Unlock Pro'}
          </button>
          <button
            type="button"
            className="paywall-modal__secondary"
            onClick={onClose}
            disabled={loading}
          >
            Not now
          </button>
        </div>
        <p className="paywall-modal__hint">
          Secure payment via Stripe (test mode in development). Your account is
          upgraded immediately after payment.
        </p>
      </div>
    </div>
  )
}
