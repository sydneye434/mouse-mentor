/**
 * Developed by Sydney Edwards
 * Trip details for first-time visitor onboarding + API compatibility.
 * Matches backend TripInfo; use for API payloads and shared option constants.
 */
export function toTripInfoPayload(trip) {
  const dietaryCombined = [trip.dietaryRestrictions, trip.mobilityNotes, trip.parkScheduleNotes]
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
    .join(' | ')

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
    dietary_notes: trip.dietaryNotes?.trim() || dietaryCombined || null,
    /* First-timer profile (heavily used in system prompt) */
    parks_planned: trip.parksPlanned?.length ? trip.parksPlanned : null,
    park_schedule_notes: trip.parkScheduleNotes?.trim() || null,
    party_age_under_7: trip.partyAgeUnder7 ?? 0,
    party_age_7_12: trip.partyAge7To12 ?? 0,
    party_age_teen: trip.partyAgeTeen ?? 0,
    party_age_adult: trip.partyAgeAdult ?? 1,
    thrill_tolerance: trip.thrillTolerance || null,
    mobility_notes: trip.mobilityNotes?.trim() || null,
    dietary_restrictions: trip.dietaryRestrictions?.trim() || null,
    first_timer_focus: trip.firstTimerFocus || null,
  }
}

export const DESTINATIONS = [
  { value: 'disney-world', label: 'Walt Disney World (Florida)' },
  { value: 'disneyland', label: 'Disneyland (California)' },
]

/** WDW parks (theme + water + Springs) */
export const WDW_PARK_OPTIONS = [
  { value: 'magic-kingdom', label: 'Magic Kingdom' },
  { value: 'epcot', label: 'EPCOT' },
  { value: 'hollywood-studios', label: "Disney's Hollywood Studios" },
  { value: 'animal-kingdom', label: "Disney's Animal Kingdom" },
  { value: 'typhoon-lagoon', label: 'Typhoon Lagoon' },
  { value: 'blizzard-beach', label: 'Blizzard Beach' },
  { value: 'disney-springs', label: 'Disney Springs' },
]

export const DL_PARK_OPTIONS = [
  { value: 'disneyland-park', label: 'Disneyland Park' },
  { value: 'california-adventure', label: 'Disney California Adventure' },
  { value: 'downtown-disney', label: 'Downtown Disney' },
]

export const THRILL_TOLERANCE_OPTIONS = [
  {
    value: 'no_scary',
    label: 'No scary rides — gentle attractions & shows',
    description: 'Avoid dark rides, big drops, and intense motion.',
  },
  {
    value: 'some_thrills',
    label: 'Some thrills — mix of mild and moderate',
    description: 'Okay with a few bigger rides if we build up to them.',
  },
  {
    value: 'bring_it_on',
    label: 'Bring it on — coasters & intensity welcome',
    description: 'Love the big thrills and want to ride the headliners.',
  },
]

export const FIRST_TIMER_FOCUS_OPTIONS = [
  { value: 'rides', label: 'Rides & attractions' },
  { value: 'characters', label: 'Character meets & greets' },
  { value: 'shows', label: 'Shows, parades & fireworks' },
  { value: 'food', label: 'Food & dining' },
]

/** Map thrill tolerance to legacy ride_preference for older tools */
export function thrillToRidePreference(thrill) {
  if (thrill === 'no_scary') return 'mild'
  if (thrill === 'some_thrills') return 'mix'
  if (thrill === 'bring_it_on') return 'thrill'
  return 'mix'
}

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
