import { useState } from 'react'
import {
    Box,
    VStack,
    HStack,
    Button,
    Text,
    Badge,
    useToast,
    Divider,
    Alert,
    AlertIcon,
    useColorMode,
} from '@chakra-ui/react'
import ImageInput from '../image/ImageInput'
import { useSettingsStore } from '../../store/settingsStore'
import { useJobStore, generateJobId, TOKEN_COSTS, INITIAL_POLL_INTERVAL } from '../../store/jobStore'
import { useImageStore } from '../../store/imageStore'

export default function CreateTrimap() {
    const { imageUrl: sharedImageUrl, setImageUrl: setSharedImageUrl } = useImageStore()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const { processingMode, webhookUrl } = useSettingsStore()
    const { addJob, updateJob, setUiLocked } = useJobStore()
    const toast = useToast()
    const { colorMode } = useColorMode()

    const handleSubmit = async () => {
        if (!sharedImageUrl) {
            toast({
                title: 'Image required',
                description: 'Please provide an image URL or upload an image',
                status: 'warning',
                duration: 3000,
            })
            return
        }

        setIsSubmitting(true)
        const isSync = processingMode === 'sync'

        const jobId = generateJobId()
        const job = {
            id: jobId,
            type: 'createTrimap' as const,
            status: 'processing' as const,
            isSync,
            createdAt: Date.now(),
            pollInterval: INITIAL_POLL_INTERVAL,
            inputs: {
                image_url: sharedImageUrl,
                callback_url: webhookUrl || undefined,
            },
        }

        addJob(job)

        if (isSync) {
            setUiLocked(true)
        }

        try {
            const params = {
                image_url: sharedImageUrl,
                callback_url: webhookUrl || undefined,
            }

            const result = await window.pixelz.api.createTrimap(params, !isSync)

            if (result.success) {
                if (isSync) {
                    const data = result.data as { result_image_url: string; result_trimap_vector_url: string }
                    updateJob(jobId, {
                        status: 'completed',
                        result: {
                            result_image_url: data.result_image_url,
                            result_trimap_vector_url: data.result_trimap_vector_url
                        },
                    })
                    toast({
                        title: 'Success',
                        description: 'Trimap created successfully',
                        status: 'success',
                        duration: 3000,
                    })
                } else {
                    const data = result.data as { job_id: string; retryAfter?: number }
                    updateJob(jobId, {
                        jobId: data.job_id,
                        status: 'processing',
                        retryAfter: data.retryAfter,
                        lastCheckedAt: Date.now(),
                        nextCheckAt: Date.now() + (data.retryAfter ? data.retryAfter * 1000 : INITIAL_POLL_INTERVAL),
                    })
                    toast({
                        title: 'Job submitted',
                        description: `Job ID: ${data.job_id}`,
                        status: 'info',
                        duration: 3000,
                    })
                }
            } else {
                updateJob(jobId, {
                    status: 'failed',
                    error: String(result.error),
                })
            }
        } catch (error) {
            updateJob(jobId, {
                status: 'failed',
                error: String(error),
            })
        } finally {
            setIsSubmitting(false)
            if (isSync) {
                setUiLocked(false)
            }
        }
    }

    return (
        <Box p={6}>
            <VStack spacing={6} align="stretch">
                <ImageInput
                    label="Source Image"
                    value={sharedImageUrl}
                    onChange={(url) => setSharedImageUrl(url)}
                />

                <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <VStack align="start" spacing={1}>
                        <Text fontSize="sm" fontWeight="medium">
                            This method has no additional options
                        </Text>
                        <Text fontSize="xs" color={colorMode === 'dark' ? 'gray.400' : 'gray.600'}>
                            Returns both a PNG trimap image and a JSON vector file
                        </Text>
                    </VStack>
                </Alert>

                <Divider borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'} />

                <HStack justify="space-between">
                    <Badge colorScheme="green" fontSize="md" px={3} py={1}>
                        Cost: {TOKEN_COSTS.createTrimap} tokens
                    </Badge>

                    <Button
                        colorScheme="brand"
                        size="lg"
                        onClick={handleSubmit}
                        isLoading={isSubmitting}
                        isDisabled={!sharedImageUrl}
                    >
                        {processingMode === 'sync' ? 'Process (Sync)' : 'Submit Job (Async)'}
                    </Button>
                </HStack>
            </VStack>
        </Box>
    )
}
