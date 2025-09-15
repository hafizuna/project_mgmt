const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

// Types
export interface User {
  id: string
  name: string
  email: string
  role: 'Admin' | 'Manager' | 'Team'
  avatar?: string
  lastLoginAt?: string
  createdAt: string
  org: {
    id: string
    name: string
    slug: string
  }
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface RefreshRequest {
  refreshToken: string
}

export interface RefreshResponse {
  accessToken: string
}

export interface RegisterRequest {
  email: string
  name: string
  password: string
  role?: 'Admin' | 'Manager' | 'Team'
  orgId: string
}

export interface RegisterResponse {
  user: User
}

export interface ApiError {
  error: string
  details?: any
}

// API client class
export class AuthApiClient {
  private static getHeaders(token?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    return headers
  }

  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }))
      throw new Error(error.error)
    }
    return response.json()
  }

  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(credentials),
    })
    return this.handleResponse<LoginResponse>(response)
  }

  static async register(data: RegisterRequest, token: string): Promise<RegisterResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(data),
    })
    return this.handleResponse<RegisterResponse>(response)
  }

  static async refresh(data: RefreshRequest): Promise<RefreshResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    })
    return this.handleResponse<RefreshResponse>(response)
  }

  static async logout(refreshToken: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ refreshToken }),
    })
    return this.handleResponse<{ message: string }>(response)
  }

  static async me(token: string): Promise<{ user: User }> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: this.getHeaders(token),
    })
    return this.handleResponse<{ user: User }>(response)
  }

  static async updateProfile(
    data: { name?: string; avatar?: string },
    token: string
  ): Promise<{ user: User }> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'PUT',
      headers: this.getHeaders(token),
      body: JSON.stringify(data),
    })
    return this.handleResponse<{ user: User }>(response)
  }
}
