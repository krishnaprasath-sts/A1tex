import { Check } from 'lucide-react'

export interface Step {
  label: string
  description: string
}

export default function StepIndicator({ steps, currentStep }: { steps: Step[]; currentStep: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep
          const isCurrent = idx === currentStep
          const isUpcoming = idx > currentStep

          return (
            <div key={idx} className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-[var(--gold)] text-white'
                    : isCurrent
                      ? 'border-2 border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]'
                      : 'border-2 border-[var(--line)] bg-[var(--panel-strong)] text-[var(--muted)]'
                }`}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : idx + 1}
              </div>
              <p
                className={`mt-2 text-center text-[11px] font-bold uppercase tracking-wider ${
                  isCurrent ? 'text-[var(--gold)]' : 'text-[var(--muted)]'
                }`}
              >
                {step.label}
              </p>
              <p className="text-[9px] text-[var(--muted)]/60 hidden sm:block">{step.description}</p>
            </div>
          )
        })}
      </div>
      <div className="relative mt-4">
        <div className="absolute top-0 left-0 h-[2px] w-full bg-[var(--line)]" />
        <div
          className="absolute top-0 left-0 h-[2px] bg-[var(--gold)] transition-all duration-500"
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  )
}
