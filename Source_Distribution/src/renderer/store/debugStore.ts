import { create } from 'zustand'

export interface LogEntry {
    timestamp: string
    level: 'info' | 'warn' | 'error' | 'debug'
    message: string
    data?: unknown
}

interface DebugState {
    logs: LogEntry[]
    isExpanded: boolean
    maxLogs: number

    // Actions
    addLog: (entry: LogEntry) => void
    clearLogs: () => void
    setExpanded: (expanded: boolean) => void
    toggleExpanded: () => void
}

export const useDebugStore = create<DebugState>((set) => ({
    logs: [],
    isExpanded: false,
    maxLogs: 500,

    addLog: (entry) => set((state) => {
        const newLogs = [entry, ...state.logs]
        if (newLogs.length > state.maxLogs) {
            newLogs.length = state.maxLogs
        }
        return { logs: newLogs }
    }),

    clearLogs: () => set({ logs: [] }),

    setExpanded: (expanded) => set({ isExpanded: expanded }),

    toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded }))
}))
