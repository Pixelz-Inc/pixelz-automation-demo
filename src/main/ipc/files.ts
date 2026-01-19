import { IpcMain, app } from 'electron'
import { pixelzApi } from '../services/pixelzApi'
import { logger } from '../services/logger'
import * as fs from 'fs/promises'
import * as path from 'path'
import axios from 'axios'

// ============================================================================
// Types
// ============================================================================

interface AxiosLikeError {
    response?: { data?: unknown; headers?: unknown }
    message?: string
    config?: { url?: string }
}

// ============================================================================
// Constants
// ============================================================================

const CONTENT_TYPE_MAP: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp'
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get content type from file extension
 */
function getContentType(ext: string): string {
    return CONTENT_TYPE_MAP[ext.toLowerCase()] || 'application/octet-stream'
}

/**
 * Mask sensitive query parameters in URLs for logging
 */
function maskUrlForLogging(url: string): string {
    try {
        const urlObj = new URL(url)
        // Mask common credential parameters
        const sensitiveParams = ['X-Amz-Signature', 'X-Amz-Credential', 'X-Amz-Security-Token']
        sensitiveParams.forEach(param => {
            if (urlObj.searchParams.has(param)) {
                urlObj.searchParams.set(param, '***MASKED***')
            }
        })
        return urlObj.toString()
    } catch {
        return url // Return original if parsing fails
    }
}

/**
 * Validate that a file path is within allowed directories
 * This prevents potential path traversal attacks from the renderer
 */
function validateFilePath(filePath: string): boolean {
    const normalizedPath = path.normalize(filePath)

    // Allow paths in user's home directory, temp directory, and common paths
    const allowedBases = [
        app.getPath('home'),
        app.getPath('temp'),
        app.getPath('downloads'),
        app.getPath('documents'),
        app.getPath('pictures'),
        app.getPath('desktop')
    ]

    return allowedBases.some(base => normalizedPath.startsWith(base))
}

// ============================================================================
// Upload Axios Instance with Logging
// ============================================================================

const uploadAxios = axios.create()

uploadAxios.interceptors.request.use((config) => {
    let logData = config.data

    // Check for binary data and mask it
    if (Buffer.isBuffer(config.data)) {
        logData = `**BinaryContent (${config.data.length} bytes)**`
    } else if (config.data instanceof ArrayBuffer) {
        logData = `**BinaryContent (${config.data.byteLength} bytes)**`
    }

    const maskedUrl = config.url ? maskUrlForLogging(config.url) : 'unknown'

    logger.info(`S3 Request: ${config.method?.toUpperCase()} ${maskedUrl}`, {
        headers: config.headers,
        body: logData
    })
    return config
}, (error) => {
    logger.error('S3 Request Error', error)
    return Promise.reject(error)
})

uploadAxios.interceptors.response.use((response) => {
    const maskedUrl = response.config.url ? maskUrlForLogging(response.config.url) : 'unknown'

    logger.info(`S3 Response: ${response.status} ${response.statusText}`, {
        url: maskedUrl,
        headers: response.headers
    })
    return response
}, (error) => {
    const maskedUrl = error.config?.url ? maskUrlForLogging(error.config.url) : 'unknown'

    logger.error(`S3 Error: ${error.response?.status || 'Network Error'}`, {
        url: maskedUrl,
        responseHeaders: error.response?.headers,
        message: error.message
    })
    return Promise.reject(error)
})

// ============================================================================
// IPC Handlers
// ============================================================================

