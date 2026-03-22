/**
 * Developed by Sydney Edwards
 * Main app: auth state, get-to-know-you flow, chat, and saved trip. Uses proxy in dev for API.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { Routes, Route, useNavigate, useLocation, NavLink } from 'react-router-dom'
import { Wand2 } from 'lucide-react'
import MickeyIcon from './MickeyIcon.jsx'
import MickeyEarAvatar from './components/MickeyEarAvatar.jsx'
import { TextField } from './ui'
import GetToKnowYou from './components/GetToKnowYou.jsx'
import DashboardHome from './components/DashboardHome.jsx'
import ItineraryPage from './components/ItineraryPage.jsx'
import LightningLaneGuidePage from './components/LightningLaneGuidePage.jsx'
import TripSummary from './components/TripSummary.jsx'
import AuthModal from './components/AuthModal.jsx'
import PaywallModal from './components/PaywallModal.jsx'
import { toTripInfoPayload } from './tripInfo.js'
import './App.css'

const API_BASE =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? '' : 'http://localhost:8000')
const AUTH_STORAGE_KEY = 'mouse-mentor-auth'
const THEME_STORAGE_KEY = 'mouse-mentor-theme'
const SCREEN_STORAGE_KEY = 'mouse-mentor-screen'
const ITINERARY_STORAGE_KEY = 'mouse-mentor-structured-itinerary'
const LL_GUIDE_STORAGE_KEY = 'mouse-mentor-lightning-lane-guide'

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
  try {
    if (
      typeof localStorage !== 'undefined' &&
      typeof localStorage.setItem === 'function'
    ) {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    }
  } catch (_) {}
}

function getStoredUser() {
  try {
    const raw =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem(AUTH_STORAGE_KEY)
        : null
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data && data.token && data.email)
      return { ...data, is_pro: !!data.is_pro }
  } catch {}
  return null
}

function setStoredUser(user) {
  try {
    if (typeof localStorage !== 'undefined') {
      if (
        typeof localStorage.setItem === 'function' &&
        typeof localStorage.removeItem === 'function'
      ) {
        if (user) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
        else localStorage.removeItem(AUTH_STORAGE_KEY)
      }
    }
  } catch (_) {}
}

/** Logged-in users: persist hub vs guide; guests always use chat layout. */
function getInitialAppScreen() {
  try {
    const u = getStoredUser()
    if (!u) return 'chat'
    const s = localStorage.getItem(SCREEN_STORAGE_KEY)
    if (s === 'hub' || s === 'chat') return s
  } catch {}
  return 'hub'
}

