/**
 * Developed by Sydney Edwards
 * Magic wand with star – suggests Disney vacation planning, wishes, and a guiding assistant.
 * Use with className="logo-icon" for header styling.
 */
export default function MentorWandIcon({ className = '', size = 32 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* Wand handle – straight, centered under star */}
      <line x1="16" y1="14" x2="16" y2="26" />
      {/* 5-pointed star at tip – wish upon a star / magic */}
      <path
        fill="currentColor"
        stroke="none"
        d="M16 3 L17.8 9 L24 9 L19.1 12.8 L20.8 19 L16 15.2 L11.2 19 L12.9 12.8 L8 9 L14.2 9 Z"
      />
      {/* Sparkles emanating from the wand */}
      <path
        fill="currentColor"
        stroke="none"
        opacity="0.85"
        d="M6 5 L6.5 6.2 L8 6 L6.8 7 L7.2 8.5 L6 7.5 L4.8 8.5 L5.2 7 L4 6 L5.5 6.2 Z"
      />
      <path
        fill="currentColor"
        stroke="none"
        opacity="0.75"
        d="M26 6 L26.4 6.8 L27.5 6.6 L26.6 7.3 L27 8.4 L26 7.8 L25 8.4 L25.4 7.3 L24.5 6.6 L25.6 6.8 Z"
      />
      <path
        fill="currentColor"
        stroke="none"
        opacity="0.7"
        d="M10 14 L10.35 14.7 L11.2 14.5 L10.5 15.1 L10.8 16 L10 15.5 L9.2 16 L9.5 15.1 L8.8 14.5 L9.65 14.7 Z"
      />
      <path
        fill="currentColor"
        stroke="none"
        opacity="0.8"
        d="M22 12 L22.4 12.7 L23.3 12.5 L22.6 13.1 L22.9 14 L22 13.4 L21.1 14 L21.4 13.1 L20.7 12.5 L21.6 12.7 Z"
      />
    </svg>
  )
}
