/**
 * Approximate calendar days until 60 days before arrival (guest / client countdown).
 * Server uses Eastern 6 AM; this matches calendar-day countdown for display.
 * Developed by Sydney Edwards.
 */
export function daysUntilBookingWindow(arrivalDateStr) {
  if (!arrivalDateStr) return null
  try {
    const a = new Date(arrivalDateStr + 'T12:00:00')
    const windowDay = new Date(a)
    windowDay.setDate(windowDay.getDate() - 60)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    windowDay.setHours(0, 0, 0, 0)
    const diff = Math.ceil((windowDay - today) / 86400000)
    return Math.max(0, diff)
  } catch {
    return null
  }
}

export function bookingWindowOpenedApprox(arrivalDateStr) {
  const d = daysUntilBookingWindow(arrivalDateStr)
  return d === 0
}
