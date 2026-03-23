/**
 * Developed by Sydney Edwards
 * First-time visitor wizard: parks & dates, party by age, thrill level, mobility/diet, top priority, then save.
 */
import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CalendarRange,
  Users,
  Gauge,
  Accessibility,
  Target,
  Save,
} from 'lucide-react'
import {
  TextField,
  TextAreaField,
  CheckboxField,
  RadioCard,
  Button,
  SelectField,
} from '../ui'
import {
  DESTINATIONS,
  WDW_PARK_OPTIONS,
  DL_PARK_OPTIONS,
  THRILL_TOLERANCE_OPTIONS,
  FIRST_TIMER_FOCUS_OPTIONS,
  thrillToRidePreference,
} from '../tripInfo'

const today = () => new Date().toISOString().slice(0, 10)

const STEPS = [
  {
    id: 'parks-days',
    title: 'Parks & dates',
    Icon: CalendarRange,
  },
  { id: 'party', title: 'Your group', Icon: Users },
  { id: 'thrill', title: 'Thrill level', Icon: Gauge },
  { id: 'comfort', title: 'Comfort & dining', Icon: Accessibility },
  { id: 'priority', title: 'Top priority', Icon: Target },
  { id: 'save', title: 'Save trip?', Icon: Save },
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

function defaultTrip(initialTrip) {
  return {
    destination: initialTrip?.destination ?? 'disney-world',
    arrivalDate: initialTrip?.arrivalDate ?? '',
    departureDate: initialTrip?.departureDate ?? '',
    parksPlanned: initialTrip?.parksPlanned ?? [],
    parkScheduleNotes: initialTrip?.parkScheduleNotes ?? '',
    partyAgeUnder7: initialTrip?.partyAgeUnder7 ?? 0,
    partyAge7To12: initialTrip?.partyAge7To12 ?? 0,
    partyAgeTeen: initialTrip?.partyAgeTeen ?? 0,
    partyAgeAdult: initialTrip?.partyAgeAdult ?? 1,
    thrillTolerance: initialTrip?.thrillTolerance ?? 'some_thrills',
    mobilityNotes: initialTrip?.mobilityNotes ?? '',
    dietaryRestrictions: initialTrip?.dietaryRestrictions ?? '',
    firstTimerFocus: initialTrip?.firstTimerFocus ?? 'rides',
    ...initialTrip,
  }
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
  const [trip, setTrip] = useState(() => defaultTrip(initialTrip))

  function update(fields) {
    setTrip((t) => ({ ...t, ...fields }))
  }

  function togglePark(id) {
    setTrip((t) => ({
      ...t,
      parksPlanned: t.parksPlanned.includes(id)
        ? t.parksPlanned.filter((p) => p !== id)
        : [...t.parksPlanned, id],
    }))
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
    const arrival = trip.arrivalDate || null
    const departure = trip.departureDate || null
    let lengthOfStayDays = null
    if (arrival && departure) {
      const a = new Date(arrival)
      const b = new Date(departure)
      lengthOfStayDays =
        Math.max(0, Math.ceil((b - a) / (1000 * 60 * 60 * 24))) + 1
    }
    const pa = Number(trip.partyAgeAdult) || 0
    const pt = Number(trip.partyAgeTeen) || 0
    const c712 = Number(trip.partyAge7To12) || 0
    const u7 = Number(trip.partyAgeUnder7) || 0
    const numberOfAdults = Math.max(1, pa + pt)
    const numberOfChildren = u7 + c712

    onSubmit({
      ...trip,
      arrivalDate: arrival,
      departureDate: departure,
      lengthOfStayDays,
      firstVisit: true,
      numberOfAdults,
      numberOfChildren,
      childAges: undefined,
      priorities: trip.firstTimerFocus ? [trip.firstTimerFocus] : undefined,
      ridePreference: thrillToRidePreference(trip.thrillTolerance),
      datesFlexible: false,
      saveTripData,
    })
  }

  const isFirst = step === 1
  const isDone = step === TOTAL_STEPS
  const progressPct = (step / TOTAL_STEPS) * 100
  const stepMeta = STEPS[step - 1]
  const StepIcon = stepMeta.Icon

  const parkOptions =
    trip.destination === 'disneyland' ? DL_PARK_OPTIONS : WDW_PARK_OPTIONS

  return (
    <div className="mx-auto mb-6 max-w-md">
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
      <p className="mb-2 text-center text-[0.7rem] font-semibold uppercase tracking-wide text-[var(--color-lilac-strong)]">
        First visit? Let&apos;s plan your magic
      </p>
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
                    Which parks are you visiting—and when?
                  </h2>
                  <p className="mb-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
                    Pick your resort, trip dates, and every park you plan to
                    visit. Add a day-by-day note if you already know
                    it—we&apos;ll use this in every answer.
                  </p>
                  <SelectField
                    label="Resort destination"
                    value={trip.destination}
                    onChange={(e) =>
                      update({ destination: e.target.value, parksPlanned: [] })
                    }
                  >
                    {DESTINATIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </SelectField>
                  <div className="mb-4 flex flex-col gap-4 sm:flex-row">
                    <TextField
                      className="min-w-0 flex-1"
                      label="Trip start (arrival)"
                      type="date"
                      value={trip.arrivalDate}
                      onChange={(e) => update({ arrivalDate: e.target.value })}
                      min={today()}
                    />
                    <TextField
                      className="min-w-0 flex-1"
                      label="Trip end (departure)"
                      type="date"
                      value={trip.departureDate}
                      onChange={(e) =>
                        update({ departureDate: e.target.value })
                      }
                      min={trip.arrivalDate || today()}
                    />
                  </div>
                  <p className="mb-2 text-xs font-medium text-[var(--color-text-muted)]">
                    Select each park you plan to visit
                  </p>
                  <div className="mb-4 flex flex-col gap-2">
                    {parkOptions.map((o) => (
                      <CheckboxField
                        key={o.value}
                        checked={trip.parksPlanned.includes(o.value)}
                        onChange={() => togglePark(o.value)}
                      >
                        {o.label}
                      </CheckboxField>
                    ))}
                  </div>
                  <TextAreaField
                    label="Day-by-day plan (optional)"
                    placeholder="e.g. Day 1: Magic Kingdom, Day 2: EPCOT & Disney Springs…"
                    value={trip.parkScheduleNotes}
                    onChange={(e) =>
                      update({ parkScheduleNotes: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="mb-2 font-display text-xl font-semibold text-[var(--color-text-heading)]">
                    Who&apos;s in your group?
                  </h2>
                  <p className="mb-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
                    Count each person once. We use this for rides, height rules,
                    pacing, and dining.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      label="Under 7"
                      type="number"
                      min={0}
                      max={20}
                      inputClassName="max-w-full"
                      value={trip.partyAgeUnder7}
                      onChange={(e) =>
                        update({
                          partyAgeUnder7: Math.max(
                            0,
                            Number(e.target.value) || 0
                          ),
                        })
                      }
                    />
                    <TextField
                      label="Ages 7–12"
                      type="number"
                      min={0}
                      max={20}
                      value={trip.partyAge7To12}
                      onChange={(e) =>
                        update({
                          partyAge7To12: Math.max(
                            0,
                            Number(e.target.value) || 0
                          ),
                        })
                      }
                    />
                    <TextField
                      label="Teens (13–17)"
                      type="number"
                      min={0}
                      max={20}
                      value={trip.partyAgeTeen}
                      onChange={(e) =>
                        update({
                          partyAgeTeen: Math.max(
                            0,
                            Number(e.target.value) || 0
                          ),
                        })
                      }
                    />
                    <TextField
                      label="Adults (18+)"
                      type="number"
                      min={1}
                      max={20}
                      value={trip.partyAgeAdult}
                      onChange={(e) =>
                        update({
                          partyAgeAdult: Math.max(
                            1,
                            Number(e.target.value) || 1
                          ),
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h2 className="mb-2 font-display text-xl font-semibold text-[var(--color-text-heading)]">
                    What&apos;s your thrill tolerance?
                  </h2>
                  <p className="mb-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
                    We&apos;ll match rides and shows to what feels right—no
                    judgment either way.
                  </p>
                  <div className="flex flex-col gap-3">
                    {THRILL_TOLERANCE_OPTIONS.map((o) => (
                      <RadioCard
                        key={o.value}
                        name="thrill"
                        radioValue={o.value}
                        checked={trip.thrillTolerance === o.value}
                        onChange={() => update({ thrillTolerance: o.value })}
                      >
                        <span className="font-medium">{o.label}</span>
                        <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
                          {o.description}
                        </span>
                      </RadioCard>
                    ))}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div>
                  <h2 className="mb-2 font-display text-xl font-semibold text-[var(--color-text-heading)]">
                    Mobility & dining needs
                  </h2>
                  <p className="mb-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
                    Wheelchairs, ECVs, allergies, or other needs—so we can
                    suggest realistic routes and restaurants.
                  </p>
                  <TextAreaField
                    label="Mobility & accessibility"
                    placeholder="e.g. ECV, difficulty standing in long lines, need frequent breaks…"
                    value={trip.mobilityNotes}
                    onChange={(e) => update({ mobilityNotes: e.target.value })}
                    rows={3}
                  />
                  <TextAreaField
                    label="Dietary restrictions"
                    placeholder="e.g. vegetarian, nut allergy, gluten-free, kosher…"
                    value={trip.dietaryRestrictions}
                    onChange={(e) =>
                      update({ dietaryRestrictions: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              )}

              {step === 5 && (
                <div>
                  <h2 className="mb-2 font-display text-xl font-semibold text-[var(--color-text-heading)]">
                    What matters most on this trip?
                  </h2>
                  <p className="mb-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
                    Pick the one pillar we should lean on—we&apos;ll still keep
                    the rest in balance.
                  </p>
                  <div className="flex flex-col gap-2">
                    {FIRST_TIMER_FOCUS_OPTIONS.map((o) => (
                      <RadioCard
                        key={o.value}
                        name="focus"
                        radioValue={o.value}
                        checked={trip.firstTimerFocus === o.value}
                        onChange={() => update({ firstTimerFocus: o.value })}
                      >
                        {o.label}
                      </RadioCard>
                    ))}
                  </div>
                </div>
              )}

              {step === 6 && (
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
                        We only save your trip if you opt in below. Your data is
                        tied to your account.
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
                        Saving requires an account so you can return on any
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
            {isDone ? 'Start planning' : 'Next'}
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
