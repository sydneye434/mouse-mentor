/**
 * Small Mickey-inspired silhouette for chat avatars (ears + head).
 */
export default function MickeyEarAvatar({
  size = 36,
  className = '',
  title = 'Assistant',
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-[var(--color-lilac-light)] p-0.5 text-[var(--color-text-heading)] ring-2 ring-[var(--color-border)] ${className}`.trim()}
      style={{ width: size, height: size }}
      title={title}
      aria-hidden={title ? undefined : true}
    >
      <svg
        width={size - 4}
        height={size - 4}
        viewBox="0 0 32 32"
        fill="currentColor"
        aria-hidden
      >
        <circle cx="8" cy="10" r="6" />
        <circle cx="24" cy="10" r="6" />
        <circle cx="16" cy="18" r="10" />
      </svg>
    </div>
  )
}
