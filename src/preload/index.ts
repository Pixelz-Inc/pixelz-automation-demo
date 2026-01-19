import { contextBridge, ipcRenderer } from 'electron'

// Type definitions for the exposed API
export interface PixelzAPI {
    auth: {
        login: (clientId: string, clientSecret: string) => Promise<{ success: boolean; expiresAt?: number; expiresIn?: number; error?: unknown }>
        refresh: () => Promise<{ success: boolean; expiresAt?: number; expiresIn?: number; error?: unknown }>
        getStatus: () => Promise<{ isAuthenticated: boolean; expiresAt: number | null; hasCredentials: boolean }>
        logout: () => Promise<{ success: boolean }>
        setupAutoRefresh: (enabled: boolean, minutesBefore: number) => Promise<{ success: boolean }>
        onStatusChanged: (callback: (status: { isAuthenticated: boolean; expiresAt: number | null }) => void) => () => void
    }
    api: {
        colorMatching: (params: ColorMatchingParams, isAsync: boolean) => Promise<ApiResponse>
        createMask: (params: CreateMaskParams, isAsync: boolean) => Promise<ApiResponse>
        createTrimap: (params: CreateTrimapParams, isAsync: boolean) => Promise<ApiResponse>
        modelCrop: (params: ModelCropParams, isAsync: boolean) => Promise<ApiResponse>
        removeBackground: (params: RemoveBackgroundParams, isAsync: boolean) => Promise<ApiResponse>
        getJobStatus: (jobId: string) => Promise<ApiResponse>
    }
    files: {
        requestUploadUrl: (fileName: string) => Promise<{ success: boolean; data?: { fileName: string; url: string; expirationTime: string }; error?: unknown }>
        upload: (filePath: string) => Promise<{ success: boolean; imageUrl?: string; expirationTime?: string; error?: unknown }>
        uploadBuffer: (fileName: string, buffer: ArrayBuffer, mimeType: string) => Promise<{ success: boolean; imageUrl?: string; expirationTime?: string; error?: unknown }>
        readAsBase64: (filePath: string) => Promise<{ success: boolean; dataUrl?: string; error?: unknown }>
    }
    storage: {
        saveCredentials: (clientId: string, clientSecret: string) => Promise<{ success: boolean; error?: unknown }>
        loadCredentials: () => Promise<{ success: boolean; credentials?: { clientId: string; clientSecret: string } | null; error?: unknown }>
        clearCredentials: () => Promise<{ success: boolean; error?: unknown }>
        hasCredentials: () => Promise<{ hasCredentials: boolean }>
    }
    webhook: {
        getPublicKey: () => Promise<{ success: boolean; publicKey?: string; algorithm?: string; encoding?: string; error?: unknown }>
        verify: (payload: string, signature: string, publicKey?: string) => Promise<{ success: boolean; isValid?: boolean; error?: unknown }>
        clearCache: () => Promise<{ success: boolean }>
    }
    debug: {
        onLog: (callback: (entry: LogEntry) => void) => () => void
        getLogs: () => Promise<LogEntry[]>
        clearLogs: () => Promise<void>
    }
}

interface ColorMatchingParams {
    image_url: string
    color_markers: Array<{
        x_coordinate: number
        y_coordinate: number
        swatch_color_code?: string | null
        swatch_image?: {
            swatch_image_url: string
            x_coordinate: number
            y_coordinate: number
        } | null
    }>
    callback_url?: string
}

interface CreateMaskParams {
    image_url: string
    feather_width?: number
    trimap_url?: string
    callback_url?: string
}

interface CreateTrimapParams {
    image_url: string
    callback_url?: string
}

interface ModelCropParams {
    image_url: string
    top_crop_location?: string | null
    bottom_crop_location?: string | null
    callback_url?: string
}

interface RemoveBackgroundParams {
    image_url: string
    feather_width?: number
    transparent_background?: boolean
    background_color?: string | null
    trimap_url?: string
    callback_url?: string
}

interface ApiResponse {
    success: boolean
    data?: unknown
    isAsync?: boolean
    error?: unknown
}

