import { useState, useEffect } from 'react'
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
    Checkbox,
    Text,
    Badge,
    Input,
    useToast,
    Divider,
    useColorMode,
} from '@chakra-ui/react'
import ImageInput from '../image/ImageInput'
import { useSettingsStore } from '../../store/settingsStore'
import { useJobStore, generateJobId, TOKEN_COSTS, INITIAL_POLL_INTERVAL } from '../../store/jobStore'
import { useImageStore } from '../../store/imageStore'

export default function RemoveBackground() {
    const { imageUrl: sharedImageUrl, setImageUrl: setSharedImageUrl } = useImageStore()
    const [featherWidth, setFeatherWidth] = useState(3) // Default to 3
    const [autoFeather, setAutoFeather] = useState(true) // AI determined by default
    const [transparentBackground, setTransparentBackground] = useState(true)
    const [backgroundColor, setBackgroundColor] = useState('#FFFFFF')
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

        // Create job
        const jobId = generateJobId()
        const job = {
            id: jobId,
            type: 'removeBackground' as const,
            status: 'processing' as const,
            isSync,
            createdAt: Date.now(),
            pollInterval: INITIAL_POLL_INTERVAL,
            inputs: {
                image_url: sharedImageUrl,
                feather_width: autoFeather ? undefined : featherWidth,
                transparent_background: transparentBackground,
                background_color: transparentBackground ? null : backgroundColor,
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
                transparent_background: transparentBackground,
                background_color: transparentBackground ? null : backgroundColor,
                trimap_url: trimapUrl || undefined,
                callback_url: webhookUrl || undefined,
            }

            const result = await window.pixelz.api.removeBackground(params, !isSync)

            if (result.success) {
                if (isSync) {
                    // Sync response contains the result directly
                    const data = result.data as { result_image_url: string }
                    updateJob(jobId, {
                        status: 'completed',
                        result: { result_image_url: data.result_image_url },
                    })
                    toast({
                        title: 'Success',
                        description: 'Background removed successfully',
                        status: 'success',
                        duration: 3000,
                    })
                } else {
                    // Async response contains job_id
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
                toast({
                    title: 'Request failed',
                    description: String(result.error),
                    status: 'error',
                    duration: 5000,
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
                {/* Main Image Input */}
                <ImageInput
                    label="Source Image"
                    value={sharedImageUrl}
                    onChange={(url) => setSharedImageUrl(url)}
                />

                <Divider borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'} />

                {/* Feather Width */}
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

                {/* Background Options */}
                <FormControl>
                    <FormLabel fontSize="sm">Background</FormLabel>
                    <VStack
                        align="stretch"
                        spacing={3}
                        bg={colorMode === 'dark' ? 'gray.700' : 'gray.50'}
                        p={4}
                        borderRadius="md"
                        border="1px solid"
                        borderColor={colorMode === 'dark' ? 'transparent' : 'gray.200'}
                    >
                        <Checkbox
                            isChecked={transparentBackground}
                            onChange={(e) => setTransparentBackground(e.target.checked)}
                        >
                            <Text fontSize="sm">Transparent Background</Text>
                        </Checkbox>

                        {transparentBackground && (
                            <Text fontSize="xs" color={colorMode === 'dark' ? 'blue.300' : 'blue.600'}>
                                Output will be a PNG image
                            </Text>
                        )}

                        {!transparentBackground && (
                            <HStack>
                                <Text fontSize="sm">Background Color:</Text>
                                <Input
                                    type="color"
                                    value={backgroundColor}
                                    onChange={(e) => setBackgroundColor(e.target.value)}
                                    w="60px"
                                    h="32px"
                                    p={0}
                                    border="none"
                                    cursor="pointer"
                                />
                                <Text fontSize="sm" fontFamily="mono">{backgroundColor}</Text>
                            </HStack>
                        )}
                    </VStack>
                </FormControl>

                {/* Optional Trimap */}
                <ImageInput
                    label="Trimap (Optional)"
                    value={trimapUrl}
                    onChange={(url) => setTrimapUrl(url)}
                />
                <Text fontSize="xs" color="gray.500" mt={-4}>
                    Custom trimap to control which parts are kept as foreground
                </Text>

                <Divider borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'} />

                {/* Submit Button */}
                <HStack justify="space-between">
                    <Badge colorScheme="green" fontSize="md" px={3} py={1}>
                        Cost: {TOKEN_COSTS.removeBackground} tokens
                    </Badge>

                    <Button
                        colorScheme="brand"
                        size="lg"
                        onClick={handleSubmit}
                        isLoading={isSubmitting}
                        loadingText={processingMode === 'sync' ? 'Processing...' : 'Submitting...'}
                        isDisabled={!sharedImageUrl}
                    >
                        {processingMode === 'sync' ? 'Process (Sync)' : 'Submit Job (Async)'}
                    </Button>
                </HStack>
            </VStack>
        </Box>
    )
}
