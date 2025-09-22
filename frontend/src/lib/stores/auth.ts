import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AuthApiClient, LoginRequest, LoginResponse, User } from '@/lib/api/auth'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  loading: boolean
  error: string | null
  login: (payload: LoginRequest) => Promise<void>
  logout: () => Promise<void>
  silentLogout: () => void
  setTokens: (accessToken: string, refreshToken?: string) => void
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      loading: false,
      error: null,

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken: refreshToken ?? get().refreshToken }),

      setUser: (user) => set({ user }),

      login: async (payload) => {
        set({ loading: true, error: null })
        try {
          const res: LoginResponse = await AuthApiClient.login(payload)
          set({ accessToken: res.accessToken, refreshToken: res.refreshToken, user: res.user, loading: false })
        } catch (err: any) {
          set({ error: err.message || 'Login failed', loading: false })
          throw err
        }
      },

      logout: async () => {
        const refreshToken = get().refreshToken
        set({ loading: true, error: null })
        try {
          if (refreshToken) {
            await AuthApiClient.logout(refreshToken)
          }
        } catch {}
        set({ user: null, accessToken: null, refreshToken: null, loading: false })
      },

      // Silent logout for token expiration scenarios - no API call needed
      silentLogout: () => {
        set({ user: null, accessToken: null, refreshToken: null, loading: false, error: null })
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken, refreshToken: state.refreshToken }),
    }
  )
)

