/**
 * Native select with label (Tailwind).
 */
import { useId } from 'react'
import { fieldInputClass, fieldLabelClass, fieldGroupClass } from './fieldStyles.js'

export default function SelectField({
  label,
  id,
  className = '',
  selectClassName = '',
  children,
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
      <select
        id={fieldId}
        className={`${fieldInputClass} cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.5rem_center] bg-no-repeat pr-9 ${selectClassName}`.trim()}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239a7a8e'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
        }}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}
