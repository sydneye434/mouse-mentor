/**
 * Developed by Sydney Edwards
 * Main app: auth state, get-to-know-you flow, chat, and saved trip. Uses proxy in dev for API.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import MentorWandIcon from './MentorWandIcon.jsx'
import MickeyIcon from './MickeyIcon.jsx'
import GetToKnowYou from './components/GetToKnowYou.jsx'
import TripSummary from './components/TripSummary.jsx'
import AuthModal from './components/AuthModal.jsx'
import { toTripInfoPayload } from './tripInfo.js'
import './App.css'

const API_BASE =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? '' : 'http://localhost:8000')
const AUTH_STORAGE_KEY = 'mouse-mentor-auth'
const THEME_STORAGE_KEY = 'mouse-mentor-theme'

function getStoredTheme() {
  try {
    const t =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem(THEME_STORAGE_KEY)
        : null
    if (t === 'dark' || t === 'light') return t
  } catch {}
  return null
}

function setStoredTheme(theme) {
  if (typeof localStorage !== 'undefined')
    localStorage.setItem(THEME_STORAGE_KEY, theme)
}

function getStoredUser() {
  try {
    const raw =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem(AUTH_STORAGE_KEY)
        : null
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data && data.token && data.email) return data
  } catch {}
  return null
}

function setStoredUser(user) {
  if (typeof localStorage !== 'undefined') {
    if (user) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
    else localStorage.removeItem(AUTH_STORAGE_KEY)
  }
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
  const [user, setUser] = useState(getStoredUser)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [theme, setTheme] = useState(() => getStoredTheme() || 'light')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    setStoredTheme(theme)
  }, [theme])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function toggleTheme() {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  function handleAuthSuccess(authUser) {
    setUser(authUser)
    setStoredUser(authUser)
  }

  function handleLogout() {
    setUser(null)
    setStoredUser(null)
    setSaveTripData(false)
    setShowDeleteConfirm(false)
    setDeleteConfirmChecked(false)
  }

  const loadSavedTrip = useCallback(async () => {
    if (!user?.token) return
    try {
      const res = await fetch(`${API_BASE}/trip`, {
        headers: { Authorization: `Bearer ${user.token}` },
      })
      if (res.status === 401) {
        handleLogout()
        return
      }
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
  }, [user?.token])

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
    if (!deleteConfirmChecked || !user?.token) return
    setDeleting(true)
    try {
      const res = await fetch(`${API_BASE}/trip`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      })
      if (res.status === 401) handleLogout()
      else {
        setSaveTripData(false)
        setShowDeleteConfirm(false)
        setDeleteConfirmChecked(false)
      }
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
        save_trip: !!user && saveTripData,
      }
      if (tripInfo) {
        body.trip_info = toTripInfoPayload(tripInfo)
      }
      const headers = { 'Content-Type': 'application/json' }
      if (user?.token) headers.Authorization = `Bearer ${user.token}`
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      if (res.status === 401) {
        handleLogout()
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            text: 'You were signed out. Sign in again to save your trip.',
          },
        ])
        return
      }
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
      {theme === 'light' && (
        <div className="cloud-bg" aria-hidden>
          <svg
            className="cloud-bg__svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
          {/* Fluffy cloud 1 – right to left, appears from right */}
          <g className="cloud cloud--1">
            <animateTransform
              attributeName="transform"
              type="translate"
              values="120 0; -25 0"
              dur="60s"
              repeatCount="indefinite"
            />
            <ellipse cx="20" cy="25" rx="14" ry="9" fill="rgba(248, 218, 230, 0.8)" />
            <ellipse cx="28" cy="22" rx="12" ry="8" fill="rgba(248, 218, 230, 0.8)" />
            <ellipse cx="35" cy="26" rx="13" ry="8" fill="rgba(248, 218, 230, 0.8)" />
            <ellipse cx="25" cy="28" rx="11" ry="7" fill="rgba(248, 218, 230, 0.8)" />
          </g>
          {/* Fluffy cloud 2 */}
          <g className="cloud cloud--2">
            <animateTransform
              attributeName="transform"
              type="translate"
              values="120 0; -25 0"
              dur="60s"
              repeatCount="indefinite"
              begin="-10s"
            />
            <ellipse cx="65" cy="18" rx="16" ry="10" fill="rgba(245, 220, 232, 0.75)" />
            <ellipse cx="75" cy="16" rx="14" ry="9" fill="rgba(245, 220, 232, 0.75)" />
            <ellipse cx="82" cy="20" rx="12" ry="8" fill="rgba(245, 220, 232, 0.75)" />
            <ellipse cx="70" cy="22" rx="13" ry="8" fill="rgba(245, 220, 232, 0.75)" />
          </g>
          {/* Fluffy cloud 3 */}
          <g className="cloud cloud--3">
            <animateTransform
              attributeName="transform"
              type="translate"
              values="120 0; -25 0"
              dur="60s"
              repeatCount="indefinite"
              begin="-20s"
            />
            <ellipse cx="45" cy="55" rx="18" ry="11" fill="rgba(250, 225, 235, 0.7)" />
            <ellipse cx="58" cy="52" rx="15" ry="10" fill="rgba(250, 225, 235, 0.7)" />
            <ellipse cx="68" cy="56" rx="14" ry="9" fill="rgba(250, 225, 235, 0.7)" />
            <ellipse cx="52" cy="58" rx="16" ry="9" fill="rgba(250, 225, 235, 0.7)" />
          </g>
          {/* Fluffy cloud 4 */}
          <g className="cloud cloud--4">
            <animateTransform
              attributeName="transform"
              type="translate"
              values="120 0; -25 0"
              dur="60s"
              repeatCount="indefinite"
              begin="-30s"
            />
            <ellipse cx="8" cy="62" rx="15" ry="10" fill="rgba(248, 215, 228, 0.75)" />
            <ellipse cx="18" cy="58" rx="13" ry="8" fill="rgba(248, 215, 228, 0.75)" />
            <ellipse cx="25" cy="63" rx="12" ry="8" fill="rgba(248, 215, 228, 0.75)" />
          </g>
          {/* Fluffy cloud 5 */}
          <g className="cloud cloud--5">
            <animateTransform
              attributeName="transform"
              type="translate"
              values="120 0; -25 0"
              dur="60s"
              repeatCount="indefinite"
              begin="-40s"
            />
            <ellipse cx="78" cy="72" rx="14" ry="9" fill="rgba(246, 222, 232, 0.75)" />
            <ellipse cx="88" cy="70" rx="12" ry="8" fill="rgba(246, 222, 232, 0.75)" />
            <ellipse cx="92" cy="76" rx="10" ry="7" fill="rgba(246, 222, 232, 0.75)" />
            <ellipse cx="82" cy="75" rx="11" ry="7" fill="rgba(246, 222, 232, 0.75)" />
          </g>
          {/* Fluffy cloud 6 */}
          <g className="cloud cloud--6">
            <animateTransform
              attributeName="transform"
              type="translate"
              values="120 0; -25 0"
              dur="60s"
              repeatCount="indefinite"
              begin="-50s"
            />
            <ellipse cx="32" cy="82" rx="13" ry="8" fill="rgba(247, 218, 228, 0.7)" />
            <ellipse cx="42" cy="79" rx="11" ry="7" fill="rgba(247, 218, 228, 0.7)" />
            <ellipse cx="48" cy="84" rx="12" ry="7" fill="rgba(247, 218, 228, 0.7)" />
          </g>
        </svg>
      </div>
      )}

      {theme === 'dark' && (
        <div className="night-sky" aria-hidden>
          <svg
            className="night-sky__svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              {/* 5-pointed star icon (clear outline, not a dot) */}
              <path
                id="night-star-shape"
                d="M0 -1 L 0.29 -0.31 L 0.95 -0.31 L 0.47 0.12 L 0.59 0.81 L 0 0.38 L -0.59 0.81 L -0.47 0.12 L -0.95 -0.31 L -0.29 -0.31 Z"
                fill="inherit"
              />
            </defs>
            {[
              [8, 12], [22, 35], [48, 6], [68, 48], [88, 18], [12, 62], [35, 78],
              [58, 65], [85, 82], [4, 40], [42, 25], [92, 52], [18, 88], [75, 28],
              [55, 92], [30, 20], [60, 45], [15, 55], [80, 70], [50, 85], [5, 75],
              [95, 35], [72, 8], [25, 42], [88, 58], [10, 12], [45, 68], [65, 22],
              [38, 92], [92, 78], [2, 28], [55, 5], [18, 38], [78, 95], [52, 15],
              [70, 50], [33, 60], [90, 40], [14, 72], [62, 30], [40, 85],
            ].map(([x, y], i) => {
              const size = i % 4 === 0 ? 'large' : i % 3 === 0 ? 'medium' : 'small'
              const scale = size === 'large' ? 0.38 : size === 'medium' ? 0.28 : 0.22
              return (
                <g
                  key={`${x}-${y}`}
                  className={`night-star night-star--${size}`}
                  transform={`translate(${x}, ${y}) scale(${scale})`}
                  fill="rgba(255, 255, 255, 0.92)"
                >
                  <use href="#night-star-shape" />
                </g>
              )
            })}
          </svg>
        </div>
      )}

      <header className="header">
        <div className="header__row">
          <div className="logo-wrap">
            <MentorWandIcon className="logo-icon" size={28} />
            <h1 className="logo">Mouse Mentor</h1>
          </div>
          <div className="header__auth">
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {user ? (
              <>
                <span className="header__email">{user.email}</span>
                <button
                  type="button"
                  className="header__auth-btn"
                  onClick={handleLogout}
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                type="button"
                className="header__auth-btn"
                onClick={() => setShowAuthModal(true)}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
        <p className="tagline">Where magic meets planning ✨</p>
      </header>

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}

      <main className="chat-main">
        {showTripForm && (
          <GetToKnowYou
            initialTrip={tripInfo}
            initialSaveTripData={saveTripData}
            isLoggedIn={!!user}
            onOpenAuth={() => setShowAuthModal(true)}
            onSubmit={handleTripSubmit}
            onSkip={() => setShowTripForm(false)}
          />
        )}

        {tripInfo && !showTripForm && (
          <TripSummary trip={tripInfo} onEdit={() => setShowTripForm(true)} />
        )}

        {!showTripForm && saveTripData && (
          <div
            className="save-notice"
            role="region"
            aria-labelledby="save-notice-heading"
          >
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
                  Your saved trip is stored on our servers and linked to your
                  account. Only you can see or delete it. We don&apos;t use your
                  IP address; access is tied to your sign-in.
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
                  <span>
                    Yes, really delete all my data from the backend servers
                  </span>
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
              <p>Ask me anything about your Disney adventure.</p>
              <p className="empty-hint">
                Parks, resorts, dining & more—I’ll use your trip details to make
                it magical.
              </p>
            </div>
          )}
          {messages.length === 0 && showTripForm && (
            <div className="empty-state empty-state--minimal">
              <p className="empty-hint">
                Answer a few quick questions so we can make your visit
                magical—or skip to start chatting.
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
          <div ref={messagesEndRef} aria-hidden />
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
