/**
 * Primary / secondary / ghost buttons (Tailwind + design tokens).
 */
export default function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  children,
  ...props
}) {
  const base =
    'inline-flex items-center justify-center rounded-[var(--radius-pill)] px-6 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-lilac-mid)] disabled:cursor-not-allowed disabled:opacity-60'
  const variants = {
    primary:
      'border-0 bg-[var(--color-pink-mid)] text-[var(--color-text-on-primary)] hover:bg-[var(--color-pink-strong)]',
    secondary:
      'border-[1.5px] border-[var(--color-lilac-strong)] bg-transparent text-[var(--color-lilac-strong)] hover:bg-[var(--color-lilac-light)]',
    ghost:
      'border-0 bg-transparent text-[var(--color-lilac-strong)] underline-offset-2 hover:underline',
  }
  return (
    <button
      type={type}
      className={`${base} ${variants[variant] ?? variants.primary} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  )
}
