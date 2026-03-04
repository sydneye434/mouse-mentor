import { useState } from 'react'
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
      <header className="header">
        <h1 className="logo">Mouse Mentor</h1>
        <p className="tagline">Disney trip planning assistant</p>
      </header>

      <main className="chat-main">
        <div className="messages">
          {messages.length === 0 && (
            <div className="empty-state">
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
            {loading ? '…' : 'Send'}
          </button>
        </form>
      </main>
    </div>
  )
}