/** Map backend snake_case trip to frontend camelCase */
function tripFromApi(data) {
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
  const [waitTimesData, setWaitTimesData] = useState(null)
  const [waitPanelOpen, setWaitPanelOpen] = useState(false)
  const [waitTimesLoading, setWaitTimesLoading] = useState(false)
  const [waitTimesError, setWaitTimesError] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)
  const [clearingChat, setClearingChat] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [paywallFeature, setPaywallFeature] = useState('export')
  const [appScreen, setAppScreen] = useState(getInitialAppScreen)
  const [structuredItinerary, setStructuredItinerary] = useState(null)
  const [itineraryLoading, setItineraryLoading] = useState(false)
  const [itineraryError, setItineraryError] = useState(null)
  const [itineraryExporting, setItineraryExporting] = useState(false)
  const [lightningGuide, setLightningGuide] = useState(null)
  const [lightningLoading, setLightningLoading] = useState(false)
  const [lightningError, setLightningError] = useState(null)
  const llAutoRequestedRef = useRef(false)
  const navigate = useNavigate()
  const location = useLocation()
  const checkoutHandledRef = useRef(false)
  const chatHistoryLoadedRef = useRef(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    setStoredTheme(theme)
  }, [theme])

  /** After Stripe Checkout redirect: exchange session for Pro JWT. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('checkout') !== 'success') return
    const sessionId = params.get('session_id')
    if (!sessionId || !user?.token) return
    if (checkoutHandledRef.current) return
    checkoutHandledRef.current = true

    let cancelled = false
    async function complete() {
      try {
        const res = await fetch(`${API_BASE}/billing/complete-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ session_id: sessionId }),
        })
        if (cancelled || !res.ok) return
        const data = await res.json()
        const next = {
          token: data.access_token,
          email: data.email,
          is_pro: !!data.is_pro,
        }
        setUser(next)
        setStoredUser(next)
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) {
          const url = new URL(window.location.href)
          url.searchParams.delete('checkout')
          url.searchParams.delete('session_id')
          const q = url.searchParams.toString()
          window.history.replaceState(
            {},
            '',
            url.pathname + (q ? `?${q}` : '') + url.hash
          )
        }
      }
    }
    complete()
    return () => {
      cancelled = true
    }
  }, [user?.token])

  useEffect(() => {
    const el = messagesEndRef.current
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading])

  function toggleTheme() {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  function handleAuthSuccess(authUser) {
    setUser(authUser)
    setStoredUser(authUser)
    setAppScreen('hub')
    try {
      localStorage.setItem(SCREEN_STORAGE_KEY, 'hub')
    } catch {}
  }

  const goToHub = useCallback(() => {
    navigate('/')
    setAppScreen('hub')
    try {
      localStorage.setItem(SCREEN_STORAGE_KEY, 'hub')
    } catch {}
  }, [navigate])

  const goToChat = useCallback(() => {
    navigate('/')
    setAppScreen('chat')
    try {
      localStorage.setItem(SCREEN_STORAGE_KEY, 'chat')
    } catch {}
  }, [navigate])

  const handleLogout = useCallback(() => {
    setUser(null)
    setStoredUser(null)
    try {
      localStorage.removeItem(SCREEN_STORAGE_KEY)
    } catch {}
    setAppScreen('chat')
    setSaveTripData(false)
    setShowDeleteConfirm(false)
    setDeleteConfirmChecked(false)
    setMessages([])
    setStructuredItinerary(null)
    setItineraryError(null)
    setLightningGuide(null)
    setLightningError(null)
    try {
      localStorage.removeItem(ITINERARY_STORAGE_KEY)
    } catch {}
    try {
      localStorage.removeItem(LL_GUIDE_STORAGE_KEY)
    } catch {}
    chatHistoryLoadedRef.current = false
  }, [])

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
      if (data.generated_itinerary) {
        setStructuredItinerary(data.generated_itinerary)
        try {
          localStorage.setItem(
            ITINERARY_STORAGE_KEY,
            JSON.stringify(data.generated_itinerary)
          )
        } catch {}
      }
      if (data.lightning_lane_guide) {
        setLightningGuide(data.lightning_lane_guide)
        try {
          localStorage.setItem(
            LL_GUIDE_STORAGE_KEY,
            JSON.stringify(data.lightning_lane_guide)
          )
        } catch {}
      }
    } catch {
      // ignore
    }
  }, [user?.token, handleLogout])

  /** Guests: restore itinerary JSON from localStorage (no server sync). */
  useEffect(() => {
    if (user?.token) return
    try {
      const raw = localStorage.getItem(ITINERARY_STORAGE_KEY)
      if (raw) setStructuredItinerary(JSON.parse(raw))
    } catch {
      /* ignore */
    }
  }, [user?.token])

  /** Guests: restore Lightning Lane guide from localStorage. */
  useEffect(() => {
    if (user?.token) return
    try {
      const raw = localStorage.getItem(LL_GUIDE_STORAGE_KEY)
      if (raw) setLightningGuide(JSON.parse(raw))
    } catch {
      /* ignore */
    }
  }, [user?.token])

  useEffect(() => {
    loadSavedTrip()
  }, [loadSavedTrip])

  const loadChatHistory = useCallback(async () => {
    if (!user?.token || !saveTripData) return
    try {
      const res = await fetch(`${API_BASE}/messages`, {
        headers: { Authorization: `Bearer ${user.token}` },
      })
      if (res.status === 401) {
        handleLogout()
        return
      }
      if (!res.ok) return
      const data = await res.json()
      const rows = data.messages || []
      if (rows.length) {
        setMessages(
          rows.map((m) => ({
            id: String(m.id),
            role: m.role,
            text: m.text,
          }))
        )
      }
    } catch {
      // ignore
    }
  }, [user?.token, saveTripData, handleLogout])

  useEffect(() => {
    if (!saveTripData) {
      chatHistoryLoadedRef.current = false
    }
  }, [saveTripData])

  useEffect(() => {
    if (!user?.token || !saveTripData || showTripForm) return
    if (chatHistoryLoadedRef.current) return
    chatHistoryLoadedRef.current = true
    loadChatHistory()
  }, [user?.token, saveTripData, showTripForm, loadChatHistory])

  const fetchWaitTimes = useCallback(async (refresh = false) => {
    setWaitTimesLoading(true)
    setWaitTimesError(null)
    try {
      const q = refresh ? '?refresh=true' : ''
      const res = await fetch(`${API_BASE}/wait-times${q}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const detail = err.detail
        const msg =
          typeof detail === 'string'
            ? detail
            : Array.isArray(detail)
              ? detail.map((d) => d.msg || d).join(', ')
              : res.statusText
        throw new Error(msg || 'Failed to load waits')
      }
      const data = await res.json()
      setWaitTimesData(data)
    } catch (e) {
      setWaitTimesError(e.message || 'Could not load wait times')
    } finally {
      setWaitTimesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!showTripForm) {
      fetchWaitTimes(false)
    }
  }, [showTripForm, fetchWaitTimes])

  const requestStructuredItinerary = useCallback(
    async (trip) => {
      setItineraryLoading(true)
      setItineraryError(null)
      try {
        let shortestWaits = []
        try {
          const wr = await fetch(`${API_BASE}/wait-times`)
          if (wr.ok) {
            const wd = await wr.json()
            shortestWaits = (wd.top10_shortest ?? []).slice(0, 10).map(
              (w) => ({
                name: w.name,
                wait_minutes: w.wait_minutes,
                park_name: w.park_name,
              })
            )
          }
        } catch {
          /* optional context */
        }
        const body = {
          trip_info: toTripInfoPayload(trip),
          shortest_waits: shortestWaits.length ? shortestWaits : null,
        }
        const headers = { 'Content-Type': 'application/json' }
        if (user?.token) headers.Authorization = `Bearer ${user.token}`
        const res = await fetch(`${API_BASE}/itinerary/generate`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        })
        if (res.status === 401) {
          handleLogout()
          throw new Error('You were signed out. Sign in again to save your plan.')
        }
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}))
          const detail = errJson.detail
          const msg =
            typeof detail === 'string'
              ? detail
              : 'Could not generate itinerary'
          throw new Error(msg)
        }
        const data = await res.json()
        setStructuredItinerary(data.itinerary)
        try {
          localStorage.setItem(
            ITINERARY_STORAGE_KEY,
            JSON.stringify(data.itinerary)
          )
        } catch {}
      } catch (e) {
        setItineraryError(e.message || 'Could not generate itinerary.')
      } finally {
        setItineraryLoading(false)
      }
    },
    [user?.token, handleLogout]
  )

  const requestLightningGuide = useCallback(
    async (trip) => {
      if (!trip) return
      setLightningLoading(true)
      setLightningError(null)
      try {
        const body = { trip_info: toTripInfoPayload(trip) }
        const headers = { 'Content-Type': 'application/json' }
        if (user?.token) headers.Authorization = `Bearer ${user.token}`
        const res = await fetch(`${API_BASE}/lightning-lane-guide/generate`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        })
        if (res.status === 401) {
          handleLogout()
          throw new Error(
            'You were signed out. Sign in again to save your guide.'
          )
        }
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}))
          const detail = errJson.detail
          const msg =
            typeof detail === 'string'
              ? detail
              : 'Could not generate Lightning Lane guide'
          throw new Error(msg)
        }
        const data = await res.json()
        setLightningGuide(data.guide)
        try {
          localStorage.setItem(
            LL_GUIDE_STORAGE_KEY,
            JSON.stringify(data.guide)
          )
        } catch {}
      } catch (e) {
        llAutoRequestedRef.current = false
        setLightningError(e.message || 'Could not generate guide.')
      } finally {
        setLightningLoading(false)
      }
    },
    [user?.token, handleLogout]
  )

  useEffect(() => {
    llAutoRequestedRef.current = false
  }, [tripInfo?.arrivalDate, tripInfo?.departureDate])

  useEffect(() => {
    if (location.pathname !== '/lightning-lane-guide') {
      llAutoRequestedRef.current = false
      return
    }
    if (!tripInfo?.arrivalDate || !tripInfo?.departureDate) return
    if (lightningGuide) return
    if (lightningLoading) return
    if (llAutoRequestedRef.current) return
    llAutoRequestedRef.current = true
    void requestLightningGuide(tripInfo)
  }, [
    location.pathname,
    tripInfo,
    lightningGuide,
    lightningLoading,
    requestLightningGuide,
  ])

  function handleTripSubmit(payload) {
    const { saveTripData: optIn, ...trip } = payload
    setTripInfo(trip)
    setSaveTripData(!!optIn)
    setShowTripForm(false)
    setShowDeleteConfirm(false)
    setDeleteConfirmChecked(false)
    setLightningGuide(null)
    setLightningError(null)
    try {
      localStorage.removeItem(LL_GUIDE_STORAGE_KEY)
    } catch {}
    llAutoRequestedRef.current = false
    navigate('/itinerary')
    void requestStructuredItinerary(trip)
  }

  async function handleExportStructuredItineraryPdf() {
    if (!user?.token) {
      setShowAuthModal(true)
      return
    }
    if (!user.is_pro) {
      setPaywallFeature('itinerary')
      setShowPaywall(true)
      return
    }
    setItineraryExporting(true)
    setExportError(null)
    try {
      const res = await fetch(`${API_BASE}/itinerary/export-pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
      })
      if (res.status === 401) {
        handleLogout()
        setExportError('You were signed out. Sign in again to export.')
        return
      }
      if (res.status === 403) {
        setPaywallFeature('itinerary')
        setShowPaywall(true)
        return
      }
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        const detail = errJson.detail
        const msg =
          typeof detail === 'string'
            ? detail
            : `Export failed (${res.status})`
        throw new Error(msg)
      }
      const blob = await res.blob()
      if (!blob.size) throw new Error('Empty PDF response')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'mouse-mentor-itinerary.pdf'
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      setExportError(e.message || 'Could not export PDF.')
    } finally {
      setItineraryExporting(false)
    }
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
        setMessages([])
        setStructuredItinerary(null)
        setLightningGuide(null)
        try {
          localStorage.removeItem(ITINERARY_STORAGE_KEY)
        } catch {}
        try {
          localStorage.removeItem(LL_GUIDE_STORAGE_KEY)
        } catch {}
        chatHistoryLoadedRef.current = false
      }
    } finally {
      setDeleting(false)
    }
  }

  /** Parse SSE blocks: lines starting with `data: ` → JSON payloads */
  function handleSsePayload(payload, assistantId) {
    if (!payload || typeof payload !== 'object') return
    if (payload.type === 'token' && payload.text) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId && m.role === 'assistant'
            ? { ...m, text: m.text + payload.text }
            : m
        )
      )
    } else if (payload.type === 'error' && payload.message) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId && m.role === 'assistant'
            ? {
                ...m,
                text:
                  m.text +
                  (m.text ? '\n\n' : '') +
                  `[Error: ${payload.message}]`,
              }
            : m
        )
      )
    }
    // type === 'done' — stream finished normally
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
    const assistantId = crypto.randomUUID()
    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantId, role: 'assistant', text: '' },
    ])
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
      if (waitTimesData?.top10_shortest?.length) {
        body.shortest_waits = waitTimesData.top10_shortest.slice(0, 10)
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
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== assistantId)
            .concat([
              {
                id: crypto.randomUUID(),
                role: 'assistant',
                text: 'You were signed out. Sign in again to save your trip.',
              },
            ])
        )
        return
      }
      if (res.status === 429) {
        const errJson = await res.json().catch(() => ({}))
        const retryAfter = res.headers.get('Retry-After')
        let retryHint = ''
        if (retryAfter) {
          const sec = parseInt(retryAfter, 10)
          if (!Number.isNaN(sec) && sec > 0) {
            const mins = Math.max(1, Math.ceil(sec / 60))
            retryHint = ` You can try again in about ${mins} minute${mins === 1 ? '' : 's'}.`
          }
        }
        const detail =
          typeof errJson.detail === 'string'
            ? errJson.detail
            : "You've sent a few too many messages. Please take a short break."
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== assistantId)
            .concat([
              {
                id: crypto.randomUUID(),
                role: 'assistant',
                text: `${detail}${retryHint}`,
              },
            ])
        )
        return
      }
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        const detail = errJson.detail
        const msg =
          typeof detail === 'string'
            ? detail
            : Array.isArray(detail)
              ? detail.map((d) => d.msg || d).join(', ')
              : res.statusText
        throw new Error(msg || `Request failed (${res.status})`)
      }
      const reader = res.body?.getReader()
      if (!reader) {
        throw new Error('No response body stream')
      }
      const decoder = new TextDecoder()
      let buffer = ''
      let streamEndedCleanly = false
      while (true) {
        const { done, value } = await reader.read()
        if (value) {
          buffer += decoder.decode(value, { stream: true })
        }
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const block of parts) {
          for (const line of block.split('\n')) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const jsonStr = trimmed.slice(5).trim()
            if (!jsonStr) continue
            try {
              const payload = JSON.parse(jsonStr)
              if (payload.type === 'done') streamEndedCleanly = true
              handleSsePayload(payload, assistantId)
            } catch {
              // ignore malformed chunk; keep streaming
            }
          }
        }
        if (done) {
          buffer += decoder.decode()
          if (buffer.trim()) {
            for (const block of buffer.split('\n\n')) {
              for (const line of block.split('\n')) {
                const trimmed = line.trim()
                if (!trimmed.startsWith('data:')) continue
                const jsonStr = trimmed.slice(5).trim()
                if (!jsonStr) continue
                try {
                  const payload = JSON.parse(jsonStr)
                  if (payload.type === 'done') streamEndedCleanly = true
                  handleSsePayload(payload, assistantId)
                } catch {
                  /* ignore */
                }
              }
            }
          }
          break
        }
      }
      if (!streamEndedCleanly) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId && m.role === 'assistant' && !m.text.trim()
              ? {
                  ...m,
                  text: '[Connection closed before the reply finished.]',
                }
              : m
          )
        )
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId && m.role === 'assistant'
            ? {
                ...m,
                text:
                  m.text +
                  (m.text ? '\n\n' : '') +
                  `Error: ${err.message}. Is the backend running?`,
              }
            : m
        )
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleClearConversation() {
    if (!user?.token || !saveTripData || clearingChat) return
    setClearingChat(true)
    setExportError(null)
    try {
      const res = await fetch(`${API_BASE}/messages`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      })
      if (res.status === 401) {
        handleLogout()
        return
      }
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(
          typeof errJson.detail === 'string'
            ? errJson.detail
            : 'Could not clear conversation'
        )
      }
      setMessages([])
    } catch (e) {
      setExportError(e.message || 'Could not clear conversation.')
    } finally {
      setClearingChat(false)
    }
  }

  async function handleExportItinerary() {
    if (!messages.length || loading || exporting) return
    if (!user?.token) {
      setShowAuthModal(true)
      return
    }
    if (!user.is_pro) {
      setPaywallFeature('export')
      setShowPaywall(true)
      return
    }
    setExporting(true)
    setExportError(null)
    try {
      const body = {
        messages: messages.map(({ role, text }) => ({ role, text })),
      }
      if (tripInfo) body.trip_info = toTripInfoPayload(tripInfo)
      const headers = { 'Content-Type': 'application/json' }
      if (user?.token) headers.Authorization = `Bearer ${user.token}`
      const res = await fetch(`${API_BASE}/export`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      if (res.status === 401) {
        handleLogout()
        setExportError('You were signed out. Sign in again to export.')
        return
      }
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        const detail = errJson.detail
        const msg =
          typeof detail === 'string'
            ? detail
            : Array.isArray(detail)
              ? detail.map((d) => d.msg || d).join(', ')
              : res.statusText
        throw new Error(msg || `Export failed (${res.status})`)
      }
      const blob = await res.blob()
      if (!blob.size) throw new Error('Empty PDF response')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'mouse-mentor-itinerary.pdf'
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      setExportError(e.message || 'Could not export PDF.')
    } finally {
      setExporting(false)
    }
  }

  function handleMultiDayPlan() {
    if (!user?.token) {
      setShowAuthModal(true)
      return
    }
    if (!user.is_pro) {
      setPaywallFeature('multi-day')
      setShowPaywall(true)
      return
    }
    setInput(
      'Please create a day-by-day park plan for my trip with rough timing, must-dos, and rest breaks.'
    )
  }

  function handleItineraryFromHub() {
    navigate('/itinerary')
  }

  const showHub = !!(user && appScreen === 'hub')

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
              <ellipse
                cx="20"
                cy="25"
                rx="14"
                ry="9"
                fill="var(--color-cloud-fill)"
              />
              <ellipse
                cx="28"
                cy="22"
                rx="12"
                ry="8"
                fill="var(--color-cloud-fill)"
              />
              <ellipse
                cx="35"
                cy="26"
                rx="13"
                ry="8"
                fill="var(--color-cloud-fill)"
              />
              <ellipse
                cx="25"
                cy="28"
                rx="11"
                ry="7"
                fill="var(--color-cloud-fill)"
              />
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
              <ellipse
                cx="65"
                cy="18"
                rx="16"
                ry="10"
                fill="var(--color-cloud-fill-alt)"
              />
              <ellipse
                cx="75"
                cy="16"
                rx="14"
                ry="9"
                fill="var(--color-cloud-fill-alt)"
              />
              <ellipse
                cx="82"
                cy="20"
                rx="12"
                ry="8"
                fill="var(--color-cloud-fill-alt)"
              />
              <ellipse
                cx="70"
                cy="22"
                rx="13"
                ry="8"
                fill="var(--color-cloud-fill-alt)"
              />
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
              <ellipse
                cx="45"
                cy="55"
                rx="18"
                ry="11"
                fill="var(--color-cloud-fill-soft)"
              />
              <ellipse
                cx="58"
                cy="52"
                rx="15"
                ry="10"
                fill="var(--color-cloud-fill-soft)"
              />
              <ellipse
                cx="68"
                cy="56"
                rx="14"
                ry="9"
                fill="var(--color-cloud-fill-soft)"
              />
              <ellipse
                cx="52"
                cy="58"
                rx="16"
                ry="9"
                fill="var(--color-cloud-fill-soft)"
              />
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
              <ellipse
                cx="8"
                cy="62"
                rx="15"
                ry="10"
                fill="var(--color-cloud-fill-alt)"
              />
              <ellipse
                cx="18"
                cy="58"
                rx="13"
                ry="8"
                fill="var(--color-cloud-fill-alt)"
              />
              <ellipse
                cx="25"
                cy="63"
                rx="12"
                ry="8"
                fill="var(--color-cloud-fill-alt)"
              />
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
              <ellipse
                cx="78"
                cy="72"
                rx="14"
                ry="9"
                fill="var(--color-cloud-fill-soft)"
              />
              <ellipse
                cx="88"
                cy="70"
                rx="12"
                ry="8"
                fill="var(--color-cloud-fill-soft)"
              />
              <ellipse
                cx="92"
                cy="76"
                rx="10"
                ry="7"
                fill="var(--color-cloud-fill-soft)"
              />
              <ellipse
                cx="82"
                cy="75"
                rx="11"
                ry="7"
                fill="var(--color-cloud-fill-soft)"
              />
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
              <ellipse
                cx="32"
                cy="82"
                rx="13"
                ry="8"
                fill="var(--color-cloud-fill-soft)"
              />
              <ellipse
                cx="42"
                cy="79"
                rx="11"
                ry="7"
                fill="var(--color-cloud-fill-soft)"
              />
              <ellipse
                cx="48"
                cy="84"
                rx="12"
                ry="7"
                fill="var(--color-cloud-fill-soft)"
              />
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
              [8, 12],
              [22, 35],
              [48, 6],
              [68, 48],
              [88, 18],
              [12, 62],
              [35, 78],
              [58, 65],
              [85, 82],
              [4, 40],
              [42, 25],
              [92, 52],
              [18, 88],
              [75, 28],
              [55, 92],
              [30, 20],
              [60, 45],
              [15, 55],
              [80, 70],
              [50, 85],
              [5, 75],
              [95, 35],
              [72, 8],
              [25, 42],
              [88, 58],
              [10, 12],
              [45, 68],
              [65, 22],
              [38, 92],
              [92, 78],
              [2, 28],
              [55, 5],
              [18, 38],
              [78, 95],
              [52, 15],
              [70, 50],
              [33, 60],
              [90, 40],
              [14, 72],
              [62, 30],
              [40, 85],
            ].map(([x, y], i) => {
              const size =
                i % 4 === 0 ? 'large' : i % 3 === 0 ? 'medium' : 'small'
              const scale =
                size === 'large' ? 0.38 : size === 'medium' ? 0.28 : 0.22
              return (
                <g
                  key={`${x}-${y}`}
                  className={`night-star night-star--${size}`}
                  transform={`translate(${x}, ${y}) scale(${scale})`}
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
          <nav className="header__nav" aria-label="Main">
            <div className="logo-wrap">
              <Wand2
                className="logo-icon lucide-icon"
                size={28}
                strokeWidth={1.75}
                aria-hidden
              />
              <h1 className="logo">Mouse Mentor</h1>
            </div>
            {user ? (
              <div className="flex shrink-0 flex-wrap items-center gap-3 md:gap-4">
                <button
                  type="button"
                  className={`header__nav-link ${
                    location.pathname === '/' && showHub
                      ? 'header__nav-link--active'
                      : ''
                  }`}
                  onClick={goToHub}
                >
                  Hub
                </button>
                <button
                  type="button"
                  className={`header__nav-link ${
                    location.pathname === '/' && !showHub
                      ? 'header__nav-link--active'
                      : ''
                  }`}
                  onClick={goToChat}
                >
                  Guide
                </button>
                <NavLink
                  to="/itinerary"
                  className={({ isActive }) =>
                    `header__nav-link ${isActive ? 'header__nav-link--active' : ''}`
                  }
                >
                  Itinerary
                </NavLink>
                <NavLink
                  to="/lightning-lane-guide"
                  className={({ isActive }) =>
                    `header__nav-link ${isActive ? 'header__nav-link--active' : ''}`
                  }
                >
                  Lightning Lane
                </NavLink>
              </div>
            ) : (
              <div className="flex shrink-0 flex-wrap items-center gap-3 md:gap-4">
                <a
                  href="#chat-main"
                  className="header__nav-link header__nav-link--active"
                >
                  Plan
                </a>
                <NavLink
                  to="/lightning-lane-guide"
                  className={({ isActive }) =>
                    `header__nav-link ${isActive ? 'header__nav-link--active' : ''}`
                  }
                >
                  Lightning Lane
                </NavLink>
              </div>
            )}
          </nav>
          <div className="header__auth">
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={
                theme === 'dark'
                  ? 'Switch to light mode'
                  : 'Switch to dark mode'
              }
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

      {showPaywall && (
        <PaywallModal
          feature={paywallFeature}
          user={user}
          onClose={() => setShowPaywall(false)}
        />
      )}

      <main id="chat-main" className="chat-main">
        <Routes>
          <Route
            path="/itinerary"
            element={
              <ItineraryPage
                user={user}
                tripInfo={tripInfo}
                itinerary={structuredItinerary}
                loading={itineraryLoading}
                error={itineraryError}
                exporting={itineraryExporting}
                onExportPdf={handleExportStructuredItineraryPdf}
                onUnlockPro={() => {
                  setPaywallFeature('itinerary')
                  setShowPaywall(true)
                }}
              />
            }
          />
          <Route
            path="/lightning-lane-guide"
            element={
              <LightningLaneGuidePage
                tripInfo={tripInfo}
                guide={lightningGuide}
                loading={lightningLoading}
                error={lightningError}
                onRefresh={() => tripInfo && requestLightningGuide(tripInfo)}
                onRequestGenerate={() =>
                  tripInfo && requestLightningGuide(tripInfo)
                }
              />
            }
          />
          <Route
            path="/*"
            element={
              <>
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

        {showHub && !showTripForm && (
          <DashboardHome
            tripInfo={tripInfo}
            user={user}
            waitTimesData={waitTimesData}
            waitTimesLoading={waitTimesLoading}
            waitTimesError={waitTimesError}
            onRefreshWaits={fetchWaitTimes}
            onAskGuide={goToChat}
            onItineraryPreview={handleItineraryFromHub}
            onOpenLightningLaneGuide={() => navigate('/lightning-lane-guide')}
            onPlanTrip={() => setShowTripForm(true)}
            onEditTrip={() => setShowTripForm(true)}
          />
        )}

        {!showHub && tripInfo && !showTripForm && (
          <TripSummary trip={tripInfo} onEdit={() => setShowTripForm(true)} />
        )}

        {!showHub && !showTripForm && (
          <div className="wait-times-panel">
            <button
              type="button"
              className="wait-times-panel__toggle"
              onClick={() => setWaitPanelOpen((o) => !o)}
              aria-expanded={waitPanelOpen}
            >
              <span className="wait-times-panel__toggle-label">
                Walt Disney World wait times
              </span>
              <span className="wait-times-panel__chevron" aria-hidden>
                {waitPanelOpen ? '▼' : '▶'}
              </span>
            </button>
            {waitPanelOpen && (
              <div className="wait-times-panel__body">
                <div className="wait-times-panel__toolbar">
                  <button
                    type="button"
                    className="wait-times-panel__refresh"
                    onClick={() => fetchWaitTimes(true)}
                    disabled={waitTimesLoading}
                  >
                    {waitTimesLoading ? 'Refreshing…' : 'Refresh'}
                  </button>
                  {waitTimesData?.cached && (
                    <span className="wait-times-panel__meta">(cached)</span>
                  )}
                  {waitTimesData?.fetched_at && (
                    <span className="wait-times-panel__meta">
                      {new Date(waitTimesData.fetched_at).toLocaleString()}
                    </span>
                  )}
                </div>
                {waitTimesError && (
                  <p className="wait-times-panel__error">{waitTimesError}</p>
                )}
                {waitTimesLoading && !waitTimesData && (
                  <p className="wait-times-panel__loading">Loading waits…</p>
                )}
                {waitTimesData?.parks?.map((park) => (
                  <div key={park.park_name} className="wait-times-park">
                    <h3 className="wait-times-park__name">{park.park_name}</h3>
                    <ul className="wait-times-park__list">
                      {park.rides?.map((ride) => (
                        <li key={`${park.park_name}-${ride.name}`}>
                          <span className="wait-times-ride__name">
                            {ride.name}
                          </span>
                          <span className="wait-times-ride__wait">
                            {ride.wait_minutes != null
                              ? `${ride.wait_minutes} min`
                              : '—'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {waitTimesData &&
                  !waitTimesLoading &&
                  (!waitTimesData.parks || waitTimesData.parks.length === 0) &&
                  !waitTimesError && (
                    <p className="wait-times-panel__empty">
                      No standby waits reported right now.
                    </p>
                  )}
              </div>
            )}
          </div>
        )}

        {!showHub && !showTripForm && saveTripData && (
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

        {!showHub && (
        <div className="messages flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-1">
          {messages.length === 0 && !showTripForm && (
            <div className="flex min-h-[16rem] flex-col items-center justify-center px-4 text-center text-[var(--color-text-muted)]">
              <MickeyIcon className="empty-state-icon mb-5" size={44} />
              <p className="m-0 text-base leading-relaxed">
                Ask me anything about your Disney adventure.
              </p>
              <p className="mt-2 max-w-sm text-sm opacity-90">
                Parks, resorts, dining & more—I’ll use your trip details to make
                it magical.
              </p>
            </div>
          )}
          {messages.length === 0 && showTripForm && (
            <div className="flex min-h-[6rem] flex-col items-center justify-center px-4 text-center text-sm text-[var(--color-text-muted)]">
              <p className="m-0 max-w-sm">
                Answer a few quick questions so we can make your visit
                magical—or skip to start chatting.
              </p>
            </div>
          )}
          {messages.map((msg) =>
            msg.role === 'user' ? (
              <div
                key={msg.id}
                className="flex max-w-[min(88%,32rem)] flex-col self-end"
              >
                <div
                  className="bg-[var(--color-lilac-strong)] px-4 py-3 text-[var(--color-text-on-primary)] shadow-sm"
                  style={{ borderRadius: 'var(--radius-msg-user)' }}
                >
                  <span className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wide text-white/80">
                    You
                  </span>
                  <p className="m-0 whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {msg.text}
                  </p>
                </div>
              </div>
            ) : (
              <div
                key={msg.id}
                className="flex max-w-[min(92%,36rem)] flex-row items-end gap-2 self-start"
              >
                <MickeyEarAvatar size={36} />
                <div
                  className="min-w-0 flex-1 border border-[var(--color-border)] bg-[var(--color-lilac-light)] px-4 py-3 shadow-sm ring-1 ring-[var(--color-border)]/80"
                  style={{ borderRadius: 'var(--radius-msg-assistant)' }}
                >
                  <span className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    Assistant
                  </span>
                  <p className="m-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--color-text-heading)]">
                    {msg.text}
                  </p>
                </div>
              </div>
            )
          )}
          <div ref={messagesEndRef} aria-hidden />
        </div>
        )}

        {!showHub && !showTripForm && messages.length > 0 && (
          <div className="export-itinerary-row">
            <button
              type="button"
              className="export-itinerary-btn"
              onClick={handleMultiDayPlan}
              disabled={loading || exporting || clearingChat}
            >
              Multi-day plan
            </button>
            <button
              type="button"
              className="export-itinerary-btn"
              onClick={handleExportItinerary}
              disabled={loading || exporting || clearingChat}
            >
              {exporting ? 'Exporting…' : 'Export Itinerary'}
            </button>
            {user?.token && saveTripData && (
              <button
                type="button"
                className="clear-conversation-btn"
                onClick={handleClearConversation}
                disabled={loading || exporting || clearingChat}
              >
                {clearingChat ? 'Clearing…' : 'Clear conversation'}
              </button>
            )}
            {exportError && (
              <span className="export-itinerary-error" role="alert">
                {exportError}
              </span>
            )}
          </div>
        )}

        {!showHub && !showTripForm && (
          <form
            className="input-area mt-2 flex shrink-0 gap-2 border-t border-[var(--color-border)] pt-4"
            onSubmit={handleSubmit}
          >
            <TextField
              compact
              type="text"
              className="min-w-0 flex-1"
              inputClassName="rounded-full py-3"
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
              </>
            }
          />
        </Routes>
      </main>
    </div>
  )
}
