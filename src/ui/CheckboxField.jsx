/**
 * Checkbox with label (Tailwind).
 */
import { useId } from 'react'

export default function CheckboxField({
  id,
  className = '',
  children,
  ...props
}) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 text-sm text-[var(--color-text-body)] ${className}`.trim()}
    >
      <input
        id={fieldId}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--color-border)] text-[var(--color-lilac-strong)] focus:ring-2 focus:ring-[var(--color-lilac-mid)]"
        {...props}
      />
      <span>{children ?? label}</span>
    </label>
  )
}
