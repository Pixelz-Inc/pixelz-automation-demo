import { IpcMain } from 'electron'
import { pixelzApi } from '../services/pixelzApi'
import { logger } from '../services/logger'

export function registerApiHandlers(ipcMain: IpcMain): void {
    // Color Matching
    ipcMain.handle('api:colorMatching', async (_, params: {
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
    }, isAsync: boolean) => {
        try {
            logger.info('Calling Color Matching API', { isAsync })
            const result = await pixelzApi.colorMatching(params, isAsync)
            return { success: true, data: result, isAsync }
        } catch (error: unknown) {
            const err = error as { response?: { data?: unknown }; message?: string }
            logger.error('Color Matching failed', err.response?.data || err.message)
            return { success: false, error: err.response?.data || err.message }
        }
    })

    // Create Mask
    ipcMain.handle('api:createMask', async (_, params: {
        image_url: string
        feather_width?: number
        trimap_url?: string
        callback_url?: string
    }, isAsync: boolean) => {
        try {
            logger.info('Calling Create Mask API', { isAsync })
            const result = await pixelzApi.createMask(params, isAsync)
            return { success: true, data: result, isAsync }
        } catch (error: unknown) {
            const err = error as { response?: { data?: unknown }; message?: string }
            logger.error('Create Mask failed', err.response?.data || err.message)
            return { success: false, error: err.response?.data || err.message }
        }
    })

    // Create Trimap
    ipcMain.handle('api:createTrimap', async (_, params: {
        image_url: string
        callback_url?: string
    }, isAsync: boolean) => {
        try {
            logger.info('Calling Create Trimap API', { isAsync })
            const result = await pixelzApi.createTrimap(params, isAsync)
            return { success: true, data: result, isAsync }
        } catch (error: unknown) {
            const err = error as { response?: { data?: unknown }; message?: string }
            logger.error('Create Trimap failed', err.response?.data || err.message)
            return { success: false, error: err.response?.data || err.message }
        }
    })

    // Model Crop
    ipcMain.handle('api:modelCrop', async (_, params: {
        image_url: string
        top_crop_location?: string | null
        bottom_crop_location?: string | null
        callback_url?: string
    }, isAsync: boolean) => {
        try {
            logger.info('Calling Model Crop API', { isAsync })
            const result = await pixelzApi.modelCrop(params, isAsync)
            return { success: true, data: result, isAsync }
        } catch (error: unknown) {
            const err = error as { response?: { data?: unknown }; message?: string }
            logger.error('Model Crop failed', err.response?.data || err.message)
            return { success: false, error: err.response?.data || err.message }
        }
    })

    // Remove Background
    ipcMain.handle('api:removeBackground', async (_, params: {
        image_url: string
        feather_width?: number
        transparent_background?: boolean
        background_color?: string | null
        trimap_url?: string
        callback_url?: string
    }, isAsync: boolean) => {
        try {
            logger.info('Calling Remove Background API', { isAsync })
            const result = await pixelzApi.removeBackground(params, isAsync)
            return { success: true, data: result, isAsync }
        } catch (error: unknown) {
            const err = error as { response?: { data?: unknown }; message?: string }
            logger.error('Remove Background failed', err.response?.data || err.message)
            return { success: false, error: err.response?.data || err.message }
        }
    })

    // Get Job Status
    ipcMain.handle('api:getJobStatus', async (_, jobId: string) => {
        try {
            logger.info('Checking job status', { jobId })
            const result = await pixelzApi.getJobStatus(jobId)
            return { success: true, data: result }
        } catch (error: unknown) {
            const err = error as { response?: { data?: unknown }; message?: string }
            logger.error('Get Job Status failed', err.response?.data || err.message)
            return { success: false, error: err.response?.data || err.message }
        }
    })
}
