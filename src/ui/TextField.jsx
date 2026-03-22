/**
 * Text, email, password, date, number — styled text field (Tailwind).
 */
import { useId } from 'react'
import { fieldInputClass, fieldLabelClass, fieldGroupClass } from './fieldStyles.js'

export default function TextField({
  label,
  id,
  compact = false,
  className = '',
  inputClassName = '',
  ...props
}) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const wrap = compact ? 'mb-0' : fieldGroupClass
  return (
    <div className={`${wrap} ${className}`.trim()}>
      {label ? (
        <label htmlFor={fieldId} className={fieldLabelClass}>
          {label}
        </label>
      ) : null}
      <input
        id={fieldId}
        className={`${fieldInputClass} ${inputClassName}`.trim()}
        {...props}
      />
    </div>
  )
}
