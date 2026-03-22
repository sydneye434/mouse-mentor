/**
 * Pro upgrade modal: Stripe Checkout (test mode) for one-time $12 unlock.
 * Developed by Sydney Edwards.
 */
import { useState } from 'react'
import { Button } from '../ui'

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
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-[var(--color-backdrop)] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-modal-title"
    >
      <div
        className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-5 py-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="paywall-modal-title"
          className="mb-3 font-display text-xl font-bold text-[var(--color-text-heading)]"
        >
          {copy.title}
        </h2>
        <p className="mb-4 text-[0.95rem] leading-relaxed text-[var(--color-text-muted)]">
          {copy.body}
        </p>
        <ul className="mb-5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-[var(--color-text-body)]">
          <li>PDF itinerary export from your conversation</li>
          <li>Multi-day &amp; structured planning prompts</li>
          <li>One-time payment — no subscription</li>
        </ul>
        <div className="mb-4 flex flex-wrap items-baseline gap-2 rounded-[var(--radius-input)] border border-[var(--color-sky-border)] bg-[var(--color-sky-light)] px-4 py-3">
          <span className="text-3xl font-bold text-[var(--color-sky-strong)]">
            $12
          </span>
          <span className="text-sm font-semibold text-[var(--color-text-muted)]">
            one-time
          </span>
        </div>
        {error && (
          <p
            className="mb-3 rounded-[var(--radius-input)] bg-[var(--color-error-bg)] px-3 py-2 text-sm text-[var(--color-error-text)]"
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Button type="button" onClick={handleUnlock} disabled={loading}>
            {loading ? 'Redirecting…' : 'Unlock Pro'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Not now
          </Button>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-[var(--color-text-muted)]">
          Secure payment via Stripe (test mode in development). Your account is
          upgraded immediately after payment.
        </p>
      </div>
    </div>
  )
}
