import { useState, useEffect } from 'react'
import {
  DESTINATIONS,
  CHILD_AGE_RANGE_OPTIONS,
  PRIORITY_OPTIONS,
} from '../tripInfo'
import './TripInfoForm.css'

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
    <form className="trip-info-form" onSubmit={handleSubmit}>
      <h2 className="trip-info-form__title">Tell us about your trip</h2>
      <p className="trip-info-form__hint">
        Share the basics so we can give you personalized advice.
      </p>

      <label className="trip-info-form__label">
        Destination
        <select
          className="trip-info-form__select"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          required
        >
          {DESTINATIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </label>

      <label className="trip-info-form__label trip-info-form__label--checkbox">
        <input
          type="checkbox"
          checked={datesFlexible}
          onChange={(e) => setDatesFlexible(e.target.checked)}
        />
        My dates are flexible
      </label>

      {!datesFlexible && (
        <div className="trip-info-form__row">
          <label className="trip-info-form__label">
            Arrival date
            <input
              type="date"
              className="trip-info-form__input"
              value={arrivalDate}
              onChange={(e) => setArrivalDate(e.target.value)}
              min={today()}
            />
          </label>
          <label className="trip-info-form__label">
            Departure date
            <input
              type="date"
              className="trip-info-form__input"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              min={arrivalDate || today()}
            />
          </label>
        </div>
      )}

      <div className="trip-info-form__row">
        <label className="trip-info-form__label">
          Adults
          <input
            type="number"
            className="trip-info-form__input trip-info-form__input--number"
            min={1}
            max={20}
            value={numberOfAdults}
            onChange={(e) => setNumberOfAdults(e.target.value)}
          />
        </label>
        <label className="trip-info-form__label">
          Children
          <input
            type="number"
            className="trip-info-form__input trip-info-form__input--number"
            min={0}
            max={20}
            value={numberOfChildren}
            onChange={(e) => setNumberOfChildren(e.target.value)}
          />
        </label>
      </div>

      {numChildren > 0 && (
        <div className="trip-info-form__child-ages">
          <span className="trip-info-form__label">Ages of children</span>
          <div className="trip-info-form__child-ages-inputs">
            {childAges.slice(0, numChildren).map((ageRange, i) => (
              <label key={i} className="trip-info-form__label">
                Child {i + 1}
                <select
                  className="trip-info-form__select trip-info-form__select--inline"
                  value={ageRange === '' ? '' : ageRange}
                  onChange={(e) => handleChildAgeChange(i, e.target.value)}
                >
                  <option value="">Select age range…</option>
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

      <fieldset className="trip-info-form__priorities">
        <legend className="trip-info-form__label">
          What do you want to prioritize? (pick any)
        </legend>
        <div className="trip-info-form__priorities-grid">
          {PRIORITY_OPTIONS.map((o) => (
            <label
              key={o.value}
              className="trip-info-form__label trip-info-form__label--checkbox"
            >
              <input
                type="checkbox"
                checked={priorities.includes(o.value)}
                onChange={() => handlePriorityChange(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <button type="submit" className="trip-info-form__submit">
        Save trip details
      </button>
    </form>
  )
}
