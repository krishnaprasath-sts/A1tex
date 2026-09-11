import type { ReactNode } from 'react'

export interface FormSectionProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  className?: string
}

export default function FormSection({ title, icon, children, className = '' }: FormSectionProps) {
  return (
    <div className={`mb-8 ${className}`}>
      <h3 className="mb-4 flex items-center gap-2 text-[13.5px] font-bold uppercase tracking-widest text-[var(--gold)]">
        {icon}
        {title}
      </h3>
      <div className="grid gap-6 md:grid-cols-2">{children}</div>
    </div>
  )
}

export function FormSectionFull({ title, icon, children, className = '' }: FormSectionProps) {
  return (
    <div className={`mb-8 ${className}`}>
      <h3 className="mb-4 flex items-center gap-2 text-[13.5px] font-bold uppercase tracking-widest text-[var(--gold)]">
        {icon}
        {title}
      </h3>
      <div className="space-y-6">{children}</div>
    </div>
  )
}
