import { memo } from 'react'
import { resolveImageUrl } from '../services/api'

export interface PreviewCardProps {
  name: string
  imageUrl?: string
  tag?: string
  price?: string
  status?: string
  section?: string
  active?: boolean
}

function PreviewCardComponent({ name, imageUrl, tag, price, status, section, active }: PreviewCardProps) {
  const isActive = status ? status === 'active' : active !== false

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel)] shadow-sm max-w-xs">
      {/* Image area */}
      <div className="relative aspect-[4/5] bg-[var(--panel-strong)] flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={resolveImageUrl(imageUrl)}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-[var(--muted)]">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
            <span className="text-[10px] font-semibold">No Image</span>
          </div>
        )}
        {tag && (
          <span className="absolute top-2 left-2 rounded bg-[var(--burgundy)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
            {tag}
          </span>
        )}
      </div>

      {/* Info area */}
      <div className="space-y-1.5 border-t border-[var(--line)] p-3">
        {section && (
          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted)]">{section}</p>
        )}
        <p className="text-sm font-bold text-[var(--text)] leading-tight">{name || 'Product Name'}</p>
        {price && (
          <p className="text-sm font-bold text-[var(--gold)]">₹{price}</p>
        )}
        <div className="flex items-center gap-2 pt-1">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              isActive ? 'bg-green-500' : 'bg-red-400'
            }`}
          />
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted)]">
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
    </div>
  )
}

const PreviewCard = memo(PreviewCardComponent)
export default PreviewCard
