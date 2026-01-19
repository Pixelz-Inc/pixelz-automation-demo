import { IpcMain } from 'electron'
import { pixelzApi } from '../services/pixelzApi'
import { logger } from '../services/logger'

interface AuthState {
    clientId: string | null
    clientSecret: string | null
    accessToken: string | null
    expiresAt: number | null
    autoRefreshTimeout: NodeJS.Timeout | null
}

const authState: AuthState = {
    clientId: null,
    clientSecret: null,
    accessToken: null,
    expiresAt: null,
    autoRefreshTimeout: null
}

export function registerAuthHandlers(ipcMain: IpcMain): void {
    // Login with credentials
    ipcMain.handle('auth:login', async (_, clientId: string, clientSecret: string) => {
        try {
            logger.info('Attempting login...')

            const response = await pixelzApi.authenticate(clientId, clientSecret)

            authState.clientId = clientId
            authState.clientSecret = clientSecret
            authState.accessToken = response.access_token
            authState.expiresAt = Date.now() + (response.expires_in * 1000)

            return {
                success: true,
                expiresAt: authState.expiresAt,
                expiresIn: response.expires_in
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: unknown }; message?: string }
            logger.error('Login failed', err.response?.data || err.message)
            return {
                success: false,
                error: err.response?.data || err.message || 'Authentication failed'
            }
        }
    })

    // Refresh token
    ipcMain.handle('auth:refresh', async () => {
        if (!authState.clientId || !authState.clientSecret) {
            return { success: false, error: 'No credentials available' }
        }

        try {
            logger.info('Refreshing token...')

            const response = await pixelzApi.authenticate(authState.clientId, authState.clientSecret)

            authState.accessToken = response.access_token
            authState.expiresAt = Date.now() + (response.expires_in * 1000)

            return {
                success: true,
                expiresAt: authState.expiresAt,
                expiresIn: response.expires_in
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: unknown }; message?: string }
            logger.error('Token refresh failed', err.response?.data || err.message)
            return {
                success: false,
                error: err.response?.data || err.message || 'Token refresh failed'
            }
        }
    })

    // Get current auth status
    ipcMain.handle('auth:getStatus', () => {
        return {
            isAuthenticated: !!authState.accessToken && (authState.expiresAt || 0) > Date.now(),
            expiresAt: authState.expiresAt,
            hasCredentials: !!(authState.clientId && authState.clientSecret)
        }
    })

    // Logout
    ipcMain.handle('auth:logout', () => {
        logger.info('Logging out...')

        if (authState.autoRefreshTimeout) {
            clearTimeout(authState.autoRefreshTimeout)
        }

        authState.clientId = null
        authState.clientSecret = null
        authState.accessToken = null
        authState.expiresAt = null
        authState.autoRefreshTimeout = null

        pixelzApi.clearToken()

        // Notify renderer of logout
        const { BrowserWindow } = require('electron')
        const windows = BrowserWindow.getAllWindows()
        if (windows.length > 0) {
            windows[0].webContents.send('auth:status-changed', {
                isAuthenticated: false,
                expiresAt: null
            })
        }

        return { success: true }
    })

    // Set up auto-refresh
    ipcMain.handle('auth:setupAutoRefresh', (_, enabled: boolean, minutesBefore: number) => {
        if (authState.autoRefreshTimeout) {
            clearTimeout(authState.autoRefreshTimeout)
            authState.autoRefreshTimeout = null
        }

        if (!enabled || !authState.expiresAt) {
            return { success: true }
        }

        const refreshAt = authState.expiresAt - (minutesBefore * 60 * 1000)
        const delay = refreshAt - Date.now()

        if (delay > 0) {
            logger.info(`Auto-refresh scheduled in ${Math.round(delay / 1000 / 60)} minutes`)

            authState.autoRefreshTimeout = setTimeout(async () => {
                if (authState.clientId && authState.clientSecret) {
                    try {
                        const response = await pixelzApi.authenticate(authState.clientId, authState.clientSecret)
                        authState.accessToken = response.access_token
                        authState.expiresAt = Date.now() + (response.expires_in * 1000)
                        logger.info('Auto-refresh successful')

                        // Notify renderer of new expiry
                        const { BrowserWindow } = require('electron')
                        const windows = BrowserWindow.getAllWindows()
                        if (windows.length > 0) {
                            windows[0].webContents.send('auth:status-changed', {
                                isAuthenticated: true,
                                expiresAt: authState.expiresAt
                            })
                        }
                    } catch (error) {
                        logger.error('Auto-refresh failed', error)
                    }
                }
            }, delay)
        }

        return { success: true }
    })
}

// Export state getter for other modules
export function getAuthState() {
    return {
        accessToken: authState.accessToken,
        expiresAt: authState.expiresAt,
        isAuthenticated: !!authState.accessToken && (authState.expiresAt || 0) > Date.now()
    }
}
