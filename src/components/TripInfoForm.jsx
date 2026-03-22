/**
 * Developed by Sydney Edwards
 * Single-page trip info form (destination, dates, party, etc.). Used when editing trip from TripSummary.
 */
import { useState, useEffect } from 'react'
import {
  DESTINATIONS,
  CHILD_AGE_RANGE_OPTIONS,
  PRIORITY_OPTIONS,
} from '../tripInfo'
import { TextField, SelectField, CheckboxField, Button } from '../ui'

const today = () => {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export default function TripInfoForm({ initialTrip, onSubmit }) {
  const [destination, setDestination] = useState(
    initialTrip?.destination ?? 'disney-world'
  )
  const [arrivalDate, setArrivalDate] = useState(initialTrip?.arrivalDate ?? '')
  const [departureDate, setDepartureDate] = useState(
    initialTrip?.departureDate ?? ''
  )
  const [numberOfAdults, setNumberOfAdults] = useState(
    initialTrip?.numberOfAdults ?? 1
  )
  const [numberOfChildren, setNumberOfChildren] = useState(
    initialTrip?.numberOfChildren ?? 0
  )
  const [childAges, setChildAges] = useState(() => {
    const ages = initialTrip?.childAges ?? []
    const n = initialTrip?.numberOfChildren ?? 0
    if (ages.length >= n) return ages.slice(0, n)
    return [...ages, ...Array(Math.max(0, n - ages.length)).fill('')]
  })
  const [datesFlexible, setDatesFlexible] = useState(
    initialTrip?.datesFlexible ?? false
  )
  const [priorities, setPriorities] = useState(initialTrip?.priorities ?? [])

  const numChildren = Math.max(0, Number(numberOfChildren) || 0)

  useEffect(() => {
    setChildAges((prev) => {
      if (prev.length === numChildren) return prev
      if (prev.length > numChildren) return prev.slice(0, numChildren)
      return [...prev, ...Array(numChildren - prev.length).fill('')]
    })
  }, [numChildren])

  function handlePriorityChange(value) {
    setPriorities((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    )
  }

  function handleChildAgeChange(index, val) {
    setChildAges((prev) => {
      const next = [...prev]
      next[index] = val === '' ? '' : val
      return next
    })
  }

  function handleSubmit(e) {
    e.preventDefault()
    const arrival = datesFlexible ? null : arrivalDate || null
    const departure = datesFlexible ? null : departureDate || null
    let lengthOfStayDays = null
    if (arrival && departure) {
      const a = new Date(arrival)
      const b = new Date(departure)
      lengthOfStayDays =
        Math.max(0, Math.ceil((b - a) / (1000 * 60 * 60 * 24))) + 1
    }
    const ages = childAges
      .slice(0, numChildren)
      .map((a) => (a === '' ? undefined : a))
      .filter((a) => a !== undefined && a !== '')
    onSubmit({
      destination,
      arrivalDate: arrival,
      departureDate: departure,
      numberOfAdults: Number(numberOfAdults) || 1,
      numberOfChildren: numChildren,
      childAges: ages.length ? ages : undefined,
      lengthOfStayDays,
      datesFlexible,
      priorities: priorities.length ? priorities : undefined,
    })
  }

  return (
    <form
      className="mb-4 max-w-md rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5"
      onSubmit={handleSubmit}
    >
      <h2 className="font-display text-lg font-semibold text-[var(--color-text-heading)]">
        Tell us about your trip
      </h2>
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">
        Share the basics so we can give you personalized advice.
      </p>

      <SelectField
        label="Destination"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        required
      >
        {DESTINATIONS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </SelectField>

      <div className="mb-4">
        <CheckboxField
          checked={datesFlexible}
          onChange={(e) => setDatesFlexible(e.target.checked)}
        >
          My dates are flexible
        </CheckboxField>
      </div>

      {!datesFlexible && (
        <div className="mb-4 flex flex-col gap-4 sm:flex-row">
          <TextField
            className="min-w-0 flex-1"
            label="Arrival date"
            type="date"
            value={arrivalDate}
            onChange={(e) => setArrivalDate(e.target.value)}
            min={today()}
          />
          <TextField
            className="min-w-0 flex-1"
            label="Departure date"
            type="date"
            value={departureDate}
            onChange={(e) => setDepartureDate(e.target.value)}
            min={arrivalDate || today()}
          />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-4 sm:flex-row">
        <TextField
          className="min-w-0 flex-1"
          label="Adults"
          type="number"
          min={1}
          max={20}
          inputClassName="max-w-[6rem]"
          value={numberOfAdults}
          onChange={(e) => setNumberOfAdults(e.target.value)}
        />
        <TextField
          className="min-w-0 flex-1"
          label="Children"
          type="number"
          min={0}
          max={20}
          inputClassName="max-w-[6rem]"
          value={numberOfChildren}
          onChange={(e) => setNumberOfChildren(e.target.value)}
        />
      </div>

      {numChildren > 0 && (
        <div className="mb-4">
          <span className="mb-2 block text-xs font-medium text-[var(--color-text-muted)]">
            Ages of children
          </span>
          <div className="flex flex-wrap gap-4">
            {childAges.slice(0, numChildren).map((ageRange, i) => (
              <SelectField
                key={i}
                className="min-w-[10rem] flex-1"
                label={`Child ${i + 1}`}
                selectClassName="min-w-[9rem]"
                value={ageRange === '' ? '' : ageRange}
                onChange={(e) => handleChildAgeChange(i, e.target.value)}
              >
                <option value="">Select age range…</option>
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

      <fieldset className="mb-4 border-0 p-0">
        <legend className="mb-2 block text-xs font-medium text-[var(--color-text-muted)]">
          What do you want to prioritize? (pick any)
        </legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PRIORITY_OPTIONS.map((o) => (
            <CheckboxField
              key={o.value}
              checked={priorities.includes(o.value)}
              onChange={() => handlePriorityChange(o.value)}
            >
              {o.label}
            </CheckboxField>
          ))}
        </div>
      </fieldset>

      <Button type="submit" className="w-full sm:w-auto">
        Save trip details
      </Button>
    </form>
  )
}
