/**
 * Map backend snake_case trip JSON to frontend camelCase trip object.
 * Developed by Sydney Edwards.
 */

/** @param {Record<string, unknown> | null | undefined} data */
export function tripFromApi(data) {
  if (!data) return null
  const pa = data.party_age_adult
  const pt = data.party_age_teen
  const c712 = data.party_age_7_12
  const u7 = data.party_age_under_7
  const derivedAdults =
    pa != null || pt != null
      ? (pa ?? 0) + (pt ?? 0)
      : data.number_of_adults ?? 1
  const derivedChildren =
    u7 != null || c712 != null
      ? (u7 ?? 0) + (c712 ?? 0)
      : data.number_of_children ?? 0
  return {
    destination: data.destination,
    arrivalDate: data.arrival_date ?? '',
    departureDate: data.departure_date ?? '',
    numberOfAdults: Math.max(1, derivedAdults),
    numberOfChildren: derivedChildren,
    childAges: data.child_ages ?? [],
    datesFlexible: data.dates_flexible ?? false,
    flexibleTravelPeriod: data.flexible_travel_period ?? '',
    parkDays: data.park_days ?? '',
    onSite: data.on_site ?? null,
    resortTier: data.resort_tier ?? '',
    firstVisit: data.first_visit ?? null,
    specialOccasion: data.special_occasion ?? '',
    priorities: data.priorities ?? [],
    tripPace: data.trip_pace ?? '',
    budgetVibe: data.budget_vibe ?? '',
    ridePreference: data.ride_preference ?? '',
    geniePlusInterest: data.genie_plus_interest ?? '',
    dietaryNotes: data.dietary_notes ?? '',
    lengthOfStayDays: data.length_of_stay_days,
    parksPlanned: data.parks_planned ?? [],
    parkScheduleNotes: data.park_schedule_notes ?? '',
    partyAgeUnder7: data.party_age_under_7 ?? 0,
    partyAge7To12: data.party_age_7_12 ?? 0,
    partyAgeTeen: data.party_age_teen ?? 0,
    partyAgeAdult: data.party_age_adult ?? 1,
    thrillTolerance: data.thrill_tolerance ?? 'some_thrills',
    mobilityNotes: data.mobility_notes ?? '',
    dietaryRestrictions: data.dietary_restrictions ?? '',
    firstTimerFocus: data.first_timer_focus ?? 'rides',
  }
}
