/**
 * Public read-only view for /trip/:shareId (no login).
 * Developed by Sydney Edwards.
 */
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import TripSummary from './TripSummary.jsx'
import ItineraryPage from './ItineraryPage.jsx'
import { tripFromApi } from '../tripFromApi.js'

const API_BASE =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? '' : 'http://localhost:8000')

export default function SharedTripPage() {
  const { shareId } = useParams()
  const [tripInfo, setTripInfo] = useState(null)
  const [itinerary, setItinerary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      setTripInfo(null)
      setItinerary(null)
      try {
        const res = await fetch(
          `${API_BASE}/public/trip/${encodeURIComponent(shareId ?? '')}`
        )
        if (!res.ok) {
          if (res.status === 404) {
            setError(
              'This trip link is invalid or no longer available.'
            )
          } else {
            setError('Could not load this trip.')
          }
          return
        }
        const data = await res.json()
        if (cancelled) return
        setTripInfo(tripFromApi(data.trip))
        setItinerary(data.generated_itinerary ?? null)
      } catch {
        if (!cancelled) setError('Could not load this trip.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (shareId) void load()
    else {
      setError('Invalid link.')
      setLoading(false)
    }
    return () => {
      cancelled = true
    }
  }, [shareId])

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-12 pt-6">
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-lilac-strong)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Mouse Mentor home
        </Link>
      </div>

      <header className="mb-6">
        <p className="m-0 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Shared trip · read-only
        </p>
      </header>

      {loading && (
        <div className="flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-8 text-[var(--color-text-muted)]">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--color-lilac-strong)]" />
          <p className="m-0 text-center text-sm font-medium">Loading trip…</p>
        </div>
      )}

      {error && !loading && (
        <div
          className="rounded-[var(--radius-card)] border border-[var(--color-pink-mid)] bg-[var(--color-error-bg)] px-4 py-3 text-sm text-[var(--color-error-text)]"
          role="alert"
        >
          {error}
        </div>
      )}

      {!loading && !error && tripInfo && (
        <>
          <TripSummary trip={tripInfo} summaryTitle="Trip" />
          <ItineraryPage
            readOnly
            hideBackLink
            user={null}
            tripInfo={tripInfo}
            itinerary={itinerary}
            loading={false}
            error={null}
            exporting={false}
            onExportPdf={() => {}}
            onUnlockPro={() => {}}
          />
        </>
      )}
    </div>
  )
}
