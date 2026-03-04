/** Simple three-circle Mickey-inspired silhouette (decorative only) */
export default function MickeyIcon({ className = '', size = 32 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="16" cy="18" r="10" />
      <circle cx="8" cy="10" r="6" />
      <circle cx="24" cy="10" r="6" />
    </svg>
  )
}
