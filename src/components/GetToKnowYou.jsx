/**
 * Developed by Sydney Edwards
 * Multi-step "get to know you" questionnaire: destination, dates, party, stay, vibe, priorities, and save-trip opt-in.
 * Step 8 shows sign-in prompt when not logged in; when logged in, allows saving trip to account.
 */
import { useState, useEffect } from 'react'
import MickeyIcon from '../MickeyIcon.jsx'
import {
  DESTINATIONS,
  CHILD_AGE_RANGE_OPTIONS,
  PRIORITY_OPTIONS,
  STAY_OPTIONS,
  RESORT_TIER_OPTIONS,
  TRIP_PACE_OPTIONS,
  SPECIAL_OCCASION_OPTIONS,
  FLEXIBLE_TRAVEL_PERIOD_OPTIONS,
  BUDGET_VIBE_OPTIONS,
  RIDE_PREFERENCE_OPTIONS,
  GENIE_PLUS_OPTIONS,
} from '../tripInfo'
import './GetToKnowYou.css'

const today = () => new Date().toISOString().slice(0, 10)

const STEPS = [
  { id: 'destination', title: "Where's the magic?" },
  { id: 'dates', title: 'When are you going?' },
  { id: 'crew', title: "Who's in your crew?" },
  { id: 'stay', title: 'Where do you want to stay?' },
  { id: 'first-time', title: 'First time or coming back?' },
  { id: 'vibe', title: "What's your vibe?" },
  { id: 'details', title: 'A few more details' },
  { id: 'extra', title: 'Anything else we should know?' },
  { id: 'save', title: 'Save your trip?' },
]

const TOTAL_STEPS = STEPS.length

