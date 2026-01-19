import { IpcMain } from 'electron'
import { pixelzApi } from '../services/pixelzApi'
import { logger } from '../services/logger'
import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'

export function registerFileHandlers(ipcMain: IpcMain): void {
    // Request presigned upload URL
    ipcMain.handle('files:requestUploadUrl', async (_, fileName: string) => {
        try {
            logger.info('Requesting presigned upload URL', { fileName })
            const result = await pixelzApi.requestUploadUrl(fileName)
            return { success: true, data: result }
        } catch (error: unknown) {
            const err = error as { response?: { data?: unknown }; message?: string }
            logger.error('Request upload URL failed', err.response?.data || err.message)
            return { success: false, error: err.response?.data || err.message }
        }
    })

    // Upload file to presigned URL
    ipcMain.handle('files:uploadToPresignedUrl', async (_, filePath: string, presignedUrl: string) => {
        try {
            logger.info('Uploading file to S3', { filePath })

            // Read file
            const fileBuffer = fs.readFileSync(filePath)
            const fileName = path.basename(filePath)
            const ext = path.extname(fileName).toLowerCase()

            // Determine content type
            const contentTypeMap: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.webp': 'image/webp'
            }
            const contentType = contentTypeMap[ext] || 'application/octet-stream'

            // Upload to S3 via PUT
            await axios.put(presignedUrl, fileBuffer, {
                headers: {
                    'Content-Type': contentType
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            })

            logger.info('File upload successful')

            // The URL to use for API calls is the full URL
            const uploadedUrl = presignedUrl

            return { success: true, uploadedUrl }
        } catch (error: unknown) {
            const err = error as { response?: { data?: unknown }; message?: string }
            logger.error('File upload failed', err.response?.data || err.message)
            return { success: false, error: err.response?.data || err.message }
        }
    })

    // Full upload flow: get presigned URL, then upload
    ipcMain.handle('files:upload', async (_, filePath: string) => {
        try {
            const fileName = path.basename(filePath)

            // Step 1: Get presigned URL
            logger.info('Starting file upload flow', { fileName })
            const urlResult = await pixelzApi.requestUploadUrl(fileName)

            // Step 2: Upload to S3
            const fileBuffer = fs.readFileSync(filePath)
            const ext = path.extname(fileName).toLowerCase()

            const contentTypeMap: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.webp': 'image/webp'
            }
            const contentType = contentTypeMap[ext] || 'application/octet-stream'

            await axios.put(urlResult.url, fileBuffer, {
                headers: {
                    'Content-Type': contentType
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            })

            // The URL to use for API calls is the full URL
            const imageUrl = urlResult.url

            logger.info('File upload flow completed', { imageUrl })

            return {
                success: true,
                imageUrl,
                expirationTime: urlResult.expirationTime
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: unknown }; message?: string }
            logger.error('File upload flow failed', err.response?.data || err.message)
            return { success: false, error: err.response?.data || err.message }
        }
    })

    // Upload file from renderer (accepts ArrayBuffer from browser)
    ipcMain.handle('files:uploadBuffer', async (_, fileName: string, arrayBuffer: ArrayBuffer, mimeType: string) => {
        try {
            logger.info('Starting buffer upload flow', { fileName, mimeType, size: arrayBuffer.byteLength })

            // Step 1: Get presigned URL
            const urlResult = await pixelzApi.requestUploadUrl(fileName)
            logger.info('Got presigned URL', { url: urlResult.url })

            // Step 2: Convert ArrayBuffer to Buffer and upload to S3
            const fileBuffer = Buffer.from(arrayBuffer)

            await axios.put(urlResult.url, fileBuffer, {
                headers: {
                    'Content-Type': mimeType
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            })

            // The URL to use for API calls is the full URL
            const imageUrl = urlResult.url

            logger.info('Buffer upload flow completed', { imageUrl })

            return {
                success: true,
                imageUrl,
                expirationTime: urlResult.expirationTime
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: unknown }; message?: string }
            logger.error('Buffer upload failed', err.response?.data || err.message)
            return { success: false, error: err.response?.data || err.message }
        }
    })

    // Read file as base64 for preview
    ipcMain.handle('files:readAsBase64', async (_, filePath: string) => {
        try {
            const fileBuffer = fs.readFileSync(filePath)
            const ext = path.extname(filePath).toLowerCase()

            const mimeTypes: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.webp': 'image/webp'
            }
            const mimeType = mimeTypes[ext] || 'image/png'

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
