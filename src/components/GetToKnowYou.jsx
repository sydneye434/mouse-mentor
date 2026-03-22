/**
 * Developed by Sydney Edwards
 * Wizard-style onboarding: one step per screen, slide transitions, lucide step icons, Tailwind UI components.
 */
import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  MapPin,
  Calendar,
  Users,
  Building2,
  Sparkles,
  PartyPopper,
  ClipboardList,
  MessageSquareText,
  Save,
} from 'lucide-react'
import {
  TextField,
  SelectField,
  TextAreaField,
  CheckboxField,
  RadioCard,
  Button,
} from '../ui'
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

const today = () => new Date().toISOString().slice(0, 10)

const STEPS = [
  { id: 'destination', title: "Where's the magic?", Icon: MapPin },
  { id: 'dates', title: 'When are you going?', Icon: Calendar },
  { id: 'crew', title: "Who's in your crew?", Icon: Users },
  { id: 'stay', title: 'Where do you want to stay?', Icon: Building2 },
  { id: 'first-time', title: 'First time or coming back?', Icon: Sparkles },
  { id: 'vibe', title: "What's your vibe?", Icon: PartyPopper },
  { id: 'details', title: 'A few more details', Icon: ClipboardList },
  { id: 'extra', title: 'Anything else we should know?', Icon: MessageSquareText },
  { id: 'save', title: 'Save your trip?', Icon: Save },
]

const TOTAL_STEPS = STEPS.length

