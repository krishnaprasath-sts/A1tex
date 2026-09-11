function getApiBaseUrl(): string {
  const isServer = typeof window === 'undefined'
  if (!isServer) {
    const host = window.location.hostname
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')
    if (isLocal) {
      const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL
      if (envUrl && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1') || envUrl.includes('192.168.'))) {
        return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/$/, '')}/api`
      }
      return 'http://localhost:5005/api'
    }
  }

  let url = isServer
    ? (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5005/api' : 'https://aiapi.a1tex.in/api'))
    : (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://aiapi.a1tex.in/api')

  if (!url.endsWith('/api') && !url.includes('/api/')) {
    url = `${url.replace(/\/$/, '')}/api`
  }
  return url
}

export const apiBaseUrl = getApiBaseUrl()

type ApiOptions = RequestInit & {
  timeoutMs?: number
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 7000)

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      cache: options.cache || 'no-store',
      credentials: 'include',
      signal: controller.signal,
      headers: options.body instanceof FormData
        ? (options.headers as Record<string, string> || {})
        : {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
          },
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data?.message || data?.error || 'API request failed')
    }
    return data as T
  } finally {
    clearTimeout(timeout)
  }
}

export function resolveImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url
  }
  // Only prepend backend base URL for uploaded files
  // Paths like /categories/*, /saree*.png, etc. are served from Next.js public/
  if (url.startsWith('/uploads/')) {
    const base = apiBaseUrl.replace(/\/api$/, '')
    return `${base}${url}`
  }
  // All other relative paths are Next.js public folder assets — return as-is
  return url
}
