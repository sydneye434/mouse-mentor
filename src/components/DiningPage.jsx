/**
 * Developed by Sydney Edwards
 * Dining tab: top picks, want-to-go, 60-day booking countdown & reminder.
 */
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Bell,
  BellOff,
  Heart,
  Loader2,
  MapPin,
  RefreshCw,
  UtensilsCrossed,
} from 'lucide-react'
import { daysUntilBookingWindow } from '../diningWindow.js'

function CountdownBanner({
  arrivalDate,
  serverDays,
  serverOpened,
  serverOpensAt,
  hasTripDates,
}) {
  if (!hasTripDates) {
    return (
      <div className="mb-6 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
        Add your <strong>arrival date</strong> in the trip planner to see when
        your dining booking window opens (typically 60 days before check-in).
      </div>
    )
  }

  const days =
    serverDays != null ? serverDays : daysUntilBookingWindow(arrivalDate)

  if (serverOpened) {
    return (
      <div className="mb-6 rounded-[var(--radius-card)] border border-[var(--color-mint-strong)] bg-[var(--color-mint-light)] px-4 py-3 text-sm text-[var(--color-text-heading)]">
        <strong>Your booking window is open.</strong> Book popular meals in the
        My Disney Experience app—availability goes fast.
      </div>
    )
  }

  if (days == null) return null

  if (days === 0) {
    return (
      <div className="mb-6 rounded-[var(--radius-card)] border border-amber-500/50 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
        <strong>Your dining reservations may open today</strong> (usually 6:00
        AM Eastern). Check the official Disney app for the exact time for your
        stay.
        {serverOpensAt ? (
          <span className="mt-1 block text-xs opacity-90">
            Reference:{' '}
            {new Date(serverOpensAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <div className="mb-6 rounded-[var(--radius-card)] border border-[var(--color-lilac-strong)] bg-[var(--color-lilac-light)] px-4 py-3 text-sm text-[var(--color-text-heading)]">
      Your dining reservations open in{' '}
      <strong>
        {days} {days === 1 ? 'day' : 'days'}
      </strong>
      .
    </div>
  )
}

export default function DiningPage({
  tripInfo,
  user,
  restaurants,
  wantToGo,
  reminderEnabled,
  loading,
  generating,
  error,
  daysUntil,
  bookingOpened,
  bookingOpensAt,
  onGenerate,
  onToggleWant,
  onToggleReminder,
}) {
  const hasTripDates = !!(tripInfo?.arrivalDate && tripInfo?.departureDate)
  const wantSet = new Set(wantToGo ?? [])

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
          onClick={onGenerate}
          disabled={generating || !tripInfo}
          className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text-heading)] hover:bg-[var(--color-lilac-light)] disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`}
            aria-hidden
          />
          Refresh picks
        </button>
      </div>

      <header className="mb-6">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-800 dark:bg-orange-950/50 dark:text-orange-200">
          <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden />
          First-timer friendly
        </div>
        <h1 className="font-display text-3xl font-bold text-[var(--color-text-heading)]">
          Dining
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Curated table-service spots with quick descriptions, price bands, and
          a tag tailored to your party and dietary notes.
        </p>
      </header>

      <CountdownBanner
        arrivalDate={tripInfo?.arrivalDate}
        serverDays={daysUntil}
        serverOpened={bookingOpened}
        serverOpensAt={bookingOpensAt}
        hasTripDates={hasTripDates}
      />

      {user && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 py-3">
          <div className="flex items-start gap-2">
            {reminderEnabled ? (
              <Bell className="mt-0.5 h-5 w-5 text-[var(--color-lilac-strong)]" />
            ) : (
              <BellOff className="mt-0.5 h-5 w-5 text-[var(--color-text-muted)]" />
            )}
            <div>
              <p className="m-0 text-sm font-semibold text-[var(--color-text-heading)]">
                60-day booking reminder
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                We save your preference on your account. Check back here as your
                window approaches.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onToggleReminder(!reminderEnabled)}
            className={`shrink-0 rounded-[var(--radius-pill)] px-4 py-2 text-sm font-semibold ${
              reminderEnabled
                ? 'bg-[var(--color-lilac-strong)] text-white'
                : 'border border-[var(--color-border)] bg-transparent text-[var(--color-text-heading)]'
            }`}
          >
            {reminderEnabled ? 'Reminder on' : 'Set reminder'}
          </button>
        </div>
      )}

      {!user && (
        <p className="mb-6 text-xs text-[var(--color-text-muted)]">
          <Link
            to="/"
            className="font-semibold text-[var(--color-lilac-strong)]"
          >
            Sign in
          </Link>{' '}
          to save want-to-go and reminders to your account.
        </p>
      )}

      {error && (
        <div
          className="mb-4 rounded-[var(--radius-card)] border border-[var(--color-pink-mid)] bg-[var(--color-error-bg)] px-4 py-3 text-sm text-[var(--color-error-text)]"
          role="alert"
        >
          {error}
        </div>
      )}

      {(loading || generating) && !restaurants?.length && (
        <div className="flex min-h-[8rem] items-center justify-center gap-2 text-[var(--color-text-muted)]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Loading dining picks…</span>
        </div>
      )}

      {!loading &&
        !generating &&
        (!restaurants || restaurants.length === 0) && (
          <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 text-center">
            <p className="m-0 text-sm text-[var(--color-text-muted)]">
              {tripInfo
                ? 'Generate your personalized list of first-timer-friendly restaurants.'
                : 'Complete the trip planner first so we can tailor picks to your party.'}
            </p>
            {tripInfo && (
              <button
                type="button"
                onClick={onGenerate}
                className="mt-4 rounded-[var(--radius-pill)] bg-[var(--color-pink-mid)] px-6 py-2.5 text-sm font-semibold text-[var(--color-text-on-primary)]"
              >
                Generate list
              </button>
            )}
          </div>
        )}

      {restaurants && restaurants.length > 0 && (
        <ul className="m-0 space-y-4 p-0">
          {restaurants.map((r) => {
            const id = r.id
            const wanted = wantSet.has(id)
            return (
              <li
                key={id}
                className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-[var(--color-text-heading)]">
                      {r.name}
                    </h2>
                    <p className="mt-1 flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                      <MapPin className="h-3.5 w-3.5" aria-hidden />
                      {r.location}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--color-bg-page)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-heading)]">
                    {r.price_range}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-body)]">
                  {r.brief_description}
                </p>
                <p className="mt-3 rounded-[var(--radius-input)] border border-[var(--color-mint-strong)]/30 bg-[var(--color-mint-light)]/50 px-3 py-2 text-sm text-[var(--color-text-heading)]">
                  <span className="font-semibold text-[var(--color-mint-strong)]">
                    Best for your group:{' '}
                  </span>
                  {r.best_for_your_group}
                </p>
                <p className="mt-3">
                  <button
                    type="button"
                    onClick={() => onToggleWant(id, !wanted)}
                    className={`inline-flex items-center gap-2 rounded-[var(--radius-pill)] px-4 py-2 text-sm font-semibold ${
                      wanted
                        ? 'bg-[var(--color-pink-mid)] text-[var(--color-text-on-primary)]'
                        : 'border border-[var(--color-border)] text-[var(--color-text-heading)] hover:bg-[var(--color-lilac-light)]'
                    }`}
                  >
                    <Heart
                      className={`h-4 w-4 ${wanted ? 'fill-current' : ''}`}
                      aria-hidden
                    />
                    {wanted ? 'Saved — want to go' : 'Want to go'}
                  </button>
                </p>
              </li>
            )
          })}
        </ul>
      )}

      <p className="mt-8 text-xs text-[var(--color-text-muted)]">
        Menus, prices, and booking rules change. Confirm everything in the
        official Disney app. On-site guests may have different booking windows
        than day guests.
      </p>
    </div>
  )
}
