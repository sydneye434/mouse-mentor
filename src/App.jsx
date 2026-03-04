import { useState, useEffect, useCallback } from 'react'
import MickeyIcon from './MickeyIcon.jsx'
import GetToKnowYou from './components/GetToKnowYou.jsx'
import TripSummary from './components/TripSummary.jsx'
import { toTripInfoPayload } from './tripInfo.js'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const SESSION_STORAGE_KEY = 'mouse-mentor-session-id'

function getOrCreateSessionId() {
  let id =
    typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem(SESSION_STORAGE_KEY)
      : null
  if (!id) {
    id = crypto.randomUUID()
    if (typeof sessionStorage !== 'undefined')
      sessionStorage.setItem(SESSION_STORAGE_KEY, id)
  }
  return id
}

/** Map backend snake_case trip to frontend camelCase */
function tripFromApi(data) {
  if (!data) return null
  return {
    destination: data.destination,
    arrivalDate: data.arrival_date ?? '',
    departureDate: data.departure_date ?? '',
    numberOfAdults: data.number_of_adults ?? 1,
    numberOfChildren: data.number_of_children ?? 0,
    childAges: data.child_ages ?? [],
    datesFlexible: data.dates_flexible ?? false,
    onSite: data.on_site ?? null,
    resortTier: data.resort_tier ?? '',
    firstVisit: data.first_visit ?? null,
    specialOccasion: data.special_occasion ?? '',
    priorities: data.priorities ?? [],
    tripPace: data.trip_pace ?? '',
    dietaryNotes: data.dietary_notes ?? '',
    lengthOfStayDays: data.length_of_stay_days,
  }
}

