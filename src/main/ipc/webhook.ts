import { IpcMain } from 'electron'
import { pixelzApi } from '../services/pixelzApi'
import { logger } from '../services/logger'
import * as crypto from 'crypto'

let cachedPublicKey: string | null = null

export function registerWebhookHandlers(ipcMain: IpcMain): void {
    // Get webhook public key (cached)
    ipcMain.handle('webhook:getPublicKey', async () => {
        try {
            if (cachedPublicKey) {
                logger.info('Using cached webhook public key')
                return { success: true, publicKey: cachedPublicKey }
            }

            logger.info('Fetching webhook public key from API...')
            const result = await pixelzApi.getWebhookPublicKey()
            logger.debug('Raw public key API response:', result)

            // Extract key data, handling different possible structures
            let keyData: any = result

            // Check for { key: { ... } } wrapper (seen in logs)
            if (result && (result as any).key) {
                keyData = (result as any).key
            }
            // Check for array response
            else if (Array.isArray(result) && result.length > 0) {
                keyData = result[0]
                if (keyData.key) keyData = keyData.key
            }

            if (!keyData || !keyData.public_key) {
                logger.error('Invalid public key structure received', result)
                return { success: false, error: 'Invalid public key structure (missing key.public_key)' }
            }

            cachedPublicKey = keyData.public_key

            return {
                success: true,
                publicKey: keyData.public_key,
                algorithm: keyData.algorithm,
                encoding: keyData.encoding
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: unknown }; message?: string }
            logger.error('Failed to get webhook public key', err.response?.data || err.message)
            return { success: false, error: err.response?.data || err.message }
        }
    })

    // Verify webhook signature
    ipcMain.handle('webhook:verify', async (_, payload: string, signature: string, publicKeyBase64?: string) => {
        try {
            logger.info('Webhook verification requested', {
                payloadProvided: !!payload,
                signatureProvided: !!signature,
                overrideKeyProvided: !!publicKeyBase64
            })

            if (!payload) throw new Error('Payload is missing or empty.')
            if (!signature) throw new Error('Signature is missing or empty.')

            // Use provided key or fetch/use cached
            let publicKey = publicKeyBase64
            if (!publicKey) {
                if (cachedPublicKey) {
                    publicKey = cachedPublicKey
                } else {
                    logger.info('Fetching public key for verification...')
                    const response = await pixelzApi.getWebhookPublicKey()

                    let keyData: any = response
                    if (response && (response as any).key) {
                        keyData = (response as any).key
                    } else if (Array.isArray(response) && response.length > 0) {
                        keyData = response[0]
                        if (keyData.key) keyData = keyData.key
                    }

                    if (!keyData || !keyData.public_key) {
                        throw new Error('Could not retrieve public key from API structure.')
                    }

                    cachedPublicKey = keyData.public_key
                    publicKey = keyData.public_key
                }
            }

            if (!publicKey) {
                throw new Error('Public key is missing. Please provide it manually.')
            }

            // Decode the public key
            let publicKeyBuffer: Buffer
            try {
                publicKeyBuffer = Buffer.from(publicKey, 'base64')
            } catch (e) {
                throw new Error('Failed to decode public key from Base64.')
            }

            // Create public key object
            const keyObject = crypto.createPublicKey({
                key: publicKeyBuffer,
                format: 'der',
                type: 'spki'
            })

            // Decode signature
            let signatureBuffer: Buffer
            try {
                signatureBuffer = Buffer.from(signature, 'base64')
            } catch (e) {
                throw new Error('Failed to decode signature from Base64.')
            }

            // Verify using ECDSA with SHA256
            // Note: Pixelz signatures are usually 64-byte raw (IEEE-P1363)
            const isValid = crypto.verify(
                'SHA256',
                Buffer.from(payload),
                {
                    key: keyObject,
                    dsaEncoding: signatureBuffer.length === 64 ? 'ieee-p1363' : 'der'
                },
                signatureBuffer
            )

            logger.info('Verification result:', {
                isValid,
                sigLen: signatureBuffer.length,
                encoding: signatureBuffer.length === 64 ? 'ieee-p1363' : 'der'
            })

            return { success: true, isValid }
        } catch (error: unknown) {
            const err = error as { message?: string }
            logger.error('Webhook verification error', err.message)
            return { success: false, error: err.message || 'Unknown verification error', isValid: false }
        }
    })

    // Clear cached public key
    ipcMain.handle('webhook:clearCache', () => {
        cachedPublicKey = null
        logger.info('Webhook public key cache cleared')
        return { success: true }
    })
}
