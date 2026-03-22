/**
 * Developed by Sydney Edwards
 * Dedicated /itinerary route: visual timeline from structured LLM JSON (not chat).
 */
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  Footprints,
  Loader2,
  Lock,
  MapPin,
  Sun,
  Sunset,
  Moon,
  FileDown,
} from 'lucide-react'

const PERIOD_META = {
  morning: {
    label: 'Morning',
    Icon: Sun,
    className: 'bg-amber-100/90 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
  },
  afternoon: {
    label: 'Afternoon',
    Icon: Sunset,
    className: 'bg-sky-100/90 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100',
  },
  evening: {
    label: 'Evening',
    Icon: Moon,
    className: 'bg-indigo-100/90 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100',
  },
}

function PeriodIcon({ period }) {
  const meta = PERIOD_META[period] ?? PERIOD_META.morning
  const I = meta.Icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}
    >
      <I className="h-3.5 w-3.5" aria-hidden />
      {meta.label}
    </span>
  )
}

export default function ItineraryPage({
  user,
  tripInfo,
  itinerary,
  loading,
  error,
  exporting,
  onExportPdf,
  onUnlockPro,
  readOnly = false,
  hideBackLink = false,
}) {
  /** Shared / public view shows full timeline without Pro gate */
  const isPro = readOnly || !!user?.is_pro
  const days = itinerary?.days ?? []
  const summary = itinerary?.summary ?? ''

  return (
    <div className="relative mx-auto w-full max-w-2xl flex-1 px-4 pb-12 pt-4">
      {(!readOnly || !hideBackLink) && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-lilac-strong)] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {readOnly ? 'Plan your trip' : 'Back to hub'}
          </Link>
          {!readOnly && isPro && days.length > 0 && (
            <button
              type="button"
              onClick={onExportPdf}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text-heading)] shadow-sm hover:bg-[var(--color-lilac-light)] disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <FileDown className="h-4 w-4" aria-hidden />
              )}
              Export PDF
            </button>
          )}
        </div>
      )}

      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold text-[var(--color-text-heading)]">
          {readOnly ? 'Trip itinerary' : 'Your itinerary'}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {readOnly
            ? 'Read-only view—shared by the trip owner. No sign-in required.'
            : 'Day-by-day plan built from your trip details—rides, waits, and walking tips in a simple timeline.'}
        </p>
        {tripInfo?.arrivalDate && tripInfo?.departureDate && (
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            {tripInfo.arrivalDate} → {tripInfo.departureDate}
          </p>
        )}
      </header>

      {loading && (
        <div className="flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-8 text-[var(--color-text-muted)]">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--color-lilac-strong)]" />
          <p className="m-0 text-center text-sm font-medium">
            Generating your personalized plan…
          </p>
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

      {!loading && !error && days.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)]">
          No itinerary yet. Complete the trip planner to generate your plan.
        </p>
      )}

      {!loading && summary && (
        <section className="mb-8 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface-lilac)] p-5">
          <h2 className="font-display text-lg font-semibold text-[var(--color-text-heading)]">
            Overview
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-body)]">
            {summary}
          </p>
        </section>
      )}

      {!loading && days.length > 0 && (
        <div className="relative">
          {/* vertical timeline line */}
          <div
            className="absolute bottom-0 left-[1.125rem] top-2 w-px bg-[var(--color-border-strong)] md:left-[1.25rem]"
            aria-hidden
          />

          <ol className="relative m-0 list-none space-y-10 p-0">
            {days.map((day, di) => (
              <li key={`${day.date}-${di}`} className="relative pl-10 md:pl-12">
                <span
                  className="absolute left-0 top-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--color-lilac-strong)] bg-[var(--color-bg-page)] text-[var(--color-lilac-strong)] shadow-sm md:h-10 md:w-10"
                  aria-hidden
                >
                  <MapPin className="h-4 w-4 md:h-5 md:w-5" />
                </span>

                <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 shadow-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-display text-xl font-semibold text-[var(--color-text-heading)]">
                      {day.date || `Day ${di + 1}`}
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-mint-light)] px-3 py-1 text-xs font-semibold text-[var(--color-mint-strong)]">
                      <MapPin className="h-3.5 w-3.5" aria-hidden />
                      {day.park_name || 'Park'}
                    </span>
                  </div>

                  <div className="mt-5 space-y-6">
                    {(day.blocks ?? []).map((block, bi) => (
                      <div
                        key={`${block.period}-${bi}`}
                        className="border-t border-[var(--color-border)] pt-4 first:border-t-0 first:pt-0"
                      >
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <PeriodIcon period={block.period} />
                        </div>
                        <ul className="m-0 list-none space-y-4 p-0">
                          {(block.items ?? []).map((item, ii) => (
                            <li
                              key={`${item.name}-${ii}`}
                              className="rounded-[var(--radius-input)] border border-[var(--color-border)]/80 bg-[var(--color-bg-page)] px-4 py-3"
                            >
                              <p className="m-0 font-semibold text-[var(--color-text-heading)]">
                                {item.name}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" aria-hidden />
                                  ~{item.estimated_wait_minutes ?? '—'} min wait
                                </span>
                              </div>
                              {item.walking_tip ? (
                                <p className="mt-2 flex gap-2 text-sm leading-relaxed text-[var(--color-text-body)]">
                                  <Footprints
                                    className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-sky-strong)]"
                                    aria-hidden
                                  />
                                  <span>{item.walking_tip}</span>
                                </p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ol>

          {!readOnly && !isPro && (
            <div
              className="pointer-events-auto absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-[var(--radius-card)] bg-[var(--color-bg-surface)]/75 px-6 py-12 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="itin-lock-title"
            >
              <Lock
                className="h-12 w-12 text-[var(--color-lilac-strong)]"
                aria-hidden
              />
              <h2
                id="itin-lock-title"
                className="max-w-sm text-center font-display text-xl font-semibold text-[var(--color-text-heading)]"
              >
                Unlock your full timeline
              </h2>
              <p className="max-w-sm text-center text-sm text-[var(--color-text-muted)]">
                Upgrade to Mouse Mentor Pro to view your complete day-by-day
                plan and export it as a PDF.
              </p>
              <button
                type="button"
                onClick={onUnlockPro}
                className="rounded-[var(--radius-pill)] bg-[var(--color-pink-mid)] px-6 py-2.5 text-sm font-semibold text-[var(--color-text-on-primary)] hover:bg-[var(--color-pink-strong)]"
              >
                Unlock Pro
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
