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
} from '../tripInfo'
import './TripInfoForm.css'

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

export default function TripSummary({ trip, onEdit }) {
  const dest =
    DESTINATIONS.find((d) => d.value === trip.destination)?.label ??
    trip.destination
  const party = trip.numberOfAdults + trip.numberOfChildren
  const guestLabel = party === 1 ? 'guest' : 'guests'
  const parts = [`${dest} • ${party} ${guestLabel}`]
  if (trip.childAges?.length) {
    const labels = trip.childAges.map((v) =>
      labelFor(v, CHILD_AGE_RANGE_OPTIONS)
    )
    parts.push(`kids: ${labels.join(', ')}`)
  }
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
  if (trip.firstVisit === true) parts.push('first visit')
  else if (trip.firstVisit === false) parts.push('returning')
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
  if (trip.dietaryNotes) parts.push(`dietary: ${trip.dietaryNotes}`)

  return (
    <div className="trip-summary">
      <p className="trip-summary__title">Your trip</p>
      <p className="trip-summary__text">{parts.join(' • ')}</p>
      {onEdit && (
        <button
          type="button"
          className="trip-summary__edit"
          onClick={onEdit}
          aria-label="Edit trip details"
        >
          Edit trip details
        </button>
      )}
    </div>
  )
}