const slideVariants = {
  enter: (dir) => ({
    x: dir > 0 ? 40 : dir < 0 ? -40 : 0,
    opacity: dir === 0 ? 1 : 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({
    x: dir > 0 ? -40 : dir < 0 ? 40 : 0,
    opacity: 0,
  }),
}

export default function GetToKnowYou({
  initialTrip,
  initialSaveTripData = false,
  isLoggedIn = false,
  onOpenAuth,
  onSubmit,
  onSkip,
}) {
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(0)
  const prevStepRef = useRef(1)

  useEffect(() => {
    if (prevStepRef.current !== step) {
      setDirection(
        step > prevStepRef.current ? 1 : step < prevStepRef.current ? -1 : 0
      )
      prevStepRef.current = step
    }
  }, [step])
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

  function goToDot(idx) {
    const target = idx + 1
    if (target === step) return
    setStep(target)
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
    const parkDaysNum =
      trip.parkDays === '' || trip.parkDays == null
        ? undefined
        : Number(trip.parkDays)
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
  const progressPct = (step / TOTAL_STEPS) * 100
  const stepMeta = STEPS[step - 1]
  const StepIcon = stepMeta.Icon

  return (
    <div className="mx-auto mb-6 max-w-md">
      {/* Progress */}
      <div className="mb-2">
        <div
          className="mb-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]"
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-label={`Onboarding step ${step} of ${TOTAL_STEPS}`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--color-pink-mid)] to-[var(--color-lilac-mid)] transition-[width] duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-center gap-1.5">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`h-2 w-2 rounded-full transition-all ${
                i + 1 <= step
                  ? 'scale-110 bg-[var(--color-pink-mid)]'
                  : 'bg-[var(--color-border)] hover:bg-[var(--color-lilac-mid)]'
              }`}
              onClick={() => goToDot(i)}
              aria-label={`Go to step ${i + 1}: ${s.title}`}
              title={s.title}
            />
          ))}
        </div>
      </div>
      <p className="mb-4 text-center text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        Step {step} of {TOTAL_STEPS}
      </p>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6">
        <div className="mb-5 flex justify-center">
          <div
            className="rounded-2xl bg-[var(--color-lilac-light)] p-4 text-[var(--color-lilac-strong)] ring-1 ring-[var(--color-border)]"
            aria-hidden
          >
            <StepIcon className="h-10 w-10" strokeWidth={1.5} />
          </div>
        </div>

        <div className="relative min-h-[12rem] overflow-hidden">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="will-change-transform"
            >
              {step === 1 && (
                <div>
                  <h2 className="mb-2 font-display text-xl font-semibold text-[var(--color-text-heading)]">
                    Where&apos;s the magic calling you?
                  </h2>
                  <p className="mb-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
                    We&apos;ll tailor park hours, dining, rides, and tips to
                    this destination.
                  </p>
                  <SelectField
                    label="Destination"
                    value={trip.destination}
                    onChange={(e) => update({ destination: e.target.value })}
                  >
                    {DESTINATIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </SelectField>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="mb-2 font-display text-xl font-semibold text-[var(--color-text-heading)]">
                    When are you going?
                  </h2>
                  <p className="mb-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
                    We&apos;ll use this for crowd levels, seasonal events, and
                    how many park days to plan.
                  </p>
                  <div className="mb-4">
                    <CheckboxField
                      checked={trip.datesFlexible}
                      onChange={(e) =>
                        update({ datesFlexible: e.target.checked })
                      }
                    >
                      My dates are flexible
                    </CheckboxField>
                  </div>
                  {trip.datesFlexible && (
                    <SelectField
                      label="Roughly when? (helps with crowd & event tips)"
                      value={trip.flexibleTravelPeriod}
                      onChange={(e) =>
                        update({ flexibleTravelPeriod: e.target.value })
                      }
                    >
                      {FLEXIBLE_TRAVEL_PERIOD_OPTIONS.map((o) => (
                        <option key={o.value || 'none'} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </SelectField>
                  )}
                  {!trip.datesFlexible && (
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <TextField
                        label="Arrival"
                        type="date"
                        value={trip.arrivalDate}
                        onChange={(e) => update({ arrivalDate: e.target.value })}
                        min={today()}
                      />
                      <TextField
                        label="Departure"
                        type="date"
                        value={trip.departureDate}
                        onChange={(e) =>
                          update({ departureDate: e.target.value })
                        }
                        min={trip.arrivalDate || today()}
                      />
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div>
                  <h2 className="mb-2 font-display text-xl font-semibold text-[var(--color-text-heading)]">
                    Who&apos;s in your crew?
                  </h2>
                  <p className="mb-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
                    We&apos;ll suggest rides by height, age-appropriate
                    experiences, and dining that fits your group.
                  </p>
                  <div className="mb-4 flex flex-col gap-4 sm:flex-row">
                    <TextField
                      label="Adults"
                      type="number"
                      min={1}
                      max={20}
                      inputClassName="w-full sm:w-24"
                      value={trip.numberOfAdults}
                      onChange={(e) =>
                        update({ numberOfAdults: Number(e.target.value) || 1 })
                      }
                    />
                    <TextField
                      label="Children"
                      type="number"
                      min={0}
                      max={20}
                      inputClassName="w-full sm:w-24"
                      value={trip.numberOfChildren}
                      onChange={(e) =>
                        update({ numberOfChildren: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                  {numChildren > 0 && (
                    <div className="mb-2">
                      <span className="mb-2 block text-xs font-medium text-[var(--color-text-muted)]">
                        Ages of children (height & age tips)
                      </span>
                      <div className="flex flex-wrap gap-4">
                        {trip.childAges.slice(0, numChildren).map((ageRange, i) => (
                          <SelectField
                            key={i}
                            label={`Child ${i + 1}`}
                            className="min-w-[10rem] flex-1"
                            selectClassName="min-w-[9rem]"
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
                          </SelectField>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 4 && (
                <div>
                  <h2 className="mb-2 font-display text-xl font-semibold text-[var(--color-text-heading)]">
                    Where do you want to stay?
                  </h2>
                  <p className="mb-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
                    We&apos;ll factor in Early Theme Park Entry, transportation,
                    and resort recommendations.
                  </p>
                  <div className="mb-4 flex flex-col gap-2">
                    {STAY_OPTIONS.map((o) => {
                      const isSelected =
                        (o.value === 'on-site' && trip.onSite === true) ||
                        (o.value === 'off-site' && trip.onSite === false) ||
                        (o.value === 'unsure' &&
                          (trip.onSite === null || trip.onSite === undefined))
                      return (
                        <RadioCard
                          key={o.value}
                          name="stay"
                          radioValue={o.value}
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
                        >
                          {o.label}
                        </RadioCard>
                      )
                    })}
                  </div>
                  {trip.onSite === true && (
                    <SelectField
                      label="Resort tier"
                      value={trip.resortTier}
                      onChange={(e) => update({ resortTier: e.target.value })}
                    >
                      {RESORT_TIER_OPTIONS.map((o) => (
                        <option key={o.value || 'unsure'} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </SelectField>
                  )}
                </div>
              )}

              {step === 5 && (
                <div>
                  <h2 className="mb-2 font-display text-xl font-semibold text-[var(--color-text-heading)]">
                    First time or coming back?
                  </h2>
                  <p className="mb-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
                    We&apos;ll adjust our advice — more how-to for first-timers,
                    shortcuts for returning guests.
                  </p>
                  <div className="mb-4 flex flex-col gap-2">
                    <RadioCard
                      name="first"
                      radioValue="yes"
                      checked={trip.firstVisit === true}
                      onChange={() => update({ firstVisit: true })}
                    >
                      First time!
                    </RadioCard>
                    <RadioCard
                      name="first"
                      radioValue="no"
                      checked={trip.firstVisit === false}
                      onChange={() => update({ firstVisit: false })}
                    >
                      I&apos;ve been before
                    </RadioCard>
                  </div>
                  <SelectField
                    label="Celebrating something?"
                    value={trip.specialOccasion}
                    onChange={(e) => update({ specialOccasion: e.target.value })}
                  >
                    {SPECIAL_OCCASION_OPTIONS.map((o) => (
                      <option key={o.value || 'none'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </SelectField>
                  <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                    We&apos;ll suggest ways to make the celebration extra
                    magical.
                  </p>
                </div>
              )}

              {step === 6 && (
                <div>
                  <h2 className="mb-2 font-display text-xl font-semibold text-[var(--color-text-heading)]">
                    What&apos;s your vibe?
                  </h2>
                  <p className="mb-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
                    We&apos;ll prioritize recommendations and daily pacing from
                    what you pick.
                  </p>
                  <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {PRIORITY_OPTIONS.map((o) => (
                      <CheckboxField
                        key={o.value}
                        checked={trip.priorities.includes(o.value)}
                        onChange={() => {
                          const next = trip.priorities.includes(o.value)
                            ? trip.priorities.filter((p) => p !== o.value)
                            : [...trip.priorities, o.value]
                          update({ priorities: next })
                        }}
                      >
                        {o.label}
                      </CheckboxField>
                    ))}
                  </div>
                  <SelectField
                    label="Trip pace"
                    value={trip.tripPace}
                    onChange={(e) => update({ tripPace: e.target.value })}
                  >
                    <option value="">Select…</option>
                    {TRIP_PACE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </SelectField>
                  <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                    This helps us suggest how many activities per day and when
                    to build in rest.
                  </p>
                </div>
              )}

              {step === 7 && (
                <div>
                  <h2 className="mb-2 font-display text-xl font-semibold text-[var(--color-text-heading)]">
                    A few more details
                  </h2>
                  <p className="mb-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
                    Park days, dining budget, ride style, and Genie+ interest.
                  </p>
                  <TextField
                    label="How many park days? (if you know)"
                    type="number"
                    min={1}
                    max={14}
                    placeholder="e.g. 4"
                    inputClassName="max-w-[10rem]"
                    value={trip.parkDays === '' ? '' : trip.parkDays}
                    onChange={(e) => {
                      const v = e.target.value
                      update({ parkDays: v === '' ? '' : Number(v) || '' })
                    }}
                  />
                  <SelectField
                    label="Budget for dining & extras"
                    value={trip.budgetVibe}
                    onChange={(e) => update({ budgetVibe: e.target.value })}
                  >
                    {BUDGET_VIBE_OPTIONS.map((o) => (
                      <option key={o.value || 'none'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    label="Ride style"
                    value={trip.ridePreference}
                    onChange={(e) => update({ ridePreference: e.target.value })}
                  >
                    {RIDE_PREFERENCE_OPTIONS.map((o) => (
                      <option key={o.value || 'none'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    label="Genie+ / Lightning Lanes"
                    value={trip.geniePlusInterest}
                    onChange={(e) =>
                      update({ geniePlusInterest: e.target.value })
                    }
                  >
                    {GENIE_PLUS_OPTIONS.map((o) => (
                      <option key={o.value || 'none'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </SelectField>
                </div>
              )}

              {step === 8 && (
                <div>
                  <h2 className="mb-2 font-display text-xl font-semibold text-[var(--color-text-heading)]">
                    Anything else we should know?
                  </h2>
                  <p className="mb-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
                    Dietary needs, must-dos, favorites, mobility, or what
                    you&apos;re excited about.
                  </p>
                  <TextAreaField
                    label="Notes"
                    placeholder="e.g. vegetarian, nut allergy, must ride Rise of the Resistance…"
                    value={trip.dietaryNotes}
                    onChange={(e) => update({ dietaryNotes: e.target.value })}
                    rows={4}
                  />
                  <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                    Next: we&apos;ll ask whether you want to save your trip on
                    the server.
                  </p>
                </div>
              )}

              {step === 9 && (
                <div
                  className="rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-bg-surface-blue)] p-4"
                  role="region"
                  aria-labelledby="data-storage-heading"
                >
                  <h2
                    id="data-storage-heading"
                    className="mb-2 flex flex-wrap items-center gap-2 font-display text-xl font-semibold text-[var(--color-text-heading)]"
                  >
                    Save your trip on the server?
                    {isLoggedIn && (
                      <span className="group relative inline-flex items-center">
                        <button
                          type="button"
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--color-border)] text-xs font-semibold text-[var(--color-lilac-strong)]"
                          aria-label="How is my saved data linked to me?"
                        >
                          ℹ
                        </button>
                        <span
                          className="pointer-events-none invisible absolute bottom-full left-1/2 z-10 mb-1 w-[min(18rem,90vw)] -translate-x-1/2 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-2 text-xs font-normal text-[var(--color-text-body)] opacity-0 shadow-sm transition group-hover:visible group-hover:opacity-100"
                          role="tooltip"
                        >
                          Your saved trip is stored on our servers and linked to
                          your account. Only you can see or delete it.
                        </span>
                      </span>
                    )}
                  </h2>
                  {isLoggedIn ? (
                    <>
                      <p className="mb-3 text-sm text-[var(--color-text-muted)]">
                        We do not save your trip details unless you turn on the
                        option below. Your data is tied to your account.
                      </p>
                      <CheckboxField
                        checked={saveTripData}
                        onChange={(e) => setSaveTripData(e.target.checked)}
                      >
                        <span id="data-storage-opt-in-desc">
                          Save my trip on the server so I can return later. I
                          understand my trip details will be stored on the
                          server.
                        </span>
                      </CheckboxField>
                    </>
                  ) : (
                    <>
                      <p className="mb-3 text-sm text-[var(--color-text-muted)]">
                        Saving your trip requires an account. Sign in or create
                        one to save your trip and return to it later from any
                        device.
                      </p>
                      <Button type="button" onClick={onOpenAuth}>
                        Sign in to save your trip
                      </Button>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-6 flex items-center gap-2 border-t border-[var(--color-border)] pt-6">
          {!isFirst && !isDone && (
            <Button type="button" variant="secondary" onClick={back}>
              Back
            </Button>
          )}
          <div className="flex-1" />
          <Button type="button" onClick={isDone ? buildAndSubmit : next}>
            {isDone ? 'Start my adventure' : 'Next'}
          </Button>
        </div>
      </div>

      {step === 1 && onSkip && (
        <button
          type="button"
          className="mt-4 block w-full text-center text-sm text-[var(--color-lilac-strong)] underline-offset-2 hover:underline"
          onClick={onSkip}
        >
          Skip for now — I&apos;ll just chat
        </button>
      )}
    </div>
  )
}
