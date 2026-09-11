import type { ReactNode } from 'react'

export interface VisualCardOption {
  value: string
  label: string
  description?: string
  icon?: ReactNode
}

export interface VisualCardProps {
  options: VisualCardOption[]
  value: string
  onChange: (value: string) => void
  name: string
}

export default function VisualCard({ options, value, onChange, name }: VisualCardProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all duration-200 ${
            value === opt.value
              ? 'border-[var(--gold)] bg-[var(--gold)]/5 shadow-md'
              : 'border-[var(--line)] bg-[var(--panel-strong)] hover:border-[var(--burgundy)] hover:bg-[var(--burgundy-soft)]'
          }`}
        >
          {opt.icon && <span className="text-[var(--gold)]">{opt.icon}</span>}
          <span
            className={`text-sm font-bold ${
              value === opt.value ? 'text-[var(--gold)]' : 'text-[var(--text)]'
            }`}
          >
            {opt.label}
          </span>
          {opt.description && (
            <span className="text-[10px] text-[var(--muted)]">{opt.description}</span>
          )}
        </button>
      ))}
    </div>
  )
}