export function registerFileHandlers(ipcMain: IpcMain): void {
    // Request presigned upload URL
    ipcMain.handle('files:requestUploadUrl', async (_, fileName: string) => {
        try {
            logger.info('Requesting presigned upload URL', { fileName })
            const result = await pixelzApi.requestUploadUrl(fileName)
            return { success: true, data: result }
        } catch (error: unknown) {
            const err = error as AxiosLikeError
            logger.error('Request upload URL failed', err.response?.data || err.message)
            return { success: false, error: err.response?.data || err.message }
        }
    })

    // Upload file to presigned URL
    ipcMain.handle('files:uploadToPresignedUrl', async (_, filePath: string, presignedUrl: string) => {
        try {
            // Security: Validate file path
            if (!validateFilePath(filePath)) {
                logger.error('Invalid file path attempted', { filePath })
                return { success: false, error: 'Access to this file path is not allowed' }
            }

            logger.info('Uploading file to S3', { filePath: path.basename(filePath) })

            // Read file asynchronously
            const fileBuffer = await fs.readFile(filePath)
            const fileName = path.basename(filePath)
            const ext = path.extname(fileName)
            const contentType = getContentType(ext)

            // Upload to S3 via PUT
            await uploadAxios.put(presignedUrl, fileBuffer, {
                headers: { 'Content-Type': contentType },
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            })

            logger.info('File upload successful')
            return { success: true, uploadedUrl: presignedUrl }
        } catch (error: unknown) {
            const err = error as AxiosLikeError
            logger.error('File upload failed', err.response?.data || err.message)
            return { success: false, error: err.response?.data || err.message }
        }
    })

    // Full upload flow: get presigned URL, then upload
    ipcMain.handle('files:upload', async (_, filePath: string) => {
        try {
            // Security: Validate file path
            if (!validateFilePath(filePath)) {
                logger.error('Invalid file path attempted', { filePath })
                return { success: false, error: 'Access to this file path is not allowed' }
            }

            const fileName = path.basename(filePath)
            logger.info('Starting file upload flow', { fileName })

            // Step 1: Get presigned URL
            const urlResult = await pixelzApi.requestUploadUrl(fileName)

            // Step 2: Upload to S3 (async read)
            const fileBuffer = await fs.readFile(filePath)
            const ext = path.extname(fileName)
            const contentType = getContentType(ext)

            await uploadAxios.put(urlResult.url, fileBuffer, {
                headers: { 'Content-Type': contentType },
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            })

            logger.info('File upload flow completed', { fileName })

            return {
                success: true,
                imageUrl: urlResult.url,
                expirationTime: urlResult.expirationTime
            }
        } catch (error: unknown) {
            const err = error as AxiosLikeError
            logger.error('File upload flow failed', err.response?.data || err.message)
            return { success: false, error: err.response?.data || err.message }
        }
    })

    // Upload file from renderer (accepts ArrayBuffer from browser)
    ipcMain.handle('files:uploadBuffer', async (_, fileName: string, arrayBuffer: ArrayBuffer, mimeType: string) => {
        try {
            // Security: Sanitize fileName to prevent path components
            const sanitizedFileName = path.basename(fileName)

            logger.info('Starting buffer upload flow', { fileName: sanitizedFileName, mimeType, size: arrayBuffer.byteLength })

            // Step 1: Get presigned URL
            const urlResult = await pixelzApi.requestUploadUrl(sanitizedFileName)
            logger.info('Got presigned URL')

            // Step 2: Convert ArrayBuffer to Buffer and upload to S3
            const fileBuffer = Buffer.from(arrayBuffer)

            await uploadAxios.put(urlResult.url, fileBuffer, {
                headers: { 'Content-Type': mimeType },
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            })

            logger.info('Buffer upload flow completed', { fileName })

            return {
                success: true,
                imageUrl: urlResult.url,
                expirationTime: urlResult.expirationTime
            }
        } catch (error: unknown) {
            const err = error as AxiosLikeError
            logger.error('Buffer upload failed', err.response?.data || err.message)
            return { success: false, error: err.response?.data || err.message }
        }
    })

    // Read file as base64 for preview
    ipcMain.handle('files:readAsBase64', async (_, filePath: string) => {
        try {
            // Security: Validate file path
            if (!validateFilePath(filePath)) {
                logger.error('Invalid file path attempted for base64 read', { filePath })
                return { success: false, error: 'Access to this file path is not allowed' }
            }

            const fileBuffer = await fs.readFile(filePath)
            const ext = path.extname(filePath)
            const mimeType = getContentType(ext)

            const base64 = fileBuffer.toString('base64')
            return {
                success: true,
                dataUrl: `data:${mimeType};base64,${base64}`
            }
        } catch (error: unknown) {
            const err = error as { message?: string }
            logger.error('Read file as base64 failed', err.message)
            return { success: false, error: err.message }
        }
    })
}
