import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { logger } from './logger'

const API_BASE_URL = 'https://automation-api.pixelz.com'
const TOKEN_URL = 'https://id.pixelz.com/realms/pixelz-automations/protocol/openid-connect/token'

export interface TokenResponse {
    access_token: string
    expires_in: number
    token_type: string
}

export interface JobCreationResponse {
    job_id: string
}

export interface JobStatusResponse {
    job_type: string
    status: {
        status_code: number
        status_name: string
    }
    result: {
        result_image_url: string | null
        result_trimap_vector_url: string | null
    } | null
}

export interface ApiError {
    status: number
    title: string
    detail: string
}

class PixelzApiService {
    private axiosInstance: AxiosInstance
    private accessToken: string | null = null
    private tokenExpiresAt: number | null = null

    constructor() {
        this.axiosInstance = axios.create({
            baseURL: API_BASE_URL,
            timeout: 60000,
            headers: {
                'Content-Type': 'application/json'
            }
        })

        // Request interceptor for logging
        this.axiosInstance.interceptors.request.use(
            (config) => {
                logger.info(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
                    requestHeaders: config.headers,
                    requestBody: config.data
                })
                return config
            },
            (error) => {
                logger.error('API Request Error', error)
                return Promise.reject(error)
            }
        )

        // Response interceptor for logging
        this.axiosInstance.interceptors.response.use(
            (response) => {
                logger.info(`API Response: ${response.status} ${response.config.url}`, {
                    responseHeaders: response.headers,
                    responseBody: response.data
                })
                return response
            },
            (error) => {
                logger.error(`API Error: ${error.response?.status || 'Network Error'}`, {
                    url: error.config?.url,
                    responseHeaders: error.response?.headers,
                    responseBody: error.response?.data
                })
                return Promise.reject(error)
            }
        )
    }

    async authenticate(clientId: string, clientSecret: string): Promise<TokenResponse> {
        const params = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
            audience: 'automation.api'
        })

        logger.info('Auth Request: POST ' + TOKEN_URL, {
            requestHeaders: { 'Content-Type': 'application/x-www-form-urlencoded' },
            requestBody: { grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret, audience: 'automation.api' }
        })

        const response = await axios.post<TokenResponse>(TOKEN_URL, params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })

        this.accessToken = response.data.access_token
        this.tokenExpiresAt = Date.now() + (response.data.expires_in * 1000)

        logger.info('Auth Response: 200 ' + TOKEN_URL, {
            responseHeaders: response.headers,
            responseBody: { expires_in: response.data.expires_in, token_type: response.data.token_type, access_token: response.data.access_token }
        })

        return response.data
    }

    setToken(token: string, expiresAt: number): void {
        this.accessToken = token
        this.tokenExpiresAt = expiresAt
    }

    getTokenStatus(): { hasToken: boolean; expiresAt: number | null } {
        return {
            hasToken: !!this.accessToken,
            expiresAt: this.tokenExpiresAt
        }
    }

    clearToken(): void {
        this.accessToken = null
        this.tokenExpiresAt = null
    }

    private getAuthHeaders(): Record<string, string> {
        if (!this.accessToken) {
            throw new Error('No access token available')
        }
        return {
            Authorization: `Bearer ${this.accessToken}`
        }
    }

    private getRequestConfig(isAsync: boolean, callbackUrl?: string): AxiosRequestConfig {
        const headers: Record<string, string> = {
            ...this.getAuthHeaders()
        }

        if (isAsync) {
            headers['Respond-Mode'] = 'async'
        }

        return { headers }
    }

    async colorMatching(params: {
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
    }, isAsync: boolean): Promise<JobCreationResponse | { result_image_url: string }> {
        const config = this.getRequestConfig(isAsync, params.callback_url)
        const response = await this.axiosInstance.post('/v1/images/color-matching', params, config)
        return response.data
    }

    async createMask(params: {
        image_url: string
        feather_width?: number
        trimap_url?: string
        callback_url?: string
    }, isAsync: boolean): Promise<JobCreationResponse | { result_image_url: string }> {
        const config = this.getRequestConfig(isAsync, params.callback_url)
        const response = await this.axiosInstance.post('/v1/images/create-mask', params, config)
        return response.data
    }

    async createTrimap(params: {
        image_url: string
        callback_url?: string
    }, isAsync: boolean): Promise<JobCreationResponse | { result_image_url: string; result_trimap_vector_url: string }> {
        const config = this.getRequestConfig(isAsync, params.callback_url)
        const response = await this.axiosInstance.post('/v1/images/create-trimap', params, config)
        return response.data
    }

    async modelCrop(params: {
        image_url: string
        top_crop_location?: string | null
        bottom_crop_location?: string | null
        callback_url?: string
    }, isAsync: boolean): Promise<JobCreationResponse | { result_image_url: string }> {
        const config = this.getRequestConfig(isAsync, params.callback_url)
        const response = await this.axiosInstance.post('/v1/images/model-crop', params, config)
        return response.data
    }

    async removeBackground(params: {
        image_url: string
        feather_width?: number
        transparent_background?: boolean
        background_color?: string | null
        trimap_url?: string
        callback_url?: string
    }, isAsync: boolean): Promise<JobCreationResponse | { result_image_url: string }> {
        const config = this.getRequestConfig(isAsync, params.callback_url)
        const response = await this.axiosInstance.post('/v1/images/remove-background', params, config)
        return response.data
    }

    async getJobStatus(jobId: string): Promise<JobStatusResponse> {
        const config = this.getRequestConfig(false)
        const response = await this.axiosInstance.get(`/v1/images/jobs/${jobId}/status`, config)
        return response.data
    }

    async requestUploadUrl(fileName: string): Promise<{ fileName: string; url: string; expirationTime: string }> {
        const config = this.getRequestConfig(false)
        const response = await this.axiosInstance.post('/v1/files/request-upload-url', { fileName }, config)
        return response.data
    }

    async getWebhookPublicKey(): Promise<{ algorithm: string; encoding: string; public_key: string }> {
        const config = this.getRequestConfig(false)
        const response = await this.axiosInstance.get('/v1/webhook/public-keys', config)
        return response.data
    }
}

export const pixelzApi = new PixelzApiService()