interface LogEntry {
    timestamp: string
    level: 'info' | 'warn' | 'error' | 'debug'
    message: string
    data?: unknown
}

// Expose secure API to renderer
contextBridge.exposeInMainWorld('pixelz', {
    auth: {
        login: (clientId: string, clientSecret: string) =>
            ipcRenderer.invoke('auth:login', clientId, clientSecret),
        refresh: () =>
            ipcRenderer.invoke('auth:refresh'),
        getStatus: () =>
            ipcRenderer.invoke('auth:getStatus'),
        logout: () =>
            ipcRenderer.invoke('auth:logout'),
        setupAutoRefresh: (enabled: boolean, minutesBefore: number) =>
            ipcRenderer.invoke('auth:setupAutoRefresh', enabled, minutesBefore),
        onStatusChanged: (callback: (status: { isAuthenticated: boolean; expiresAt: number | null }) => void) => {
            const handler = (_event: Electron.IpcRendererEvent, status: { isAuthenticated: boolean; expiresAt: number | null }) => callback(status)
            ipcRenderer.on('auth:status-changed', handler)
            return () => ipcRenderer.removeListener('auth:status-changed', handler)
        }
    },
    api: {
        colorMatching: (params: ColorMatchingParams, isAsync: boolean) =>
            ipcRenderer.invoke('api:colorMatching', params, isAsync),
        createMask: (params: CreateMaskParams, isAsync: boolean) =>
            ipcRenderer.invoke('api:createMask', params, isAsync),
        createTrimap: (params: CreateTrimapParams, isAsync: boolean) =>
            ipcRenderer.invoke('api:createTrimap', params, isAsync),
        modelCrop: (params: ModelCropParams, isAsync: boolean) =>
            ipcRenderer.invoke('api:modelCrop', params, isAsync),
        removeBackground: (params: RemoveBackgroundParams, isAsync: boolean) =>
            ipcRenderer.invoke('api:removeBackground', params, isAsync),
        getJobStatus: (jobId: string) =>
            ipcRenderer.invoke('api:getJobStatus', jobId)
    },
    files: {
        requestUploadUrl: (fileName: string) =>
            ipcRenderer.invoke('files:requestUploadUrl', fileName),
        upload: (filePath: string) =>
            ipcRenderer.invoke('files:upload', filePath),
        uploadBuffer: (fileName: string, buffer: ArrayBuffer, mimeType: string) =>
            ipcRenderer.invoke('files:uploadBuffer', fileName, buffer, mimeType),
        readAsBase64: (filePath: string) =>
            ipcRenderer.invoke('files:readAsBase64', filePath)
    },
    storage: {
        saveCredentials: (clientId: string, clientSecret: string) =>
            ipcRenderer.invoke('storage:saveCredentials', clientId, clientSecret),
        loadCredentials: () =>
            ipcRenderer.invoke('storage:loadCredentials'),
        clearCredentials: () =>
            ipcRenderer.invoke('storage:clearCredentials'),
        hasCredentials: () =>
            ipcRenderer.invoke('storage:hasCredentials')
    },
    webhook: {
        getPublicKey: () =>
            ipcRenderer.invoke('webhook:getPublicKey'),
        verify: (payload: string, signature: string, publicKey?: string) =>
            ipcRenderer.invoke('webhook:verify', payload, signature, publicKey),
        clearCache: () =>
            ipcRenderer.invoke('webhook:clearCache')
    },
    debug: {
        onLog: (callback: (entry: LogEntry) => void) => {
            const handler = (_event: Electron.IpcRendererEvent, entry: LogEntry) => callback(entry)
            ipcRenderer.on('debug-log', handler)
            return () => ipcRenderer.removeListener('debug-log', handler)
        },
        getLogs: () => ipcRenderer.invoke('debug:getLogs'),
        clearLogs: () => ipcRenderer.invoke('debug:clearLogs')
    }
} as PixelzAPI)

// TypeScript declaration for window.pixelz
declare global {
    interface Window {
        pixelz: PixelzAPI
    }
}
