const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5005'

export function resolveImageUrl(url: string | undefined | null): string {
  if (!url) return ''
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed
  }
  if (trimmed.startsWith('/uploads/')) {
    const base = apiBaseUrl.replace(/\/api$/, '')
    return `${base}${trimmed}`
  }
  return trimmed
}
