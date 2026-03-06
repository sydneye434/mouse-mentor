/**
 * Developed by Sydney Edwards
 * Trip details collected via "get to know you" flow.
 * Matches backend TripInfo; use for API payloads and shared option constants.
 */
export function toTripInfoPayload(trip) {
  return {
    destination: trip.destination,
    arrival_date: trip.arrivalDate || null,
    departure_date: trip.departureDate || null,
    number_of_adults: trip.numberOfAdults ?? 1,
    number_of_children: trip.numberOfChildren ?? 0,
    child_ages: trip.childAges?.length ? trip.childAges : null,
    length_of_stay_days: trip.lengthOfStayDays ?? null,
    dates_flexible: trip.datesFlexible ?? false,
    flexible_travel_period: trip.flexibleTravelPeriod || null,
    park_days: trip.parkDays ?? null,
    priorities: trip.priorities?.length ? trip.priorities : null,
    on_site: trip.onSite ?? null,
    resort_tier: trip.resortTier || null,
    first_visit: trip.firstVisit ?? null,
    special_occasion: trip.specialOccasion || null,
    trip_pace: trip.tripPace || null,
    budget_vibe: trip.budgetVibe || null,
    ride_preference: trip.ridePreference || null,
    genie_plus_interest: trip.geniePlusInterest || null,
    dietary_notes: trip.dietaryNotes?.trim() || null,
  }
}

export const DESTINATIONS = [
  { value: 'disney-world', label: 'Walt Disney World (Florida)' },
  { value: 'disneyland', label: 'Disneyland (California)' },
]

export const CHILD_AGE_RANGE_OPTIONS = [
  { value: '0-2', label: '0–2 years' },
  { value: '3-5', label: '3–5 years' },
  { value: '6-9', label: '6–9 years' },
  { value: '10-12', label: '10–12 years' },
  { value: '13-17', label: '13–17 years' },
]

export const PRIORITY_OPTIONS = [
  { value: 'food', label: 'Food & dining' },
  { value: 'rides', label: 'Rides & attractions' },
  { value: 'characters', label: 'Characters & meet & greets' },
  { value: 'shows', label: 'Shows & entertainment' },
  { value: 'parades', label: 'Parades & fireworks' },
  { value: 'relaxation', label: 'Relaxation & atmosphere' },
  { value: 'shopping', label: 'Shopping & souvenirs' },
  { value: 'table-service', label: 'Table-service / sit-down meals' },
]

export const STAY_OPTIONS = [
  { value: 'on-site', label: 'Staying at a Disney resort' },
  { value: 'off-site', label: 'Staying off-site' },
  { value: 'unsure', label: 'Not sure yet' },
]

export const RESORT_TIER_OPTIONS = [
  { value: '', label: 'Not sure yet' },
  { value: 'value', label: 'Value' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'deluxe', label: 'Deluxe' },
]

export const TRIP_PACE_OPTIONS = [
  { value: 'relaxed', label: 'Relaxed — pool days & taking it easy' },
  { value: 'balanced', label: 'Balanced — mix of parks and downtime' },
  { value: 'go-go-go', label: 'Go-go-go — maximize every day' },
]

export const SPECIAL_OCCASION_OPTIONS = [
  { value: '', label: 'Just a regular trip' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'first-visit', label: 'First visit celebration' },
  { value: 'graduation', label: 'Graduation' },
  { value: 'other', label: 'Something else' },
]

export const FLEXIBLE_TRAVEL_PERIOD_OPTIONS = [
  { value: '', label: 'No preference' },
  { value: 'jan-feb', label: 'Jan–Feb' },
  { value: 'mar-may', label: 'Mar–May' },
  { value: 'jun-aug', label: 'Jun–Aug' },
  { value: 'sep-oct', label: 'Sep–Oct' },
  { value: 'nov-dec', label: 'Nov–Dec' },
]

export const BUDGET_VIBE_OPTIONS = [
  { value: '', label: 'No preference' },
  { value: 'value', label: 'Value — keep dining & extras on the lighter side' },
  {
    value: 'moderate',
    label: 'Moderate — mix of quick service and some splurges',
  },
  {
    value: 'splurge',
    label: 'Splurge — fine dining, special experiences, no problem',
  },
]

export const RIDE_PREFERENCE_OPTIONS = [
  { value: '', label: 'No preference' },
  { value: 'thrill', label: 'Thrill-seeker — coasters and intense rides' },
  { value: 'mix', label: 'Mix of both — thrill and family-friendly' },
  { value: 'mild', label: 'Prefer milder rides — less intense attractions' },
]

export const GENIE_PLUS_OPTIONS = [
  { value: '', label: 'Not sure yet' },
  { value: 'yes', label: 'Yes — planning to use Genie+ / Lightning Lanes' },
  { value: 'no', label: 'No — skipping for this trip' },
  { value: 'unsure', label: 'Still deciding' },
]
