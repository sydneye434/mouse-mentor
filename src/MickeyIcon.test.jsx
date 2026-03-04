import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MickeyIcon from './MickeyIcon.jsx'

describe('MickeyIcon', () => {
  it('renders an svg', () => {
    render(<MickeyIcon />)
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('aria-hidden')
  })

  it('accepts size prop', () => {
    render(<MickeyIcon size={48} />)
    const svg = document.querySelector('svg')
    expect(svg).toHaveAttribute('width', '48')
    expect(svg).toHaveAttribute('height', '48')
  })

  it('renders three circles', () => {
    const { container } = render(<MickeyIcon />)
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBe(3)
  })
})