export default function GetToKnowYou({
  initialTrip,
  initialSaveTripData = false,
  isLoggedIn = false,
  onOpenAuth,
  onSubmit,
  onSkip,
}) {
  const [step, setStep] = useState(1)
  const [saveTripData, setSaveTripData] = useState(!!initialSaveTripData)
  const [trip, setTrip] = useState(() => ({
    destination: initialTrip?.destination ?? 'disney-world',
    arrivalDate: initialTrip?.arrivalDate ?? '',
    departureDate: initialTrip?.departureDate ?? '',
    numberOfAdults: initialTrip?.numberOfAdults ?? 1,
    numberOfChildren: initialTrip?.numberOfChildren ?? 0,
    childAges: initialTrip?.childAges ?? [],
    datesFlexible: initialTrip?.datesFlexible ?? false,
    flexibleTravelPeriod: initialTrip?.flexibleTravelPeriod ?? '',
    parkDays: initialTrip?.parkDays ?? '',
    onSite: initialTrip?.onSite ?? null,
    resortTier: initialTrip?.resortTier ?? '',
    firstVisit: initialTrip?.firstVisit ?? null,
    specialOccasion: initialTrip?.specialOccasion ?? '',
    priorities: initialTrip?.priorities ?? [],
    tripPace: initialTrip?.tripPace ?? '',
    budgetVibe: initialTrip?.budgetVibe ?? '',
    ridePreference: initialTrip?.ridePreference ?? '',
    geniePlusInterest: initialTrip?.geniePlusInterest ?? '',
    dietaryNotes: initialTrip?.dietaryNotes ?? '',
    ...initialTrip,
  }))

  const numChildren = Math.max(0, Number(trip.numberOfChildren) || 0)

  useEffect(() => {
    if (numChildren > trip.childAges.length) {
      setTrip((t) => ({
        ...t,
        childAges: [
          ...t.childAges,
          ...Array(numChildren - t.childAges.length).fill(''),
        ],
      }))
    } else if (numChildren < trip.childAges.length) {
      setTrip((t) => ({ ...t, childAges: t.childAges.slice(0, numChildren) }))
    }
  }, [numChildren, trip.childAges.length])

  function update(fields) {
    setTrip((t) => ({ ...t, ...fields }))
  }

  function next() {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  function back() {
    setStep((s) => Math.max(1, s - 1))
  }

  function buildAndSubmit() {
    const arrival = trip.datesFlexible ? null : trip.arrivalDate || null
    const departure = trip.datesFlexible ? null : trip.departureDate || null
    let lengthOfStayDays = null
    if (arrival && departure) {
      const a = new Date(arrival)
      const b = new Date(departure)
      lengthOfStayDays =
        Math.max(0, Math.ceil((b - a) / (1000 * 60 * 60 * 24))) + 1
    }
    const ages = trip.childAges
      .slice(0, numChildren)
      .filter((a) => a !== undefined && a !== '')
    const parkDaysNum = trip.parkDays === '' || trip.parkDays == null ? undefined : Number(trip.parkDays)
    onSubmit({
      ...trip,
      arrivalDate: arrival,
      departureDate: departure,
      lengthOfStayDays,
      childAges: ages.length ? ages : undefined,
      resortTier: trip.resortTier || undefined,
      specialOccasion: trip.specialOccasion || undefined,
      tripPace: trip.tripPace || undefined,
      flexibleTravelPeriod: trip.flexibleTravelPeriod || undefined,
      parkDays: parkDaysNum,
      budgetVibe: trip.budgetVibe || undefined,
      ridePreference: trip.ridePreference || undefined,
      geniePlusInterest: trip.geniePlusInterest || undefined,
      dietaryNotes: trip.dietaryNotes?.trim() || undefined,
      onSite: trip.onSite,
      saveTripData,
    })
  }

  const isFirst = step === 1
  const isDone = step === TOTAL_STEPS

  return (
    <div className="get-to-know-you">
      <div className="get-to-know-you__progress">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`get-to-know-you__dot ${i + 1 <= step ? 'get-to-know-you__dot--active' : ''}`}
            onClick={() => setStep(i + 1)}
            aria-label={`Go to step ${i + 1}: ${s.title}`}
            title={s.title}
          />
        ))}
      </div>
      <p className="get-to-know-you__step-label">
        Step {step} of {TOTAL_STEPS}
      </p>

      <div className="get-to-know-you__card">
        {step === 1 && (
          <>
            <h2 className="get-to-know-you__question">
              Where&apos;s the magic calling you?
            </h2>
            <p className="get-to-know-you__hint">
              We&apos;ll tailor park hours, dining, rides, and tips to this destination.
            </p>
            <select
              className="get-to-know-you__select"
              value={trip.destination}
              onChange={(e) => update({ destination: e.target.value })}
            >
              {DESTINATIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="get-to-know-you__question">When are you going?</h2>
            <p className="get-to-know-you__hint">
              We&apos;ll use this for crowd levels, seasonal events, and how many park days to plan.
            </p>
            <label className="get-to-know-you__checkbox">
              <input
                type="checkbox"
                checked={trip.datesFlexible}
                onChange={(e) => update({ datesFlexible: e.target.checked })}
              />
              My dates are flexible
            </label>
            {trip.datesFlexible && (
              <label className="get-to-know-you__label">
                Roughly when? (helps with crowd & event tips)
                <select
                  className="get-to-know-you__select"
                  value={trip.flexibleTravelPeriod}
                  onChange={(e) => update({ flexibleTravelPeriod: e.target.value })}
                >
                  {FLEXIBLE_TRAVEL_PERIOD_OPTIONS.map((o) => (
                    <option key={o.value || 'none'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {!trip.datesFlexible && (
              <div className="get-to-know-you__row">
                <label className="get-to-know-you__label">
                  Arrival
                  <input
                    type="date"
                    className="get-to-know-you__input"
                    value={trip.arrivalDate}
                    onChange={(e) => update({ arrivalDate: e.target.value })}
                    min={today()}
                  />
                </label>
                <label className="get-to-know-you__label">
                  Departure
                  <input
                    type="date"
                    className="get-to-know-you__input"
                    value={trip.departureDate}
                    onChange={(e) => update({ departureDate: e.target.value })}
                    min={trip.arrivalDate || today()}
                  />
                </label>
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="get-to-know-you__question">
              Who&apos;s in your crew?
            </h2>
            <p className="get-to-know-you__hint">
              We&apos;ll suggest rides by height, age-appropriate experiences, and dining that fits your group.
            </p>
            <div className="get-to-know-you__row">
              <label className="get-to-know-you__label">
                Adults
                <input
                  type="number"
                  className="get-to-know-you__input get-to-know-you__input--narrow"
                  min={1}
                  max={20}
                  value={trip.numberOfAdults}
                  onChange={(e) =>
                    update({ numberOfAdults: Number(e.target.value) || 1 })
                  }
                />
              </label>
              <label className="get-to-know-you__label">
                Children
                <input
                  type="number"
                  className="get-to-know-you__input get-to-know-you__input--narrow"
                  min={0}
                  max={20}
                  value={trip.numberOfChildren}
                  onChange={(e) =>
                    update({ numberOfChildren: Number(e.target.value) || 0 })
                  }
                />
              </label>
            </div>
            {numChildren > 0 && (
              <div className="get-to-know-you__child-ages">
                <span className="get-to-know-you__label">Ages of children (we use this for height requirements & age-appropriate tips)</span>
                <div className="get-to-know-you__child-ages-inputs">
                  {trip.childAges.slice(0, numChildren).map((ageRange, i) => (
                    <label key={i} className="get-to-know-you__label">
                      Child {i + 1}
                      <select
                        className="get-to-know-you__select get-to-know-you__select--inline"
                        value={ageRange === '' ? '' : ageRange}
                        onChange={(e) => {
                          const next = [...trip.childAges]
                          next[i] = e.target.value
                          update({ childAges: next })
                        }}
                      >
                        <option value="">Select…</option>
                        {CHILD_AGE_RANGE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="get-to-know-you__question">
              Where do you want to stay?
            </h2>
            <p className="get-to-know-you__hint">
              We&apos;ll factor in Early Theme Park Entry, transportation, and resort recommendations.
            </p>
            <div className="get-to-know-you__choices">
              {STAY_OPTIONS.map((o) => {
                const isSelected =
                  (o.value === 'on-site' && trip.onSite === true) ||
                  (o.value === 'off-site' && trip.onSite === false) ||
                  (o.value === 'unsure' &&
                    (trip.onSite === null || trip.onSite === undefined))
                return (
                  <label
                    key={o.value}
                    className={`get-to-know-you__choice ${
                      isSelected ? 'get-to-know-you__choice--selected' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="stay"
                      value={o.value}
                      checked={isSelected}
                      onChange={() =>
                        update({
                          onSite:
                            o.value === 'on-site'
                              ? true
                              : o.value === 'off-site'
                                ? false
                                : null,
                          resortTier:
                            o.value === 'on-site' ? trip.resortTier : '',
                        })
                      }
                    />
                    {o.label}
                  </label>
                )
              })}
            </div>
            {trip.onSite === true && (
              <label className="get-to-know-you__label">
                Resort tier
                <select
                  className="get-to-know-you__select"
                  value={trip.resortTier}
                  onChange={(e) => update({ resortTier: e.target.value })}
                >
                  {RESORT_TIER_OPTIONS.map((o) => (
                    <option key={o.value || 'unsure'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </>
        )}

        {step === 5 && (
          <>
            <h2 className="get-to-know-you__question">
              First time or coming back?
            </h2>
            <p className="get-to-know-you__hint">
              We&apos;ll adjust our advice — more how-to for first-timers, shortcuts and deeper tips for returning guests.
            </p>
            <div className="get-to-know-you__choices">
              <label
                className={`get-to-know-you__choice ${
                  trip.firstVisit === true
                    ? 'get-to-know-you__choice--selected'
                    : ''
                }`}
              >
                <input
                  type="radio"
                  name="first"
                  checked={trip.firstVisit === true}
                  onChange={() => update({ firstVisit: true })}
                />
                First time!
              </label>
              <label
                className={`get-to-know-you__choice ${
                  trip.firstVisit === false
                    ? 'get-to-know-you__choice--selected'
                    : ''
                }`}
              >
                <input
                  type="radio"
                  name="first"
                  checked={trip.firstVisit === false}
                  onChange={() => update({ firstVisit: false })}
                />
                I&apos;ve been before
              </label>
            </div>
            <label className="get-to-know-you__label">
              Celebrating something?
              <select
                className="get-to-know-you__select"
                value={trip.specialOccasion}
                onChange={(e) => update({ specialOccasion: e.target.value })}
              >
                {SPECIAL_OCCASION_OPTIONS.map((o) => (
                  <option key={o.value || 'none'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="get-to-know-you__hint" style={{ marginTop: '0.75rem' }}>
              We&apos;ll suggest ways to make the celebration extra magical.
            </p>
          </>
        )}

        {step === 6 && (
          <>
            <h2 className="get-to-know-you__question">
              What&apos;s your vibe?
            </h2>
            <p className="get-to-know-you__hint">
              We&apos;ll prioritize recommendations and daily pacing from what you pick.
            </p>
            <div className="get-to-know-you__priorities">
              {PRIORITY_OPTIONS.map((o) => (
                <label key={o.value} className="get-to-know-you__checkbox">
                  <input
                    type="checkbox"
                    checked={trip.priorities.includes(o.value)}
                    onChange={() => {
                      const next = trip.priorities.includes(o.value)
                        ? trip.priorities.filter((p) => p !== o.value)
                        : [...trip.priorities, o.value]
                      update({ priorities: next })
                    }}
                  />
                  {o.label}
                </label>
              ))}
            </div>
            <label className="get-to-know-you__label">
              Trip pace
              <select
                className="get-to-know-you__select"
                value={trip.tripPace}
                onChange={(e) => update({ tripPace: e.target.value })}
              >
                <option value="">Select…</option>
                {TRIP_PACE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="get-to-know-you__hint" style={{ marginTop: '0.75rem' }}>
              This helps us suggest how many activities per day and when to build in rest.
            </p>
          </>
        )}

        {step === 7 && (
          <>
            <h2 className="get-to-know-you__question">
              A few more details
            </h2>
            <p className="get-to-know-you__hint">
              These help us recommend park days, dining, rides, and whether to explain Genie+ or Lightning Lanes.
            </p>
            <label className="get-to-know-you__label">
              How many park days? (if you know)
              <input
                type="number"
                className="get-to-know-you__input get-to-know-you__input--narrow"
                min={1}
                max={14}
                placeholder="e.g. 4"
                value={trip.parkDays === '' ? '' : trip.parkDays}
                onChange={(e) => {
                  const v = e.target.value
                  update({ parkDays: v === '' ? '' : Number(v) || '' })
                }}
              />
            </label>
            <label className="get-to-know-you__label">
              Budget for dining & extras
              <select
                className="get-to-know-you__select"
                value={trip.budgetVibe}
                onChange={(e) => update({ budgetVibe: e.target.value })}
              >
                {BUDGET_VIBE_OPTIONS.map((o) => (
                  <option key={o.value || 'none'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="get-to-know-you__label">
              Ride style
              <select
                className="get-to-know-you__select"
                value={trip.ridePreference}
                onChange={(e) => update({ ridePreference: e.target.value })}
              >
                {RIDE_PREFERENCE_OPTIONS.map((o) => (
                  <option key={o.value || 'none'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="get-to-know-you__label">
              Genie+ / Lightning Lanes
              <select
                className="get-to-know-you__select"
                value={trip.geniePlusInterest}
                onChange={(e) => update({ geniePlusInterest: e.target.value })}
              >
                {GENIE_PLUS_OPTIONS.map((o) => (
                  <option key={o.value || 'none'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {step === 8 && (
          <>
            <h2 className="get-to-know-you__question">
              Anything else we should know?
            </h2>
            <p className="get-to-know-you__hint">
              The more you share, the better we can personalize tips — dietary needs, must-do rides or characters, mobility or access needs, or what you&apos;re most excited about.
            </p>
            <label className="get-to-know-you__label">
              Dietary needs, must-dos, favorites, or other notes
              <textarea
                className="get-to-know-you__textarea"
                placeholder="e.g. vegetarian, nut allergy, must ride Rise of the Resistance, meeting Mickey, wheelchair access, or one thing you're most excited about…"
                value={trip.dietaryNotes}
                onChange={(e) => update({ dietaryNotes: e.target.value })}
                rows={3}
              />
            </label>
            <p className="get-to-know-you__hint" style={{ marginTop: '1rem' }}>
              Next: we&apos;ll ask whether you want to save your trip on the server.
            </p>
          </>
        )}

        {step === 9 && (
          <div
            className="get-to-know-you__data-storage"
            role="region"
            aria-labelledby="data-storage-heading"
          >
            <h2
              id="data-storage-heading"
              className="get-to-know-you__question get-to-know-you__data-storage-heading"
            >
              Save your trip on the server?
              {isLoggedIn && (
                <span className="info-icon-wrap">
                  <button
                    type="button"
                    className="info-icon"
                    aria-label="How is my saved data linked to me?"
                  >
                    ℹ
                  </button>
                  <span className="info-icon-tooltip" role="tooltip">
                    Your saved trip is stored on our servers and linked to your
                    account. Only you can see or delete it. We don&apos;t use
                    your IP address; access is tied to your sign-in.
                  </span>
                </span>
              )}
            </h2>
            {isLoggedIn ? (
              <>
                <p className="get-to-know-you__data-storage-text">
                  We do not save your trip details unless you turn on the option
                  below. Your data is tied to your account.
                </p>
                <label className="get-to-know-you__checkbox get-to-know-you__data-storage-opt-in">
                  <input
                    type="checkbox"
                    checked={saveTripData}
                    onChange={(e) => setSaveTripData(e.target.checked)}
                    aria-describedby="data-storage-opt-in-desc"
                  />
                  <span id="data-storage-opt-in-desc">
                    Save my trip on the server so I can return later. I
                    understand my trip details will be stored on the server.
                  </span>
                </label>
              </>
            ) : (
              <>
                <p className="get-to-know-you__data-storage-text">
                  Saving your trip requires an account. Sign in or create one to
                  save your trip and return to it later from any device.
                </p>
                <button
                  type="button"
                  className="get-to-know-you__btn get-to-know-you__btn--primary"
                  onClick={onOpenAuth}
                >
                  Sign in to save your trip
                </button>
              </>
            )}
          </div>
        )}

        <div className="get-to-know-you__actions">
          {!isFirst && !isDone && (
            <button
              type="button"
              className="get-to-know-you__btn get-to-know-you__btn--secondary"
              onClick={back}
            >
              Back
            </button>
          )}
          <div className="get-to-know-you__actions-spacer" />
          <button
            type="button"
            className="get-to-know-you__btn get-to-know-you__btn--primary"
            onClick={isDone ? buildAndSubmit : next}
          >
            {isDone ? 'Start my adventure' : 'Next'}
          </button>
        </div>
      </div>

      {step === 1 && onSkip && (
        <button
          type="button"
          className="get-to-know-you__skip"
          onClick={onSkip}
        >
          Skip for now — I&apos;ll just chat
        </button>
      )}
    </div>
  )
}
