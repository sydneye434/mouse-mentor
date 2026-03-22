/**
 * Multiline text (Tailwind).
 */
import { useId } from 'react'
import { fieldInputClass, fieldLabelClass, fieldGroupClass } from './fieldStyles.js'

export default function TextAreaField({
  label,
  id,
  className = '',
  textAreaClassName = '',
  rows = 3,
  ...props
}) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <div className={`${fieldGroupClass} ${className}`.trim()}>
      {label ? (
        <label htmlFor={fieldId} className={fieldLabelClass}>
          {label}
        </label>
      ) : null}
      <textarea
        id={fieldId}
        rows={rows}
        className={`${fieldInputClass} min-h-[4.5rem] resize-y ${textAreaClassName}`.trim()}
        {...props}
      />
    </div>
  )
}
