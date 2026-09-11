'use client'

import { useEffect } from 'react'

export default function AdminRedirectPage() {
  useEffect(() => {
    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:5173'
    window.location.href = adminUrl
  }, [])

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#0F172A] text-white">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent mx-auto mb-4" />
        <p className="text-sm font-semibold tracking-wider">Redirecting to Admin Panel...</p>
      </div>
    </div>
  )
}
