import { useState } from 'react'
import {
    Box,
    VStack,
    HStack,
    Button,
    FormControl,
    FormLabel,
    Select,
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

const CROP_LOCATIONS = [
    { value: '', label: 'None (no crop)' },
    { value: 'eye_higher', label: 'Above eye level' },
    { value: 'below_eye', label: 'Below the eyes' },
    { value: 'btw_eye_and_nose', label: 'Between eye and nose' },
    { value: 'below_nose', label: 'Below the nose' },
    { value: 'between_nose_and_mouth', label: 'Between nose and mouth' },
    { value: 'below_mouth', label: 'Below the mouth' },
    { value: 'below_chin', label: 'Below the chin' },
    { value: 'chest', label: 'At chest level' },
    { value: 'at_elbow_higher', label: 'At elbow (higher)' },
    { value: 'at_elbow_lower', label: 'At elbow (lower)' },
    { value: 'waist', label: 'At waist' },
    { value: 'below_buttock', label: 'Below buttock' },
    { value: 'main_body_axis', label: 'Main body axis' },
    { value: 'mid_thigh', label: 'Mid-thigh' },
    { value: 'above_knee', label: 'Above knee' },
    { value: 'at_knee', label: 'At knee' },
    { value: 'below_knee', label: 'Below knee' },
]

export default function ModelCrop() {
    const { imageUrl: sharedImageUrl, setImageUrl: setSharedImageUrl } = useImageStore()
    const [topCropLocation, setTopCropLocation] = useState('')
    const [bottomCropLocation, setBottomCropLocation] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const { processingMode, webhookUrl } = useSettingsStore()
    const { addJob, updateJob, setUiLocked } = useJobStore()
    const toast = useToast()
    const { colorMode } = useColorMode()

    const isValid = sharedImageUrl && (topCropLocation || bottomCropLocation)

    const handleSubmit = async () => {
        if (!sharedImageUrl) {
            toast({
                title: 'Image required',
                status: 'warning',
                duration: 3000,
            })
            return
        }

        if (!topCropLocation && !bottomCropLocation) {
            toast({
                title: 'Crop location required',
                description: 'Please select at least one crop location',
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
            type: 'modelCrop' as const,
            status: 'processing' as const,
            isSync,
            createdAt: Date.now(),
            pollInterval: INITIAL_POLL_INTERVAL,
            inputs: {
                image_url: sharedImageUrl,
                top_crop_location: topCropLocation || null,
                bottom_crop_location: bottomCropLocation || null,
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
                top_crop_location: topCropLocation || null,
                bottom_crop_location: bottomCropLocation || null,
                callback_url: webhookUrl || undefined,
            }

            const result = await window.pixelz.api.modelCrop(params, !isSync)

            if (result.success) {
                if (isSync) {
                    const data = result.data as { result_image_url: string }
                    updateJob(jobId, {
                        status: 'completed',
                        result: { result_image_url: data.result_image_url },
                    })
                    toast({
                        title: 'Success',
                        description: 'Model cropped successfully',
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

                <HStack spacing={6} align="start">
                    <FormControl flex="1">
                        <FormLabel fontSize="sm">Top Crop Location</FormLabel>
                        <Select
                            value={topCropLocation}
                            onChange={(e) => setTopCropLocation(e.target.value)}
                            placeholder="Select location..."
                        >
                            {CROP_LOCATIONS.map((loc) => (
                                <option key={loc.value} value={loc.value}>
                                    {loc.label}
                                </option>
                            ))}
                        </Select>
                        <Text fontSize="xs" color="gray.500" mt={1}>
                            Crops everything above this point
                        </Text>
                    </FormControl>

                    <FormControl flex="1">
                        <FormLabel fontSize="sm">Bottom Crop Location</FormLabel>
                        <Select
                            value={bottomCropLocation}
                            onChange={(e) => setBottomCropLocation(e.target.value)}
                            placeholder="Select location..."
                        >
                            {CROP_LOCATIONS.map((loc) => (
                                <option key={loc.value} value={loc.value}>
                                    {loc.label}
                                </option>
                            ))}
                        </Select>
                        <Text fontSize="xs" color="gray.500" mt={1}>
                            Crops everything below this point
                        </Text>
                    </FormControl>
                </HStack>

                {!topCropLocation && !bottomCropLocation && (
                    <Alert status="warning" borderRadius="md">
                        <AlertIcon />
                        Select at least one crop location
                    </Alert>
                )}

                <Divider borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'} />

                <HStack justify="space-between">
                    <Badge colorScheme="green" fontSize="md" px={3} py={1}>
                        Cost: {TOKEN_COSTS.modelCrop} tokens
                    </Badge>

                    <Button
                        colorScheme="brand"
                        size="lg"
                        onClick={handleSubmit}
                        isLoading={isSubmitting}
                        isDisabled={!isValid}
                    >
                        {processingMode === 'sync' ? 'Process (Sync)' : 'Submit Job (Async)'}
                    </Button>
                </HStack>
            </VStack>
        </Box>
    )
}
