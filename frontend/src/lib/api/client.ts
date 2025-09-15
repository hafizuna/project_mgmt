const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

function getAccessToken(): string | null {
  try {
    const raw = localStorage.getItem('auth-store')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state?.accessToken ?? null
  } catch {
    return null
  }
}

async function request(method: string, path: string, body?: any) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const token = getAccessToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  console.log(`API Request: ${method} ${API_BASE_URL}${path}`);
  
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  console.log(`API Response: ${res.status} ${res.statusText}`);

  if (!res.ok) {
    let errorText = ''
    try {
      const errorData = await res.json()
      errorText = errorData.error || errorData.message || `HTTP ${res.status}`
    } catch {
      errorText = await res.text().catch(() => `HTTP ${res.status}`)
    }
    throw new Error(errorText)
  }
  
  // Handle 304 Not Modified responses
  if (res.status === 304) {
    console.log('Got 304 Not Modified, returning fallback data');
    if (path.includes('/audit-logs')) {
      return { auditLogs: [], pagination: { page: 1, limit: 50, totalCount: 0, totalPages: 0, hasNext: false, hasPrev: false } }
    }
    return {}
  }
  
  const data = await res.json()
  console.log('API Response data:', data);
  return data
}

export const apiClient = {
  get: (path: string) => request('GET', path),
  post: (path: string, body?: any) => request('POST', path, body),
  put: (path: string, body?: any) => request('PUT', path, body),
  delete: (path: string, body?: any) => request('DELETE', path, body),
}