export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [tripInfo, setTripInfo] = useState(null)
  const [showTripForm, setShowTripForm] = useState(true)
  const [saveTripData, setSaveTripData] = useState(false)
  const [sessionId] = useState(getOrCreateSessionId)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadSavedTrip = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE}/trip?session_id=${encodeURIComponent(sessionId)}`
      )
      if (!res.ok) return
      const data = await res.json()
      if (data.trip) {
        setTripInfo(tripFromApi(data.trip))
        setSaveTripData(true)
        setShowTripForm(false)
      }
    } catch {
      // ignore
    }
  }, [sessionId])

  useEffect(() => {
    loadSavedTrip()
  }, [loadSavedTrip])

  function handleTripSubmit(payload) {
    const { saveTripData: optIn, ...trip } = payload
    setTripInfo(trip)
    setSaveTripData(!!optIn)
    setShowTripForm(false)
    setShowDeleteConfirm(false)
    setDeleteConfirmChecked(false)
  }

  async function handleDeleteSavedData() {
    if (!deleteConfirmChecked) return
    setDeleting(true)
    try {
      await fetch(
        `${API_BASE}/trip?session_id=${encodeURIComponent(sessionId)}`,
        { method: 'DELETE' }
      )
      setSaveTripData(false)
      setShowDeleteConfirm(false)
      setDeleteConfirmChecked(false)
    } finally {
      setDeleting(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim() || loading) return
    const userText = input.trim()
    setInput('')
    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: userText,
    }
    setMessages((prev) => [...prev, userMessage])
    setLoading(true)
    try {
      const body = {
        messages: [...messages, { role: 'user', text: userText }].map(
          ({ role, text }) => ({ role, text })
        ),
        save_trip: saveTripData,
        session_id: sessionId,
      }
      if (tripInfo) {
        body.trip_info = toTripInfoPayload(tripInfo)
      }
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(res.statusText)
      const data = await res.json()
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: data.reply },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: `Error: ${err.message}. Is the backend running?`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <div className="starry-bg" aria-hidden>
        <svg
          className="starry-bg__svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <path
              id="star-shape"
              d="M0-1 L.31-.24 .95-.31 .12.37 .59.81-.4.12-.59.81-.12-.37-.95-.31-.31-.24Z"
              fill="inherit"
            />
          </defs>
          <g
            className="star"
            transform="translate(8, 12) scale(0.6)"
            fill="rgba(255,255,255,0.85)"
          >
            <use href="#star-shape" />
          </g>
          <g
            className="star"
            transform="translate(22, 35) scale(0.5)"
            fill="rgba(255,255,255,0.75)"
          >
            <use href="#star-shape" />
          </g>
          <g
            className="star"
            transform="translate(48, 6) scale(0.65)"
            fill="rgba(255,255,255,0.9)"
          >
            <use href="#star-shape" />
          </g>
          <g
            className="star"
            transform="translate(68, 48) scale(0.5)"
            fill="rgba(255,255,255,0.7)"
          >
            <use href="#star-shape" />
          </g>
          <g
            className="star"
            transform="translate(88, 18) scale(0.6)"
            fill="rgba(255,255,255,0.8)"
          >
            <use href="#star-shape" />
          </g>
          <g
            className="star"
            transform="translate(12, 62) scale(0.45)"
            fill="rgba(255,255,255,0.65)"
          >
            <use href="#star-shape" />
          </g>
          <g
            className="star"
            transform="translate(35, 78) scale(0.6)"
            fill="rgba(255,255,255,0.75)"
          >
            <use href="#star-shape" />
          </g>
          <g
            className="star"
            transform="translate(58, 65) scale(0.5)"
            fill="rgba(255,255,255,0.7)"
          >
            <use href="#star-shape" />
          </g>
          <g
            className="star"
            transform="translate(85, 82) scale(0.6)"
            fill="rgba(255,255,255,0.55)"
          >
            <use href="#star-shape" />
          </g>
          <g
            className="star"
            transform="translate(4, 40) scale(0.45)"
            fill="rgba(255,255,255,0.6)"
          >
            <use href="#star-shape" />
          </g>
          <g
            className="star"
            transform="translate(42, 25) scale(0.5)"
            fill="rgba(255,255,255,0.7)"
          >
            <use href="#star-shape" />
          </g>
          <g
            className="star"
            transform="translate(92, 52) scale(0.45)"
            fill="rgba(255,255,255,0.5)"
          >
            <use href="#star-shape" />
          </g>
          <g
            className="star"
            transform="translate(18, 88) scale(0.5)"
            fill="rgba(255,255,255,0.5)"
          >
            <use href="#star-shape" />
          </g>
          <g
            className="star"
            transform="translate(75, 28) scale(0.45)"
            fill="rgba(255,255,255,0.6)"
          >
            <use href="#star-shape" />
          </g>
          <g
            className="star"
            transform="translate(55, 92) scale(0.6)"
            fill="rgba(255,255,255,0.55)"
          >
            <use href="#star-shape" />
          </g>
        </svg>
      </div>
      <header className="header">
        <div className="logo-wrap">
          <MickeyIcon className="logo-icon" size={28} />
          <h1 className="logo">Mouse Mentor</h1>
        </div>
        <p className="tagline">Disney trip planning assistant</p>
      </header>

      <main className="chat-main">
        {showTripForm && (
          <GetToKnowYou
            initialTrip={tripInfo}
            initialSaveTripData={saveTripData}
            onSubmit={handleTripSubmit}
            onSkip={() => setShowTripForm(false)}
          />
        )}

        {tripInfo && !showTripForm && (
          <TripSummary trip={tripInfo} onEdit={() => setShowTripForm(true)} />
        )}

        {!showTripForm && saveTripData && (
          <div className="save-notice" role="region" aria-labelledby="save-notice-heading">
            <p id="save-notice-heading" className="save-notice__message">
              FYI — you chose to save your data on the backend, so we are.
              <span className="info-icon-wrap">
                <button
                  type="button"
                  className="info-icon"
                  aria-label="How is my saved data linked to me?"
                >
                  ℹ
                </button>
                <span className="info-icon-tooltip" role="tooltip">
                  Your saved trip is linked to this browser tab using a random
                  ID we store only on your device. We don&apos;t use your IP
                  address or identify you personally. A new tab or another device
                  won&apos;t see this trip unless you save it there too. Closing
                  the tab or clearing site data removes the link.
                </span>
              </span>
            </p>
            {!showDeleteConfirm ? (
              <button
                type="button"
                className="save-notice__delete-link"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete my saved data
              </button>
            ) : (
              <div className="save-notice__delete-confirm">
                <label className="save-notice__delete-label">
                  <input
                    type="checkbox"
                    checked={deleteConfirmChecked}
                    onChange={(e) => setDeleteConfirmChecked(e.target.checked)}
                  />
                  <span>Yes, really delete all my data from the backend servers</span>
                </label>
                <div className="save-notice__delete-actions">
                  <button
                    type="button"
                    className="save-notice__delete-cancel"
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeleteConfirmChecked(false)
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="save-notice__delete-btn"
                    disabled={!deleteConfirmChecked || deleting}
                    onClick={handleDeleteSavedData}
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="messages">
          {messages.length === 0 && !showTripForm && (
            <div className="empty-state">
              <MickeyIcon className="empty-state-icon" size={44} />
              <p>Ask anything about planning your Disney trip.</p>
              <p className="empty-hint">
                Parks, hotels, dining, or best times to visit—I’ll use your trip
                details to personalize advice.
              </p>
            </div>
          )}
          {messages.length === 0 && showTripForm && (
            <div className="empty-state empty-state--minimal">
              <p className="empty-hint">
                Answer a few quick questions so we can personalize your plan —
                or skip to start chatting.
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`message message--${msg.role}`}>
              <span className="message-role">
                {msg.role === 'user' ? 'You' : 'Assistant'}
              </span>
              <p className="message-text">{msg.text}</p>
            </div>
          ))}
        </div>

        {!showTripForm && (
          <form className="input-area" onSubmit={handleSubmit}>
            <input
              type="text"
              className="input"
              placeholder="Ask about your Disney trip…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              disabled={loading}
            />
            <button
              type="submit"
              className="send-btn"
              aria-label="Send"
              disabled={loading}
            >
              {loading ? (
                <span className="loading-dots" aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
              ) : (
                'Send'
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
