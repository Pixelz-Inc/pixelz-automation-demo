import { useState } from 'react'
import {
    Box,
    VStack,
    HStack,
    Button,
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
    FormControl,
    FormLabel,
    Text,
    Badge,
    Input,
    useToast,
    Divider,
    useColorMode,
    Checkbox,
} from '@chakra-ui/react'
import ImageInput from '../image/ImageInput'
import { useSettingsStore } from '../../store/settingsStore'
import { useJobStore, generateJobId, TOKEN_COSTS, INITIAL_POLL_INTERVAL } from '../../store/jobStore'
import { useImageStore } from '../../store/imageStore'

export default function CreateMask() {
    const { imageUrl: sharedImageUrl, setImageUrl: setSharedImageUrl } = useImageStore()
    const [featherWidth, setFeatherWidth] = useState(3) // Default to 3
    const [autoFeather, setAutoFeather] = useState(true) // AI determined by default
    const [trimapUrl, setTrimapUrl] = useState('')
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
            type: 'createMask' as const,
            status: 'processing' as const,
            isSync,
            createdAt: Date.now(),
            pollInterval: INITIAL_POLL_INTERVAL,
            inputs: {
                image_url: sharedImageUrl,
                feather_width: autoFeather ? undefined : featherWidth,
                trimap_url: trimapUrl || undefined,
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
                feather_width: autoFeather ? undefined : featherWidth,
                trimap_url: trimapUrl || undefined,
                callback_url: webhookUrl || undefined,
            }

            const result = await window.pixelz.api.createMask(params, !isSync)

            if (result.success) {
                if (isSync) {
                    const data = result.data as { result_image_url: string }
                    updateJob(jobId, {
                        status: 'completed',
                        result: { result_image_url: data.result_image_url },
                    })
                    toast({
                        title: 'Success',
                        description: 'Mask created successfully',
                        status: 'success',
                        duration: 3000,
                    })
                } else {
                    const data = result.data as { job_id: string }
                    updateJob(jobId, {
                        jobId: data.job_id,
                        status: 'processing',
                        lastCheckedAt: Date.now(),
                        nextCheckAt: Date.now() + INITIAL_POLL_INTERVAL,
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

                <Divider borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'} />

                <FormControl>
                    <HStack justify="space-between" mb={2}>
                        <HStack spacing={4}>
                            <FormLabel fontSize="sm" mb={0}>Feather Width</FormLabel>
                            <Checkbox
                                isChecked={autoFeather}
                                onChange={(e) => setAutoFeather(e.target.checked)}
                                size="sm"
                                colorScheme="brand"
                            >
                                <Text fontSize="xs">AI Determined</Text>
                            </Checkbox>
                        </HStack>
                        {!autoFeather && <Badge colorScheme="brand">{featherWidth}</Badge>}
                    </HStack>
                    <Slider
                        value={featherWidth}
                        onChange={setFeatherWidth}
                        min={0}
                        max={20}
                        step={1}
                        isDisabled={autoFeather}
                        opacity={autoFeather ? 0.4 : 1}
                    >
                        <SliderTrack>
                            <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb />
                    </Slider>
                    <Text fontSize="xs" color="gray.500" mt={1}>
                        {autoFeather
                            ? "AI will determine the best feather width"
                            : "0 = sharp edges, higher values = softer edges"}
                    </Text>
                </FormControl>

                <ImageInput
                    label="Trimap (Optional)"
                    value={trimapUrl}
                    onChange={(url) => setTrimapUrl(url)}
                />
                <Text fontSize="xs" color="gray.500" mt={-4}>
                    Custom trimap to control masked areas
                </Text>

                <Divider borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'} />

                <HStack justify="space-between">
                    <Badge colorScheme="green" fontSize="md" px={3} py={1}>
                        Cost: {TOKEN_COSTS.createMask} tokens
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
