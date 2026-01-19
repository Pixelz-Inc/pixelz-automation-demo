import { create } from 'zustand'

export type ProcessingMode = 'sync' | 'async'

interface SettingsState {
    processingMode: ProcessingMode
    webhookUrl: string

    // Actions
    setProcessingMode: (mode: ProcessingMode) => void
    setWebhookUrl: (url: string) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
    processingMode: 'async',
    webhookUrl: '',

    setProcessingMode: (mode) => set({ processingMode: mode }),
    setWebhookUrl: (url) => set({ webhookUrl: url })
}))
