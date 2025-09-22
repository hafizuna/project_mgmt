const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

// Debug environment variables
console.log('🔧 API Client Debug:')
console.log('Environment Mode:', import.meta.env.MODE)
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL)
console.log('Final API_BASE_URL:', API_BASE_URL)

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

// Function to handle automatic logout on token expiration
function handleUnauthorized() {
  console.log('🚨 Token expired or unauthorized, logging out user...')
  
  // Clear auth store
  localStorage.removeItem('auth-store')
  
  // Show a friendly message to user (optional)
  if (typeof window !== 'undefined' && 'localStorage' in window) {
    // You could show a toast notification here if needed
    console.log('🔄 Session has expired. Redirecting to login...')
  }
  
  // Small delay to allow any pending operations to complete
  setTimeout(() => {
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }, 100)
}

async function request(method: string, path: string, body?: any) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  // Add cache-busting for dashboard endpoints to get fresh data
  if (path.includes('/dashboard')) {
    headers['Cache-Control'] = 'no-cache'
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
    // Handle 401 Unauthorized - likely token expiration
    if (res.status === 401) {
      handleUnauthorized()
      throw new Error('Session expired. Please log in again.')
    }
    
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
    console.log('Got 304 Not Modified, trying to get response body or fallback data');
    // Try to get cached response body first
    try {
      const data = await res.json()
      if (data && Object.keys(data).length > 0) {
        return data
      }
    } catch {
      // Fallback if no body
    }
    
    // Return appropriate fallback data
    if (path.includes('/audit-logs')) {
      return { auditLogs: [], pagination: { page: 1, limit: 50, totalCount: 0, totalPages: 0, hasNext: false, hasPrev: false } }
    }
    if (path.includes('/dashboard/stats')) {
      return { totalTasks: 0, completedTasks: 0, overdueTasks: 0, completionRate: 0, activeProjects: 0, totalProjects: 0, teamMembers: 0, recentMeetings: 0, upcomingMeetings: 0, trends: { tasks: { value: 0, isPositive: true }, completedTasks: { value: 0, isPositive: true } } }
    }
    if (path.includes('/dashboard')) {
      return []
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

