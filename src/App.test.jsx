import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'

describe('App', () => {
  beforeEach(() => {
    let id = 0
    vi.stubGlobal('crypto', {
      randomUUID: () => `test-uuid-${++id}`,
    })
  })

  it('renders logo and tagline', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: /mouse mentor/i })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/disney trip planning assistant/i)
    ).toBeInTheDocument()
  })

  it('shows empty state when no messages', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /skip for now/i }))
    expect(
      screen.getByText(/ask anything about planning your disney trip/i)
    ).toBeInTheDocument()
  })

  it('has a send button and input', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /skip for now/i }))
    expect(
      screen.getByPlaceholderText(/ask about your disney trip/i)
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('adds user message when form is submitted', async () => {
    const user = userEvent.setup()
    const mockReply = { reply: 'Test assistant reply' }
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockReply),
        })
      )
    )
    render(<App />)
    await user.click(screen.getByRole('button', { name: /skip for now/i }))
    const input = screen.getByPlaceholderText(/ask about your disney trip/i)
    await user.type(input, 'When is the best time to visit?')
    await user.click(screen.getByRole('button', { name: /send/i }))
    expect(
      screen.getByText('When is the best time to visit?')
    ).toBeInTheDocument()
    await screen.findByText('Test assistant reply')
  })
})
