/**
 * Developed by Sydney Edwards
 * Post-login trip hub: trip countdown, short waits, itinerary teaser, guide entry, rotating tips.
 */
import { useEffect, useState } from 'react'
import {
  Calendar,
  Clock,
  Lock,
  MessageCircle,
  Sparkles,
  MapPin,
  RefreshCw,
  Zap,
  UtensilsCrossed,
  Share2,
  Lightbulb,
  X,
  Loader2,
} from 'lucide-react'
import { DESTINATIONS } from '../tripInfo'

const TIPS_DISMISSED_STORAGE_KEY = 'mouse-mentor-dashboard-tips-dismissed'

function readDismissedIds(generationId) {
  if (!generationId) return new Set()
  try {
    const raw = localStorage.getItem(TIPS_DISMISSED_STORAGE_KEY)
    const o = raw ? JSON.parse(raw) : {}
    const arr = o[generationId]
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function persistDismissedId(generationId, tipId) {
  try {
    const raw = localStorage.getItem(TIPS_DISMISSED_STORAGE_KEY)
    const o = raw ? JSON.parse(raw) : {}
    if (!Array.isArray(o[generationId])) o[generationId] = []
    if (!o[generationId].includes(tipId)) o[generationId].push(tipId)
    localStorage.setItem(TIPS_DISMISSED_STORAGE_KEY, JSON.stringify(o))
  } catch {
    /* ignore */
  }
}

const FIRST_TIMER_TIPS = [
  {
    title: 'Rope drop wins',
    body: 'Arrive 30–45 minutes before official open if you want a shorter line on a headliner—afternoon waits are often longest.',
  },
  {
    title: 'Mobile order early',
    body: 'Order lunch and snacks before you’re hungry—popular pick-up windows fill fast at peak meal times.',
  },
  {
    title: 'Prep your phone',
    body: 'Download the official Disney app and link tickets before park day for Genie+, maps, and Lightning Lane.',
  },
]

function daysUntilArrival(arrivalDate) {
  if (!arrivalDate) return null
  try {
    const d = new Date(arrivalDate + 'T12:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    d.setHours(0, 0, 0, 0)
    return Math.ceil((d - today) / 86400000)
  } catch {
    return null
  }
}

export default function DashboardHome({
  tripInfo,
  user,
  saveTripData,
  aiTips,
  tipsLoading,
  onRegenerateTips,
  onRetryTips,
  waitTimesData,
  waitTimesLoading,
  waitTimesError,
  onRefreshWaits,
  onAskGuide,
  onItineraryPreview,
  onOpenLightningLaneGuide,
  onOpenDining,
  onPlanTrip,
  onEditTrip,
  onShareTrip,
}) {
  const [tipIndex, setTipIndex] = useState(0)
  const [shareStatus, setShareStatus] = useState('idle')
  const [dismissedTipIds, setDismissedTipIds] = useState(() => new Set())

  useEffect(() => {
    const t = setInterval(() => {
      setTipIndex((i) => (i + 1) % FIRST_TIMER_TIPS.length)
    }, 8000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const gid = aiTips?.generation_id
    if (!gid) {
      setDismissedTipIds(new Set())
      return
    }
    setDismissedTipIds(readDismissedIds(gid))
  }, [aiTips?.generation_id])

  const destLabel =
    DESTINATIONS.find((d) => d.value === tripInfo?.destination)?.label ??
    'Your Disney trip'

  const days = tripInfo?.arrivalDate ? daysUntilArrival(tripInfo.arrivalDate) : null
  const hasDates = !!(tripInfo?.arrivalDate && tripInfo?.departureDate)
  const canShare =
    !!user?.token && saveTripData && tripInfo && hasDates && typeof onShareTrip === 'function'

  async function handleShareClick() {
    if (!onShareTrip) return
    setShareStatus('copying')
    try {
      await onShareTrip()
      setShareStatus('copied')
      setTimeout(() => setShareStatus('idle'), 2800)
    } catch {
      setShareStatus('error')
      setTimeout(() => setShareStatus('idle'), 5000)
    }
  }

  const shortest =
    waitTimesData?.top10_shortest?.slice(0, 5) ?? []

  const showAiTipsSection = !!(user?.token && tripInfo && saveTripData)
  const visibleAiTips =
    aiTips?.tips?.filter((t) => t?.id && !dismissedTipIds.has(t.id)) ?? []

  function dismissAiTip(tipId) {
    const gid = aiTips?.generation_id
    if (!gid) return
    persistDismissedId(gid, tipId)
    setDismissedTipIds((prev) => new Set([...prev, tipId]))
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5 pb-8 pt-2">
      <div className="px-1">
        <h2 className="font-display text-2xl font-semibold text-[var(--color-text-heading)]">
          Welcome back
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Your personal trip hub—everything in one place before you chat with
          your guide.
        </p>
      </div>

      {/* Your Trip */}
      <section
        className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 shadow-sm"
        aria-labelledby="dash-trip-heading"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3
              id="dash-trip-heading"
              className="flex items-center gap-2 font-display text-lg font-semibold text-[var(--color-text-heading)]"
            >
              <Calendar className="h-5 w-5 text-[var(--color-lilac-strong)]" aria-hidden />
              Your trip
            </h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{destLabel}</p>
          </div>
          {tripInfo && hasDates && (
            <button
              type="button"
              onClick={onEditTrip}
              className="shrink-0 text-xs font-semibold text-[var(--color-lilac-strong)] underline-offset-2 hover:underline"
            >
              Edit
            </button>
          )}
        </div>

        {!tripInfo || !hasDates ? (
          <div className="mt-4 rounded-[var(--radius-input)] bg-[var(--color-lilac-light)] px-4 py-3 text-sm text-[var(--color-text-body)]">
            <p className="m-0 mb-3">
              Add your travel dates so we can count down to your visit.
            </p>
            <button
              type="button"
              onClick={onPlanTrip}
              className="rounded-[var(--radius-pill)] bg-[var(--color-pink-mid)] px-4 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] hover:bg-[var(--color-pink-strong)]"
            >
              Plan your trip
            </button>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-baseline gap-2">
            {days != null && days > 0 && (
              <>
                <span className="font-display text-4xl font-bold tabular-nums text-[var(--color-text-heading)]">
                  {days}
                </span>
                <span className="text-lg font-medium text-[var(--color-text-muted)]">
                  {days === 1 ? 'day until' : 'days until'} your visit
                </span>
              </>
            )}
            {days === 0 && (
              <p className="m-0 text-lg font-semibold text-[var(--color-mint-strong)]">
                Your trip starts today—have a magical day!
              </p>
            )}
            {days != null && days < 0 && (
              <p className="m-0 text-sm text-[var(--color-text-muted)]">
                Trip dates in the past—tap Edit to update for your next visit.
              </p>
            )}
            {tripInfo.departureDate && (
              <p className="mt-2 w-full text-xs text-[var(--color-text-muted)]">
                {tripInfo.arrivalDate} → {tripInfo.departureDate}
                {tripInfo.lengthOfStayDays
                  ? ` · ${tripInfo.lengthOfStayDays} days`
                  : ''}
              </p>
            )}
            {canShare && (
              <div className="mt-4 w-full border-t border-[var(--color-border)] pt-4">
                <button
                  type="button"
                  onClick={() => void handleShareClick()}
                  disabled={shareStatus === 'copying'}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-bg-page)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-heading)] shadow-sm hover:bg-[var(--color-lilac-light)] disabled:opacity-60 sm:w-auto"
                >
                  <Share2 className="h-4 w-4 shrink-0" aria-hidden />
                  {shareStatus === 'copying'
                    ? 'Copying link…'
                    : shareStatus === 'copied'
                      ? 'Copied to clipboard!'
                      : shareStatus === 'error'
                        ? 'Could not copy — try again'
                        : 'Share my trip'}
                </button>
                <p className="mt-2 m-0 text-xs text-[var(--color-text-muted)]">
                  Anyone with the link can view your trip details and itinerary
                  (read-only, no sign-in).
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* AI personalized tips */}
      {showAiTipsSection && (
        <section
          className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 shadow-sm"
          aria-labelledby="dash-ai-tips-heading"
        >
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3
                id="dash-ai-tips-heading"
                className="flex items-center gap-2 font-display text-lg font-semibold text-[var(--color-text-heading)]"
              >
                <Lightbulb
                  className="h-5 w-5 text-amber-500"
                  aria-hidden
                />
                Tips for your trip
              </h3>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Personalized ideas from your planner answers—characters, rides,
                pacing, and more.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void onRegenerateTips?.()}
              disabled={tipsLoading}
              className="shrink-0 rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-heading)] hover:bg-[var(--color-lilac-light)] disabled:opacity-50"
            >
              {tipsLoading ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Generating…
                </span>
              ) : (
                'Get more tips'
              )}
            </button>
          </div>

          {tipsLoading &&
          (aiTips === undefined || aiTips === null || !aiTips?.tips?.length) ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-[var(--color-text-muted)]">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--color-lilac-strong)]" aria-hidden />
              <p className="m-0 text-sm">Cooking up tips for your party…</p>
            </div>
          ) : null}

          {!tipsLoading && aiTips === null && typeof onRetryTips === 'function' ? (
            <div className="rounded-[var(--radius-input)] bg-[var(--color-lilac-light)]/60 px-4 py-3 text-sm text-[var(--color-text-body)]">
              <p className="m-0">
                We couldn&apos;t load tips yet. Check your connection or try
                again.
              </p>
              {typeof onRetryTips === 'function' && (
                <button
                  type="button"
                  onClick={() => void onRetryTips()}
                  className="mt-3 rounded-[var(--radius-pill)] bg-[var(--color-pink-mid)] px-4 py-2 text-xs font-semibold text-[var(--color-text-on-primary)] hover:bg-[var(--color-pink-strong)]"
                >
                  Try again
                </button>
              )}
            </div>
          ) : null}

          {visibleAiTips.length > 0 ? (
            <ul className="m-0 mt-2 list-none space-y-3 p-0">
              {visibleAiTips.map((tip) => (
                <li
                  key={tip.id}
                  className="relative rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-bg-page)] p-4 pr-11 shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => dismissAiTip(tip.id)}
                    className="absolute right-2 top-2 rounded-full p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-lilac-light)] hover:text-[var(--color-text-heading)]"
                    aria-label={`Dismiss tip: ${tip.title}`}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                  <p className="m-0 pr-1 text-sm font-semibold text-[var(--color-text-heading)]">
                    {tip.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-body)]">
                    {tip.body}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}

          {aiTips?.tips?.length > 0 && visibleAiTips.length === 0 && !tipsLoading ? (
            <p className="m-0 text-sm text-[var(--color-text-muted)]">
              You&apos;ve dismissed these tips. Tap &quot;Get more tips&quot; for
              a fresh set.
            </p>
          ) : null}
        </section>
      )}

      {/* Today's Wait Times */}
      <section
        className="rounded-[var(--radius-card)] border border-[var(--color-sky-border)] bg-[var(--color-sky-light)] p-5"
        aria-labelledby="dash-waits-heading"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3
            id="dash-waits-heading"
            className="flex items-center gap-2 font-display text-lg font-semibold text-[var(--color-text-heading)]"
          >
            <Clock className="h-5 w-5 text-[var(--color-sky-strong)]" aria-hidden />
            Today&apos;s shortest waits
          </h3>
          <button
            type="button"
            onClick={() => onRefreshWaits(true)}
            disabled={waitTimesLoading}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--color-sky-border)] bg-white/80 px-2.5 py-1 text-xs font-semibold text-[var(--color-sky-strong)] hover:bg-white disabled:opacity-50"
            aria-label="Refresh wait times"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${waitTimesLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>
        {waitTimesError && (
          <p className="mb-2 text-sm text-[var(--color-error-text)]">{waitTimesError}</p>
        )}
        {waitTimesLoading && !shortest.length ? (
          <p className="text-sm text-[var(--color-text-muted)]">Loading waits…</p>
        ) : shortest.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            No standby waits available right now. Try refresh in a moment.
          </p>
        ) : (
          <ol className="m-0 list-none space-y-2 p-0">
            {shortest.map((row, i) => (
              <li
                key={`${row.park_name}-${row.name}-${i}`}
                className="flex items-center justify-between gap-2 rounded-[var(--radius-input)] border border-[var(--color-border)]/60 bg-white/90 px-3 py-2 text-sm"
              >
                <span className="min-w-0 font-medium text-[var(--color-text-body)]">
                  <span className="text-[var(--color-text-muted)]">{i + 1}.</span>{' '}
                  {row.name}
                </span>
                <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
                  {row.park_name}
                </span>
                <span className="shrink-0 font-bold tabular-nums text-[var(--color-sky-strong)]">
                  {row.wait_minutes} min
                </span>
              </li>
            ))}
          </ol>
        )}
        {waitTimesData?.fetched_at && (
          <p className="mt-3 text-[0.7rem] text-[var(--color-text-muted)]">
            Updated {new Date(waitTimesData.fetched_at).toLocaleString()}
            {waitTimesData.cached ? ' (cached)' : ''}
          </p>
        )}
      </section>

      {/* Itinerary preview — Pro */}
      <section
        className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface-lilac)] p-5"
        aria-labelledby="dash-itin-heading"
      >
        <h3
          id="dash-itin-heading"
          className="flex items-center gap-2 font-display text-lg font-semibold text-[var(--color-text-heading)]"
        >
          <MapPin className="h-5 w-5 text-[var(--color-lilac-strong)]" aria-hidden />
          Your itinerary
        </h3>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          A day-by-day preview from your chats—export and polish with Pro.
        </p>
        <div className="relative mt-4 min-h-[5.5rem] rounded-[var(--radius-input)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-page)]/80 p-3">
          {!user?.is_pro && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-[var(--radius-input)] bg-[var(--color-bg-surface)]/85 backdrop-blur-[2px]">
              <Lock className="h-6 w-6 text-[var(--color-lilac-strong)]" aria-hidden />
              <span className="text-xs font-semibold text-[var(--color-text-heading)]">
                Pro unlocks itinerary preview & PDF
              </span>
            </div>
          )}
          <ul className="m-0 space-y-1.5 p-0 text-sm text-[var(--color-text-muted)]">
            <li className="flex gap-2">
              <span className="font-medium text-[var(--color-text-heading)]">Day 1</span>
              <span>Magic Kingdom — arrival & must-dos</span>
            </li>
            <li className="flex gap-2">
              <span className="font-medium text-[var(--color-text-heading)]">Day 2</span>
              <span>EPCOT & dining — personalized to your trip</span>
            </li>
            <li className="italic opacity-80">…built from your guide conversations</li>
          </ul>
        </div>
        <button
          type="button"
          onClick={onItineraryPreview}
          className="mt-4 w-full rounded-[var(--radius-pill)] border-[1.5px] border-[var(--color-lilac-strong)] bg-transparent py-2.5 text-sm font-semibold text-[var(--color-lilac-strong)] hover:bg-[var(--color-lilac-light)]"
        >
          {user?.is_pro ? 'Open full itinerary' : 'Unlock with Pro'}
        </button>
      </section>

      {/* Lightning Lane Guide */}
      <section
        className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 shadow-sm"
        aria-labelledby="dash-ll-heading"
      >
        <h3
          id="dash-ll-heading"
          className="flex items-center gap-2 font-display text-lg font-semibold text-[var(--color-text-heading)]"
        >
          <Zap className="h-5 w-5 text-amber-500" aria-hidden />
          Lightning Lane Guide
        </h3>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Plain-English Multi Pass, Single Pass &amp; Individual LL—plus which
          rides to book first for your group and when to wake up.
        </p>
        <button
          type="button"
          onClick={onOpenLightningLaneGuide}
          className="mt-4 w-full rounded-[var(--radius-pill)] border-[1.5px] border-amber-600/60 bg-amber-50/80 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-500/50 dark:bg-amber-950/30 dark:text-amber-100 dark:hover:bg-amber-950/50"
        >
          Open Lightning Lane Guide
        </button>
      </section>

      {/* Dining */}
      <section
        className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 shadow-sm"
        aria-labelledby="dash-dining-heading"
      >
        <h3
          id="dash-dining-heading"
          className="flex items-center gap-2 font-display text-lg font-semibold text-[var(--color-text-heading)]"
        >
          <UtensilsCrossed className="h-5 w-5 text-orange-600" aria-hidden />
          Dining
        </h3>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Top first-timer picks, want-to-go list, and a countdown to your 60-day
          booking window.
        </p>
        <button
          type="button"
          onClick={onOpenDining}
          className="mt-4 w-full rounded-[var(--radius-pill)] border-[1.5px] border-orange-600/50 bg-orange-50/90 py-2.5 text-sm font-semibold text-orange-950 hover:bg-orange-100 dark:border-orange-500/40 dark:bg-orange-950/25 dark:text-orange-100 dark:hover:bg-orange-950/40"
        >
          Open Dining
        </button>
      </section>

      {/* Ask your guide */}
      <button
        type="button"
        onClick={onAskGuide}
        className="flex w-full items-center gap-4 rounded-[var(--radius-card)] border-2 border-[var(--color-pink-mid)] bg-gradient-to-br from-[var(--color-pink-light)] to-[var(--color-lilac-light)] p-5 text-left transition hover:border-[var(--color-pink-strong)] hover:shadow-md"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-lilac-strong)] text-white">
          <MessageCircle className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold text-[var(--color-text-heading)]">
            Ask your guide
          </p>
          <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
            Jump into chat—your trip details shape every answer.
          </p>
        </div>
        <Sparkles className="h-5 w-5 shrink-0 text-[var(--color-pink-strong)]" aria-hidden />
      </button>

      {/* Tips for first-timers */}
      <section
        className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-mint-light)]/50 p-5"
        aria-labelledby="dash-tips-heading"
      >
        <h3
          id="dash-tips-heading"
          className="mb-3 font-display text-lg font-semibold text-[var(--color-text-heading)]"
        >
          Tips for first-timers
        </h3>
        <div key={tipIndex} className="min-h-[4.5rem]">
          <p className="m-0 text-sm font-semibold text-[var(--color-mint-strong)]">
            {FIRST_TIMER_TIPS[tipIndex].title}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-body)]">
            {FIRST_TIMER_TIPS[tipIndex].body}
          </p>
        </div>
        <div className="mt-4 flex justify-center gap-1.5" role="tablist" aria-label="Tip carousel">
          {FIRST_TIMER_TIPS.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === tipIndex}
              className={`h-2 w-2 rounded-full transition-all ${
                i === tipIndex
                  ? 'w-6 bg-[var(--color-mint-strong)]'
                  : 'bg-[var(--color-border)] hover:bg-[var(--color-text-muted)]'
              }`}
              onClick={() => setTipIndex(i)}
              aria-label={`Show tip ${i + 1}`}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
