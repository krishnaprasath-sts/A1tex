function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    const protocol = window.location.protocol || 'http:'
    const isLanIp = /^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) || host.endsWith('.local')
    if (isLanIp) {
      return `${protocol}//${host}:5005`
    }
  }
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5005'
  return envUrl.replace(/\/api$/, '')
}

export function resolveImageUrl(url: string | undefined | null): string {
  if (!url) return ''
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed
  }
  if (trimmed.startsWith('/uploads/')) {
    const base = getBaseUrl()
    return `${base}${trimmed}`
  }
  return trimmed
}
