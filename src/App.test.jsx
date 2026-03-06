/**
 * Developed by Sydney Edwards
 * App tests: logo, empty state, chat submit, and create-account flow (with mocked fetch/localStorage).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
    expect(screen.getByText(/where magic meets planning/i)).toBeInTheDocument()
  })

  it('shows empty state when no messages', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /skip for now/i }))
    expect(
      screen.getByText(/ask me anything about your disney adventure/i)
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

  it('create account flow: open modal, register, then shows user and Sign out', async () => {
    const user = userEvent.setup()
    const testEmail = 'newuser@example.com'
    const testToken = 'fake-jwt-token'
    const storage = {}
    vi.stubGlobal('localStorage', {
      getItem: (key) => storage[key] ?? null,
      setItem: (key, value) => {
        storage[key] = String(value)
      },
      removeItem: (key) => {
        delete storage[key]
      },
      clear: () => {
        for (const k of Object.keys(storage)) delete storage[k]
      },
      get length() {
        return Object.keys(storage).length
      },
      key: (i) => Object.keys(storage)[i] ?? null,
    })
    vi.stubGlobal(
      'fetch',
      vi.fn((url, opts) => {
        const body =
          opts?.body && typeof opts.body === 'string'
            ? JSON.parse(opts.body)
            : {}
        if (
          typeof url === 'string' &&
          url.endsWith('/auth/register') &&
          opts?.method === 'POST'
        ) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                access_token: testToken,
                token_type: 'bearer',
                email: body.email || testEmail,
              }),
          })
        }
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
      })
    )
    render(<App />)
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(
      screen.getByRole('heading', { name: /sign in/i })
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /register/i }))
    expect(
      screen.getByRole('heading', { name: /create account/i })
    ).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: /email/i }), testEmail)
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    await screen.findByText(testEmail)
    expect(
      screen.getByRole('button', { name: /sign out/i })
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: /create account/i })
      ).not.toBeInTheDocument()
    })
  })
})
