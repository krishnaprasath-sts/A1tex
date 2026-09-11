import type { ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'
import { useState } from 'react'

export interface FieldWithTooltipProps {
  label: string
  required?: boolean
  tooltip?: string
  error?: string
  touched?: boolean
  characterCount?: string
  children: ReactNode
}

export default function FieldWithTooltip({
  label,
  required,
  tooltip,
  error,
  touched,
  characterCount,
  children,
}: FieldWithTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <label className="block text-[14px] font-bold uppercase tracking-widest text-[var(--muted)]">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
          {tooltip && (
            <span
              className="relative ml-1.5 inline-flex cursor-help align-middle"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <HelpCircle className="h-3.5 w-3.5 text-[var(--muted)]/60" />
              {showTooltip && (
                <span className="absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 rounded border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-[11px] font-medium text-[var(--text)] shadow-lg">
                  {tooltip}
                </span>
              )}
            </span>
          )}
        </label>
        {characterCount && (
          <span className="text-[10px] font-semibold text-[var(--muted)]">{characterCount}</span>
        )}
      </div>
      {children}
      {touched && error && (
        <p className="text-xs font-semibold text-red-600">{error}</p>
      )}
    </div>
  )
}
