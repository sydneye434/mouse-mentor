/**
 * Developed by Sydney Edwards
 * /lightning-lane-guide — structured AI guide (not chat): LL products + personalized booking order.
 */
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  AlarmClock,
  BookOpen,
  ChevronRight,
  Loader2,
  RefreshCw,
  Sparkles,
  Sun,
  Zap,
} from 'lucide-react'

function ExplainerCard({ title, plainLanguage, bestFor }) {
  return (
    <article className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 shadow-sm">
      <h3 className="font-display text-lg font-semibold text-[var(--color-text-heading)]">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-body)]">
        {plainLanguage}
      </p>
      {bestFor ? (
        <p className="mt-3 rounded-[var(--radius-input)] bg-[var(--color-lilac-light)] px-3 py-2 text-sm text-[var(--color-text-heading)]">
          <span className="font-semibold text-[var(--color-lilac-strong)]">
            Best for:{' '}
          </span>
          {bestFor}
        </p>
      ) : null}
    </article>
  )
}

export default function LightningLaneGuidePage({
  tripInfo,
  guide,
  loading,
  error,
  onRefresh,
  onRequestGenerate,
}) {
  const ex = guide?.explainer ?? {}
  const days = guide?.days ?? []

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-12 pt-4">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-lilac-strong)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to hub
        </Link>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || !tripInfo}
          className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text-heading)] hover:bg-[var(--color-lilac-light)] disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            aria-hidden
          />
          Regenerate
        </button>
      </div>

      <header className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[var(--color-pink-light)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-pink-strong)]">
          <Zap className="h-3.5 w-3.5" aria-hidden />
          Structured guide
        </div>
        <h1 className="font-display text-3xl font-bold text-[var(--color-text-heading)]">
          Lightning Lane Guide
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Multi Pass, Single Pass, and Individual Lightning Lane—explained in
          plain language, then tailored to your group and thrill tolerance.
        </p>
      </header>

      {!tripInfo?.arrivalDate && (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 text-center">
          <p className="m-0 text-sm text-[var(--color-text-muted)]">
            Complete the trip planner with your dates and party so we can build
            your guide.
          </p>
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">
            <Link
              to="/"
              className="font-semibold text-[var(--color-lilac-strong)]"
            >
              Return home
            </Link>{' '}
            and tap <strong>Plan your trip</strong>.
          </p>
        </div>
      )}

      {tripInfo?.arrivalDate &&
        tripInfo?.departureDate &&
        !guide &&
        !loading &&
        !error && (
          <div className="mb-6 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 text-center">
            <p className="m-0 text-sm text-[var(--color-text-muted)]">
              Ready to generate your personalized Lightning Lane plan.
            </p>
            <button
              type="button"
              onClick={onRequestGenerate}
              className="mt-4 rounded-[var(--radius-pill)] bg-[var(--color-pink-mid)] px-6 py-2.5 text-sm font-semibold text-[var(--color-text-on-primary)] hover:bg-[var(--color-pink-strong)]"
            >
              Generate guide
            </button>
          </div>
        )}

      {loading && (
        <div className="flex min-h-[10rem] flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-8">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--color-lilac-strong)]" />
          <p className="m-0 text-center text-sm font-medium text-[var(--color-text-muted)]">
            Building your personalized Lightning Lane guide…
          </p>
        </div>
      )}

      {error && !loading && (
        <div
          className="mb-6 rounded-[var(--radius-card)] border border-[var(--color-pink-mid)] bg-[var(--color-error-bg)] px-4 py-3 text-sm text-[var(--color-error-text)]"
          role="alert"
        >
          {error}
        </div>
      )}

      {!loading && guide && (
        <>
          {guide.intro ? (
            <p className="mb-8 text-base leading-relaxed text-[var(--color-text-body)]">
              {guide.intro}
            </p>
          ) : null}

          <section className="mb-10" aria-labelledby="ll-explainer-heading">
            <h2
              id="ll-explainer-heading"
              className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-[var(--color-text-heading)]"
            >
              <BookOpen
                className="h-6 w-6 text-[var(--color-lilac-strong)]"
                aria-hidden
              />
              How the systems work
            </h2>
            <div className="grid gap-4 md:grid-cols-1">
              <ExplainerCard
                title={
                  ex.lightning_lane_multi_pass?.title ??
                  'Lightning Lane Multi Pass'
                }
                plainLanguage={
                  ex.lightning_lane_multi_pass?.plain_language ?? ''
                }
                bestFor={ex.lightning_lane_multi_pass?.best_for}
              />
              <ExplainerCard
                title={
                  ex.lightning_lane_single_pass?.title ??
                  'Lightning Lane Single Pass'
                }
                plainLanguage={
                  ex.lightning_lane_single_pass?.plain_language ?? ''
                }
                bestFor={ex.lightning_lane_single_pass?.best_for}
              />
              <ExplainerCard
                title={
                  ex.individual_lightning_lane?.title ??
                  'Individual Lightning Lane'
                }
                plainLanguage={
                  ex.individual_lightning_lane?.plain_language ?? ''
                }
                bestFor={ex.individual_lightning_lane?.best_for}
              />
            </div>
            {guide.how_they_work_together ? (
              <p className="mt-6 rounded-[var(--radius-input)] border border-[var(--color-sky-border)] bg-[var(--color-sky-light)] px-4 py-3 text-sm leading-relaxed text-[var(--color-text-body)]">
                <span className="font-semibold text-[var(--color-sky-strong)]">
                  Together:{' '}
                </span>
                {guide.how_they_work_together}
              </p>
            ) : null}
          </section>

          {guide.personalized_for_your_party ? (
            <section
              className="mb-10 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface-lilac)] p-5"
              aria-labelledby="ll-party-heading"
            >
              <h2
                id="ll-party-heading"
                className="flex items-center gap-2 font-display text-lg font-semibold text-[var(--color-text-heading)]"
              >
                <Sparkles
                  className="h-5 w-5 text-[var(--color-lilac-strong)]"
                  aria-hidden
                />
                For your party
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-body)]">
                {guide.personalized_for_your_party}
              </p>
            </section>
          ) : null}

          <section aria-labelledby="ll-days-heading">
            <h2
              id="ll-days-heading"
              className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-[var(--color-text-heading)]"
            >
              <Sun
                className="h-6 w-6 text-[var(--color-lilac-strong)]"
                aria-hidden
              />
              By day: what to book & when to wake up
            </h2>
            <ol className="m-0 list-none space-y-8 p-0">
              {days.map((day, di) => (
                <li
                  key={`${day.date}-${di}`}
                  className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--color-border)] pb-3">
                    <h3 className="font-display text-lg font-semibold text-[var(--color-text-heading)]">
                      {day.date || `Day ${di + 1}`}
                    </h3>
                    <span className="text-sm font-medium text-[var(--color-text-muted)]">
                      {day.park_name}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-4">
                    <div className="flex min-w-[200px] flex-1 items-start gap-2 rounded-[var(--radius-input)] bg-[var(--color-mint-light)]/50 px-3 py-2">
                      <AlarmClock
                        className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-mint-strong)]"
                        aria-hidden
                      />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-mint-strong)]">
                          Wake up
                        </p>
                        <p className="text-base font-bold text-[var(--color-text-heading)]">
                          {day.wake_up_time || '—'}
                        </p>
                        {day.wake_up_why ? (
                          <p className="mt-1 text-sm text-[var(--color-text-body)]">
                            {day.wake_up_why}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {day.first_booking_window_tip ? (
                      <div className="min-w-[200px] flex-1 rounded-[var(--radius-input)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-body)]">
                        <span className="font-semibold text-[var(--color-text-heading)]">
                          Booking windows:{' '}
                        </span>
                        {day.first_booking_window_tip}
                      </div>
                    ) : null}
                  </div>

                  <h4 className="mt-5 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    Order to book / prioritize
                  </h4>
                  <ol className="mt-3 space-y-3">
                    {(day.booking_priority_order ?? []).map((row, ri) => (
                      <li
                        key={`${row.order}-${ri}`}
                        className="flex gap-3 rounded-[var(--radius-input)] border border-[var(--color-border)]/80 bg-[var(--color-bg-page)] px-3 py-3"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-lilac-strong)] text-sm font-bold text-white">
                          {row.order ?? ri + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-[var(--color-text-heading)]">
                              {row.attraction}
                            </span>
                            <span className="rounded-full bg-[var(--color-lilac-light)] px-2 py-0.5 text-xs font-medium text-[var(--color-lilac-strong)]">
                              {row.use_ll_type?.replace(/_/g, ' ') ??
                                'multi pass'}
                            </span>
                          </div>
                          {row.why_this_order ? (
                            <p className="mt-1 text-sm text-[var(--color-text-body)]">
                              {row.why_this_order}
                            </p>
                          ) : null}
                          {row.thrill_rationale ? (
                            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                              <span className="font-medium text-[var(--color-text-heading)]">
                                Thrill fit:{' '}
                              </span>
                              {row.thrill_rationale}
                            </p>
                          ) : null}
                        </div>
                        <ChevronRight
                          className="h-5 w-5 shrink-0 text-[var(--color-text-muted)]"
                          aria-hidden
                        />
                      </li>
                    ))}
                  </ol>

                  {(day.rides_to_skip_ll_for ?? []).length > 0 && (
                    <div className="mt-4 rounded-[var(--radius-input)] bg-[var(--color-bg-page)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
                      <span className="font-semibold text-[var(--color-text-heading)]">
                        Often skip LL for:{' '}
                      </span>
                      {(day.rides_to_skip_ll_for ?? []).join(' · ')}
                    </div>
                  )}

                  {day.day_tip ? (
                    <p className="mt-3 text-sm italic text-[var(--color-text-body)]">
                      Tip: {day.day_tip}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>

          {guide.disclaimer ? (
            <p className="mt-10 text-xs leading-relaxed text-[var(--color-text-muted)]">
              {guide.disclaimer}
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}
