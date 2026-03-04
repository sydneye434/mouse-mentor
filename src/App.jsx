import { useState } from 'react'
import MickeyIcon from './MickeyIcon.jsx'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim() || loading) return
    const userText = input.trim()
    setInput('')
    const userMessage = { id: crypto.randomUUID(), role: 'user', text: userText }
    setMessages((prev) => [...prev, userMessage])
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', text: userText }].map(({ role, text }) => ({ role, text })),
        }),
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
        { id: crypto.randomUUID(), role: 'assistant', text: `Error: ${err.message}. Is the backend running?` },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <div className="starry-bg" aria-hidden>
        <svg className="starry-bg__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <path id="star-shape" d="M0-1 L.31-.24 .95-.31 .12.37 .59.81-.4.12-.59.81-.12-.37-.95-.31-.31-.24Z" fill="inherit" />
          </defs>
          <g className="star" transform="translate(8, 12) scale(0.6)" fill="rgba(255,255,255,0.85)"><use href="#star-shape" /></g>
          <g className="star" transform="translate(22, 35) scale(0.5)" fill="rgba(255,255,255,0.75)"><use href="#star-shape" /></g>
          <g className="star" transform="translate(48, 6) scale(0.65)" fill="rgba(255,255,255,0.9)"><use href="#star-shape" /></g>
          <g className="star" transform="translate(68, 48) scale(0.5)" fill="rgba(255,255,255,0.7)"><use href="#star-shape" /></g>
          <g className="star" transform="translate(88, 18) scale(0.6)" fill="rgba(255,255,255,0.8)"><use href="#star-shape" /></g>
          <g className="star" transform="translate(12, 62) scale(0.45)" fill="rgba(255,255,255,0.65)"><use href="#star-shape" /></g>
          <g className="star" transform="translate(35, 78) scale(0.6)" fill="rgba(255,255,255,0.75)"><use href="#star-shape" /></g>
          <g className="star" transform="translate(58, 65) scale(0.5)" fill="rgba(255,255,255,0.7)"><use href="#star-shape" /></g>
          <g className="star" transform="translate(85, 82) scale(0.6)" fill="rgba(255,255,255,0.55)"><use href="#star-shape" /></g>
          <g className="star" transform="translate(4, 40) scale(0.45)" fill="rgba(255,255,255,0.6)"><use href="#star-shape" /></g>
          <g className="star" transform="translate(42, 25) scale(0.5)" fill="rgba(255,255,255,0.7)"><use href="#star-shape" /></g>
          <g className="star" transform="translate(92, 52) scale(0.45)" fill="rgba(255,255,255,0.5)"><use href="#star-shape" /></g>
          <g className="star" transform="translate(18, 88) scale(0.5)" fill="rgba(255,255,255,0.5)"><use href="#star-shape" /></g>
          <g className="star" transform="translate(75, 28) scale(0.45)" fill="rgba(255,255,255,0.6)"><use href="#star-shape" /></g>
          <g className="star" transform="translate(55, 92) scale(0.6)" fill="rgba(255,255,255,0.55)"><use href="#star-shape" /></g>
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
        <div className="messages">
          {messages.length === 0 && (
            <div className="empty-state">
              <MickeyIcon className="empty-state-icon" size={44} />
              <p>Ask anything about planning your Disney trip.</p>
              <p className="empty-hint">Dates, parks, hotels, dining—I’m here to help.</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`message message--${msg.role}`}>
              <span className="message-role">{msg.role === 'user' ? 'You' : 'Assistant'}</span>
              <p className="message-text">{msg.text}</p>
            </div>
          ))}
        </div>

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
          <button type="submit" className="send-btn" aria-label="Send" disabled={loading}>
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
      </main>
    </div>
  )
}
