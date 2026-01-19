import { IpcMain, SafeStorage, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { logger } from '../services/logger'

const CREDENTIALS_FILE = 'credentials.enc'

interface StoredCredentials {
    clientId: string
    clientSecret: string
}

function getCredentialsPath(): string {
    return path.join(app.getPath('userData'), CREDENTIALS_FILE)
}

export function registerStorageHandlers(ipcMain: IpcMain, safeStorage: SafeStorage): void {
    // Save credentials securely
    ipcMain.handle('storage:saveCredentials', async (_, clientId: string, clientSecret: string) => {
        try {
            if (!safeStorage.isEncryptionAvailable()) {
                logger.warn('Encryption not available on this system')
                return { success: false, error: 'Encryption not available' }
            }

            const credentials: StoredCredentials = { clientId, clientSecret }
            const jsonString = JSON.stringify(credentials)
            const encrypted = safeStorage.encryptString(jsonString)

            const filePath = getCredentialsPath()
            fs.writeFileSync(filePath, encrypted)

            logger.info('Credentials saved securely')
            return { success: true }
        } catch (error: unknown) {
            const err = error as { message?: string }
            logger.error('Failed to save credentials', err.message)
            return { success: false, error: err.message }
        }
    })

    // Load credentials securely
    ipcMain.handle('storage:loadCredentials', async () => {
        try {
            if (!safeStorage.isEncryptionAvailable()) {
                logger.warn('Encryption not available on this system')
                return { success: false, error: 'Encryption not available' }
            }

            const filePath = getCredentialsPath()

            if (!fs.existsSync(filePath)) {
                return { success: true, credentials: null }
            }

            const encrypted = fs.readFileSync(filePath)
            const decrypted = safeStorage.decryptString(encrypted)
            const credentials: StoredCredentials = JSON.parse(decrypted)

            logger.info('Credentials loaded successfully')
            return { success: true, credentials }
        } catch (error: unknown) {
            const err = error as { message?: string }
            logger.error('Failed to load credentials', err.message)
            return { success: false, error: err.message }
        }
    })

    // Clear stored credentials
    ipcMain.handle('storage:clearCredentials', async () => {
        try {
            const filePath = getCredentialsPath()

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
                logger.info('Credentials cleared')
            }

            return { success: true }
        } catch (error: unknown) {
            const err = error as { message?: string }
            logger.error('Failed to clear credentials', err.message)
            return { success: false, error: err.message }
        }
    })

    // Check if credentials are stored
    ipcMain.handle('storage:hasCredentials', () => {
        const filePath = getCredentialsPath()
        return { hasCredentials: fs.existsSync(filePath) }
    })
}
