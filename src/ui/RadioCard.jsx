/**
 * Radio option styled as a card row (Tailwind).
 */
export default function RadioCard({
  name,
  radioValue,
  checked,
  onChange,
  children,
  className = '',
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-input)] border-2 px-4 py-3 text-sm text-[var(--color-text-body)] transition-colors ${
        checked
          ? 'border-[var(--color-lilac-strong)] bg-[var(--color-lilac-light)]'
          : 'border-[var(--color-border)] bg-[var(--color-input-bg)] hover:border-[var(--color-lilac-mid)]'
      } ${className}`.trim()}
    >
      <input
        type="radio"
        name={name}
        value={radioValue ?? ''}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 border-[var(--color-border)] text-[var(--color-lilac-strong)] focus:ring-2 focus:ring-[var(--color-lilac-mid)]"
      />
      <div className="min-w-0 flex-1">{children}</div>
    </label>
  )
}
