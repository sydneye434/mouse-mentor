/**
 * Developed by Sydney Edwards
 * Read-only summary of trip details with Edit button. Shown after get-to-know-you or when returning with saved trip.
 */
import {
  DESTINATIONS,
  CHILD_AGE_RANGE_OPTIONS,
  PRIORITY_OPTIONS,
  RESORT_TIER_OPTIONS,
  TRIP_PACE_OPTIONS,
  SPECIAL_OCCASION_OPTIONS,
  FLEXIBLE_TRAVEL_PERIOD_OPTIONS,
  BUDGET_VIBE_OPTIONS,
  RIDE_PREFERENCE_OPTIONS,
  GENIE_PLUS_OPTIONS,
  WDW_PARK_OPTIONS,
  DL_PARK_OPTIONS,
  THRILL_TOLERANCE_OPTIONS,
  FIRST_TIMER_FOCUS_OPTIONS,
} from '../tripInfo'

function formatDate(s) {
  if (!s) return ''
  try {
    const d = new Date(s + 'T00:00:00')
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return s
  }
}

function labelFor(value, options) {
  return options.find((o) => o.value === value)?.label ?? value
}

function parkLabels(parks, destination) {
  const opts =
    destination === 'disneyland' ? DL_PARK_OPTIONS : WDW_PARK_OPTIONS
  const map = Object.fromEntries(opts.map((o) => [o.value, o.label]))
  return (parks || []).map((p) => map[p] ?? p).join(', ')
}

export default function TripSummary({
  trip,
  onEdit,
  summaryTitle = 'Your trip',
}) {
  const dest =
    DESTINATIONS.find((d) => d.value === trip.destination)?.label ??
    trip.destination
  const party = trip.numberOfAdults + trip.numberOfChildren
  const guestLabel = party === 1 ? 'guest' : 'guests'
  const parts = [`${dest} • ${party} ${guestLabel}`]

  if (trip.firstVisit === true) parts.push('first visit')
  else if (trip.firstVisit === false) parts.push('returning')

  if (trip.parksPlanned?.length) {
    parts.push(`parks: ${parkLabels(trip.parksPlanned, trip.destination)}`)
  }
  if (trip.parkScheduleNotes?.trim()) {
    parts.push(`schedule: ${trip.parkScheduleNotes.trim().slice(0, 80)}…`)
  }

  if (trip.partyAgeUnder7 || trip.partyAge7To12 || trip.partyAgeTeen) {
    parts.push(
      `ages: U7 ${trip.partyAgeUnder7 ?? 0} · 7–12 ${trip.partyAge7To12 ?? 0} · teens ${trip.partyAgeTeen ?? 0} · adults ${trip.partyAgeAdult ?? 0}`
    )
  }

  if (trip.childAges?.length) {
    const labels = trip.childAges.map((v) =>
      labelFor(v, CHILD_AGE_RANGE_OPTIONS)
    )
    parts.push(`kids: ${labels.join(', ')}`)
  }

  if (trip.thrillTolerance) {
    const tl = THRILL_TOLERANCE_OPTIONS.find(
      (o) => o.value === trip.thrillTolerance
    )
    if (tl) parts.push(tl.label)
  }
  if (trip.firstTimerFocus) {
    parts.push(
      `focus: ${labelFor(trip.firstTimerFocus, FIRST_TIMER_FOCUS_OPTIONS)}`
    )
  }
  if (trip.mobilityNotes?.trim())
    parts.push(`mobility: ${trip.mobilityNotes.trim().slice(0, 60)}…`)
  if (trip.dietaryRestrictions?.trim())
    parts.push(`dietary: ${trip.dietaryRestrictions.trim().slice(0, 60)}…`)

  if (trip.datesFlexible) {
    parts.push('flexible dates')
    if (trip.flexibleTravelPeriod) {
      const lbl = labelFor(
        trip.flexibleTravelPeriod,
        FLEXIBLE_TRAVEL_PERIOD_OPTIONS
      )
      if (lbl && lbl !== 'No preference') parts.push(lbl)
    }
  } else if (trip.arrivalDate && trip.departureDate) {
    parts.push(
      `${formatDate(trip.arrivalDate)} – ${formatDate(trip.departureDate)}`
    )
  }
  if (trip.lengthOfStayDays) {
    parts.push(
      `${trip.lengthOfStayDays} day${trip.lengthOfStayDays !== 1 ? 's' : ''}`
    )
  }
  if (trip.parkDays) {
    parts.push(`${trip.parkDays} park day${trip.parkDays !== 1 ? 's' : ''}`)
  }
  if (trip.priorities?.length) {
    parts.push(
      `priorities: ${trip.priorities.map((p) => labelFor(p, PRIORITY_OPTIONS)).join(', ')}`
    )
  }
  if (trip.onSite === true) parts.push('on-site')
  else if (trip.onSite === false) parts.push('off-site')
  if (trip.resortTier)
    parts.push(labelFor(trip.resortTier, RESORT_TIER_OPTIONS))
  if (trip.specialOccasion)
    parts.push(
      `celebrating ${labelFor(trip.specialOccasion, SPECIAL_OCCASION_OPTIONS)}`
    )
  if (trip.tripPace) parts.push(labelFor(trip.tripPace, TRIP_PACE_OPTIONS))
  if (trip.budgetVibe)
    parts.push(labelFor(trip.budgetVibe, BUDGET_VIBE_OPTIONS))
  if (trip.ridePreference)
    parts.push(labelFor(trip.ridePreference, RIDE_PREFERENCE_OPTIONS))
  if (trip.geniePlusInterest)
    parts.push(labelFor(trip.geniePlusInterest, GENIE_PLUS_OPTIONS))
  if (trip.dietaryNotes && !trip.dietaryRestrictions)
    parts.push(`notes: ${trip.dietaryNotes}`)

  return (
    <div className="mb-4 rounded-[var(--radius-input)] border border-[var(--color-border)] border-l-4 border-l-[var(--color-lilac-strong)] bg-[var(--color-bg-surface)] px-4 py-3 text-sm">
      <p className="m-0 mb-1 font-semibold text-[var(--color-text-heading)]">
        {summaryTitle}
      </p>
      <p className="m-0 leading-relaxed text-[var(--color-text-muted)]">
        {parts.join(' • ')}
      </p>
      {onEdit && (
        <button
          type="button"
          className="mt-2 border-0 bg-transparent p-0 text-sm font-medium text-[var(--color-lilac-strong)] underline"
          onClick={onEdit}
          aria-label="Edit trip details"
        >
          Edit trip details
        </button>
      )}
    </div>
  )
}
