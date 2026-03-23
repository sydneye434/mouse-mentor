/**
 * Dining availability alerts: AI time windows + background polling (backend).
 * Developed by Sydney Edwards.
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  Loader2,
  Plus,
  Search,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react'
import { WDW_DINING_RESTAURANTS } from '../data/diningAlertRestaurants.js'
import { toTripInfoPayload } from '../tripInfo.js'

const TOTAL_STEPS = 3

function defaultPartySize(trip) {
  if (!trip) return 2
  const a = trip.numberOfAdults ?? 1
  const c = trip.numberOfChildren ?? 0
  return Math.max(1, a + c)
}

export default function DiningAlerts({ tripInfo, user, apiBase, onOpenAuth }) {
  const [step, setStep] = useState(1)
  const [search, setSearch] = useState('')
  const [restaurant, setRestaurant] = useState(null)
  const [date, setDate] = useState('')
  const [partySize, setPartySize] = useState(2)

  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [selectedWindows, setSelectedWindows] = useState(() => new Set())
  const [customWindowText, setCustomWindowText] = useState('')
  const [customWindows, setCustomWindows] = useState([])

  const [activateLoading, setActivateLoading] = useState(false)
  const [wizardError, setWizardError] = useState(null)
  const [showSuccessBanner, setShowSuccessBanner] = useState(false)

  const [alerts, setAlerts] = useState([])
  const [alertsLoading, setAlertsLoading] = useState(false)

  const { minDate, maxDate } = useMemo(() => {
    const a = tripInfo?.arrivalDate || ''
    const d = tripInfo?.departureDate || ''
    return { minDate: a || undefined, maxDate: d || undefined }
  }, [tripInfo?.arrivalDate, tripInfo?.departureDate])

  useEffect(() => {
    if (tripInfo) setPartySize(defaultPartySize(tripInfo))
  }, [tripInfo])

  useEffect(() => {
    if (tripInfo?.arrivalDate && !date) setDate(tripInfo.arrivalDate)
  }, [tripInfo?.arrivalDate, date])

  const filteredRestaurants = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return WDW_DINING_RESTAURANTS
    return WDW_DINING_RESTAURANTS.filter((r) =>
      r.name.toLowerCase().includes(q)
    )
  }, [search])

  const progressPct = (step / TOTAL_STEPS) * 100

  const loadAlerts = useCallback(async () => {
    if (!user?.token) return
    setAlertsLoading(true)
    try {
      const res = await fetch(`${apiBase}/dining/alerts`, {
        headers: { Authorization: `Bearer ${user.token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      setAlerts(data.alerts || [])
    } catch {
      /* ignore */
    } finally {
      setAlertsLoading(false)
    }
  }, [user?.token, apiBase])

  useEffect(() => {
    void loadAlerts()
  }, [loadAlerts])

  async function runSuggestTimes() {
    if (!restaurant || !date || !tripInfo) return
    setSuggestLoading(true)
    setWizardError(null)
    try {
      const res = await fetch(`${apiBase}/dining/suggest-times`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant: restaurant.name,
          date,
          trip_info: toTripInfoPayload(tripInfo),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          typeof err.detail === 'string'
            ? err.detail
            : 'Could not load suggestions'
        )
      }
      const data = await res.json()
      const list = data.suggestions || []
      setSuggestions(list)
      const first = list[0]?.time_window
      setSelectedWindows(first ? new Set([first]) : new Set())
    } catch (e) {
      setWizardError(e.message || 'Something went wrong.')
      setSuggestions([])
      setSelectedWindows(new Set())
    } finally {
      setSuggestLoading(false)
    }
  }

  function toggleWindow(w) {
    setSelectedWindows((prev) => {
      const next = new Set(prev)
      if (next.has(w)) next.delete(w)
      else next.add(w)
      return next
    })
  }

  function addCustomWindow() {
    const t = customWindowText.trim()
    if (!t) return
    setCustomWindows((prev) => [...prev, t])
    setSelectedWindows((prev) => new Set([...prev, t]))
    setCustomWindowText('')
  }

  const allSelectedList = useMemo(() => {
    return [...selectedWindows]
  }, [selectedWindows])

  async function activateAlert() {
    if (!user?.token || !restaurant || !date || allSelectedList.length === 0)
      return
    setActivateLoading(true)
    setWizardError(null)
    try {
      const res = await fetch(`${apiBase}/dining/alerts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant: restaurant.name,
          restaurant_slug: restaurant.slug,
          date,
          party_size: partySize,
          time_windows: allSelectedList,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          typeof err.detail === 'string' ? err.detail : 'Could not create alert'
        )
      }
      setShowSuccessBanner(true)
      setStep(1)
      setRestaurant(null)
      setSuggestions([])
      setSelectedWindows(new Set())
      setCustomWindows([])
      setCustomWindowText('')
      void loadAlerts()
      setTimeout(() => setShowSuccessBanner(false), 8000)
    } catch (e) {
      setWizardError(e.message || 'Could not activate alert.')
    } finally {
      setActivateLoading(false)
    }
  }

  async function cancelAlert(id) {
    if (!user?.token) return
    try {
      const res = await fetch(`${apiBase}/dining/alerts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      })
      if (res.ok) void loadAlerts()
    } catch {
      /* ignore */
    }
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 pb-12 pt-6">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-lilac-strong)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </Link>
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-8 text-center">
          <Bell className="mx-auto mb-4 h-12 w-12 text-[var(--color-lilac-strong)]" />
          <h1 className="font-display text-xl font-semibold text-[var(--color-text-heading)]">
            Sign in for dining alerts
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Save your trip and sign in to set availability alerts—we&apos;ll
            email you when a table opens.
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="mt-6 rounded-[var(--radius-pill)] bg-[var(--color-pink-mid)] px-6 py-2.5 text-sm font-semibold text-[var(--color-text-on-primary)] hover:bg-[var(--color-pink-strong)]"
          >
            Sign in
          </button>
        </div>
      </div>
    )
  }

  if (!tripInfo?.arrivalDate || !tripInfo?.departureDate) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 pb-12 pt-6">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-lilac-strong)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </Link>
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-8 text-center">
          <UtensilsCrossed className="mx-auto mb-4 h-12 w-12 text-[var(--color-lilac-strong)]" />
          <h1 className="font-display text-xl font-semibold text-[var(--color-text-heading)]">
            Add your trip dates first
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Dining alerts use your travel window from the trip planner.
          </p>
          <Link
            to="/"
            className="mt-6 inline-block rounded-[var(--radius-pill)] border border-[var(--color-lilac-strong)] px-6 py-2.5 text-sm font-semibold text-[var(--color-lilac-strong)] hover:bg-[var(--color-lilac-light)]"
          >
            Go to hub
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 pb-12 pt-4">
      <div className="mb-6 flex items-center justify-between gap-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-lilac-strong)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Hub
        </Link>
        <Link
          to="/dining"
          className="text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-lilac-strong)]"
        >
          Dining picks
        </Link>
      </div>

      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[var(--color-text-heading)]">
          Dining Alerts
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          We&apos;ll watch Disney&apos;s booking flow and email you if a slot
          appears in your chosen windows.
        </p>
      </header>

      {showSuccessBanner && (
        <div
          className="mb-6 rounded-[var(--radius-card)] border border-[var(--color-pink-mid)]/50 bg-[var(--color-pink-light)] px-4 py-3 text-sm text-[var(--color-text-heading)] shadow-sm"
          role="status"
        >
          We&apos;ll email you the moment a table opens.
        </div>
      )}

      {/* Wizard */}
      <section
        className="mb-10 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 shadow-sm"
        aria-labelledby="dining-alerts-wizard-heading"
      >
        <h2
          id="dining-alerts-wizard-heading"
          className="font-display text-lg font-semibold text-[var(--color-text-heading)]"
        >
          Set a new alert
        </h2>

        <div className="mb-4 mt-4">
          <div
            className="mb-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={TOTAL_STEPS}
            aria-label={`Wizard step ${step} of ${TOTAL_STEPS}`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--color-pink-mid)] to-[var(--color-lilac-mid)] transition-[width] duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-center text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            Step {step} of {TOTAL_STEPS}
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text-heading)]">
                Restaurant
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search 30 top WDW locations…"
                  className="w-full rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-bg-page)] py-2.5 pl-9 pr-3 text-sm"
                />
              </div>
              <ul className="mt-2 max-h-48 overflow-y-auto rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-bg-page)]">
                {filteredRestaurants.map((r) => (
                  <li key={r.slug}>
                    <button
                      type="button"
                      onClick={() => {
                        setRestaurant(r)
                        setSearch(r.name)
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-lilac-light)] ${
                        restaurant?.slug === r.slug
                          ? 'bg-[var(--color-lilac-light)] font-semibold text-[var(--color-lilac-strong)]'
                          : 'text-[var(--color-text-body)]'
                      }`}
                    >
                      {r.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <label
                htmlFor="alert-date"
                className="mb-1 block text-sm font-medium text-[var(--color-text-heading)]"
              >
                Date (within your trip)
              </label>
              <input
                id="alert-date"
                type="date"
                min={minDate}
                max={maxDate}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="alert-party"
                className="mb-1 block text-sm font-medium text-[var(--color-text-heading)]"
              >
                Party size
              </label>
              <input
                id="alert-party"
                type="number"
                min={1}
                max={20}
                value={partySize}
                onChange={(e) =>
                  setPartySize(
                    Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1))
                  )
                }
                className="w-full rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              disabled={!restaurant || !date}
              onClick={() => setStep(2)}
              className="w-full rounded-[var(--radius-pill)] bg-[var(--color-pink-mid)] py-2.5 text-sm font-semibold text-[var(--color-text-on-primary)] hover:bg-[var(--color-pink-strong)] disabled:opacity-50"
            >
              Next: time windows
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-text-muted)]">
              {restaurant?.name} · {date} · party of {partySize}
            </p>
            <button
              type="button"
              onClick={() => void runSuggestTimes()}
              disabled={suggestLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-[var(--color-lilac-strong)] bg-[var(--color-bg-page)] py-2.5 text-sm font-semibold text-[var(--color-lilac-strong)] hover:bg-[var(--color-lilac-light)] disabled:opacity-60"
            >
              {suggestLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Checking your itinerary for the best windows…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" aria-hidden />
                  Find best times
                </>
              )}
            </button>

            {wizardError && step === 2 && (
              <p className="text-sm text-[var(--color-error-text)]">
                {wizardError}
              </p>
            )}

            {suggestions.length > 0 && (
              <ul className="space-y-3">
                {suggestions.map((s, i) => (
                  <li
                    key={`${s.time_window}-${i}`}
                    className="rounded-[var(--radius-input)] border border-[var(--color-border)] border-l-4 border-l-[var(--color-lilac-mid)] bg-[var(--color-bg-surface-lilac)] p-4"
                  >
                    <label className="flex cursor-pointer gap-3">
                      <input
                        type="checkbox"
                        checked={selectedWindows.has(s.time_window)}
                        onChange={() => toggleWindow(s.time_window)}
                        className="mt-1 h-4 w-4 rounded border-[var(--color-border)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="font-semibold text-[var(--color-text-heading)]">
                          {s.time_window}
                        </span>
                        <span className="ml-2 text-xs uppercase text-[var(--color-text-muted)]">
                          {s.confidence}
                        </span>
                        <p className="mt-1 text-sm text-[var(--color-text-body)]">
                          {s.reason}
                        </p>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-[var(--color-border)] pt-4">
              <p className="mb-2 text-sm font-medium text-[var(--color-text-heading)]">
                Add your own window
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customWindowText}
                  onChange={(e) => setCustomWindowText(e.target.value)}
                  placeholder="e.g. 5:00 PM – 6:00 PM"
                  className="min-w-0 flex-1 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={addCustomWindow}
                  className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-pill)] border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-text-heading)] hover:bg-[var(--color-lilac-light)]"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Add
                </button>
              </div>
              {customWindows.length > 0 && (
                <ul className="mt-2 space-y-2">
                  {customWindows.map((cw, i) => (
                    <li
                      key={`${cw}-${i}`}
                      className="flex items-center justify-between rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm"
                    >
                      <label className="flex flex-1 cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedWindows.has(cw)}
                          onChange={() => toggleWindow(cw)}
                          className="h-4 w-4 rounded"
                        />
                        {cw}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 rounded-[var(--radius-pill)] border border-[var(--color-border)] py-2.5 text-sm font-semibold text-[var(--color-text-heading)] hover:bg-[var(--color-lilac-light)]"
              >
                Back
              </button>
              <button
                type="button"
                disabled={allSelectedList.length === 0}
                onClick={() => setStep(3)}
                className="flex-1 rounded-[var(--radius-pill)] bg-[var(--color-pink-mid)] py-2.5 text-sm font-semibold text-[var(--color-text-on-primary)] hover:bg-[var(--color-pink-strong)] disabled:opacity-50"
              >
                Review
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface-lilac)] p-4">
              <p className="text-sm font-semibold text-[var(--color-text-heading)]">
                {restaurant?.name}
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {date} · Party of {partySize}
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--color-text-body)]">
                {allSelectedList.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
            {wizardError && step === 3 && (
              <p className="text-sm text-[var(--color-error-text)]">
                {wizardError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 rounded-[var(--radius-pill)] border border-[var(--color-border)] py-2.5 text-sm font-semibold hover:bg-[var(--color-lilac-light)]"
              >
                Back
              </button>
              <button
                type="button"
                disabled={activateLoading}
                onClick={() => void activateAlert()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-pink-mid)] py-2.5 text-sm font-semibold text-[var(--color-text-on-primary)] hover:bg-[var(--color-pink-strong)] disabled:opacity-60"
              >
                {activateLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Check className="h-4 w-4" aria-hidden />
                )}
                Activate Alert
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Active alerts */}
      <section aria-labelledby="active-alerts-heading">
        <h2
          id="active-alerts-heading"
          className="mb-3 font-display text-lg font-semibold text-[var(--color-text-heading)]"
        >
          Your active alerts
        </h2>
        {alertsLoading ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            Loading alerts…
          </p>
        ) : alerts.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-surface)] px-6 py-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-lilac-light)] text-[var(--color-lilac-strong)]">
              <BellOff className="h-8 w-8" strokeWidth={1.5} aria-hidden />
            </div>
            <p className="text-sm font-medium text-[var(--color-text-heading)]">
              No alerts yet
            </p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Set your restaurant, date, and times above—we&apos;ll take it from
              there.
            </p>
            <button
              type="button"
              onClick={() => {
                setStep(1)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="mt-5 rounded-[var(--radius-pill)] border border-[var(--color-pink-mid)] px-5 py-2 text-sm font-semibold text-[var(--color-pink-mid)] hover:bg-[var(--color-pink-light)]"
            >
              Create your first alert
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {alerts.map((a) => (
              <li
                key={a.id}
                className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--color-text-heading)]">
                      {a.restaurant}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {a.date} · Party of {a.party_size}
                    </p>
                    <ul className="mt-2 list-disc pl-4 text-sm text-[var(--color-text-body)]">
                      {(a.time_windows || []).map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => void cancelAlert(a.id)}
                    className="shrink-0 rounded-full border border-[var(--color-border)] px-2 py-1 text-xs font-semibold text-[var(--color-text-muted)] hover:border-[var(--color-pink-mid)] hover:text-[var(--color-pink-mid)]"
                  >
                    Cancel alert
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
