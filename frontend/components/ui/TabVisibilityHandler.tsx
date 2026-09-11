'use client'

import { useEffect, useRef } from 'react'

export default function TabVisibilityHandler() {
  const originalTitle = useRef<string>('')

  useEffect(() => {
    if (!originalTitle.current) {
      originalTitle.current = document.title
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        document.title = 'Come back... | A1 TEX'
      } else {
        document.title = originalTitle.current || 'A1 TEX'
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return null
}
