import { create } from 'zustand'

interface AuthState {
    isAuthenticated: boolean
    expiresAt: number | null
    autoRefresh: boolean
    autoRefreshMinutes: number
    isLoading: boolean
    error: string | null

    // Actions
    setAuthenticated: (isAuth: boolean, expiresAt?: number | null) => void
    setAutoRefresh: (enabled: boolean) => void
    setAutoRefreshMinutes: (minutes: number) => void
    setLoading: (loading: boolean) => void
    setError: (error: string | null) => void
    reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
    isAuthenticated: false,
    expiresAt: null,
    autoRefresh: false,
    autoRefreshMinutes: 3,
    isLoading: false,
    error: null,

    setAuthenticated: (isAuth, expiresAt = null) => set({
        isAuthenticated: isAuth,
        expiresAt,
        error: null
    }),

    setAutoRefresh: (enabled) => set({ autoRefresh: enabled }),

    setAutoRefreshMinutes: (minutes) => set({ autoRefreshMinutes: minutes }),

    setLoading: (loading) => set({ isLoading: loading }),

    setError: (error) => set({ error }),

    reset: () => set({
        isAuthenticated: false,
        expiresAt: null,
        autoRefresh: false,
        isLoading: false,
        error: null
    })
}))
