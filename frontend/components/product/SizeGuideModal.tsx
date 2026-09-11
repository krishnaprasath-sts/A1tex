'use client'

import { X } from 'lucide-react'
import SIZE_GUIDE from '@/lib/sizeGuideData'

export default function SizeGuideModal({
  audience,
  onClose,
}: {
  audience: string
  onClose: () => void
}) {
  const entries = SIZE_GUIDE[audience] || SIZE_GUIDE.women
  const measureKeys = entries.length > 0 ? Object.keys(entries[0].measurements) : []

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold text-[#0F172A]">
            Size Guide — {audience.charAt(0).toUpperCase() + audience.slice(1)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-x-auto p-5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-3 py-2.5 font-semibold text-[#0F172A]">Size</th>
                {measureKeys.map(key => (
                  <th key={key} className="px-3 py-2.5 font-semibold text-[#0F172A]">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.label} className="border-b last:border-0 hover:bg-gray-50/50">
                  <td className="px-3 py-2.5 font-medium text-[#0F172A]">{entry.label}</td>
                  {measureKeys.map(key => (
                    <td key={key} className="px-3 py-2.5 text-gray-600">{entry.measurements[key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="px-5 pb-4 text-[11px] text-gray-400">
          These are approximate body measurements. Fit may vary by style.
        </p>
      </div>
    </div>
  )
}
