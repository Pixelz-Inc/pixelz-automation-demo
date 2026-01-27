import { useState, useCallback } from 'react'
import {
    Box,
    VStack,
    HStack,
    Button,
    FormControl,
    FormLabel,
    Input,
    Text,
    Badge,
    useToast,
    Divider,
    IconButton,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    Alert,
    AlertIcon,
    useColorMode,
} from '@chakra-ui/react'
import { AddIcon, DeleteIcon } from '@chakra-ui/icons'
import ImageInput from '../image/ImageInput'
import { useSettingsStore } from '../../store/settingsStore'
import { useJobStore, generateJobId, TOKEN_COSTS, INITIAL_POLL_INTERVAL } from '../../store/jobStore'
import { useImageStore } from '../../store/imageStore'

interface ColorMarker {
    id: string
    x_coordinate: number
    y_coordinate: number
    type: 'color' | 'swatch'
    swatch_color_code?: string
    swatch_image?: {
        swatch_image_url: string
        x_coordinate: number
        y_coordinate: number
    }
}

export default function ColorMatching() {
    const { imageUrl: sharedImageUrl, setImageUrl: setSharedImageUrl, imageDimensions, setImageDimensions } = useImageStore()
    const [markers, setMarkers] = useState<ColorMarker[]>([])
    const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const { processingMode, webhookUrl } = useSettingsStore()
    const { addJob, updateJob, setUiLocked } = useJobStore()
    const toast = useToast()
    const { colorMode } = useColorMode()

    const handleImageChange = (url: string, width?: number, height?: number) => {
        setSharedImageUrl(url)
        if (width && height) {
            setImageDimensions({ width, height })
        }
    }

    const handleAddMarker = () => {
        const newMarker: ColorMarker = {
            id: `marker_${Date.now()}`,
            x_coordinate: 0,
            y_coordinate: 0,
            type: 'color',
            swatch_color_code: '#FF0000',
        }
        setMarkers([...markers, newMarker])
        setActiveMarkerId(newMarker.id)
        toast({
            title: 'Marker added',
            description: 'Click on the image to set the marker position',
            status: 'info',
            duration: 3000,
        })
    }

    const handleRemoveMarker = (id: string) => {
        setMarkers(markers.filter(m => m.id !== id))
        if (activeMarkerId === id) {
            setActiveMarkerId(null)
        }
    }

    const handleImageClick = useCallback((x: number, y: number) => {
        if (!activeMarkerId) {
            toast({
                title: 'No marker selected',
                description: 'Click "Add Marker" first, then click on the image',
                status: 'warning',
                duration: 3000,
            })
            return
        }

        setMarkers(prev => prev.map(m =>
            m.id === activeMarkerId
                ? { ...m, x_coordinate: x, y_coordinate: y }
                : m
        ))

        toast({
            title: 'Marker position set',
            description: `X: ${x}, Y: ${y}`,
            status: 'success',
            duration: 2000,
        })
    }, [activeMarkerId, toast])

    const handleMarkerTypeChange = (id: string, type: 'color' | 'swatch') => {
        setMarkers(prev => prev.map(m =>
            m.id === id
                ? {
                    ...m,
                    type,
                    swatch_color_code: type === 'color' ? (m.swatch_color_code || '#FF0000') : undefined,
                    swatch_image: type === 'swatch' ? m.swatch_image : undefined,
                }
                : m
        ))
    }

    const handleColorChange = (id: string, color: string) => {
        setMarkers(prev => prev.map(m =>
            m.id === id ? { ...m, swatch_color_code: color } : m
        ))
    }

    const handleSwatchImageChange = (id: string, url: string, x: number = 0, y: number = 0) => {
        setMarkers(prev => prev.map(m =>
            m.id === id ? {
                ...m,
                swatch_image: {
                    swatch_image_url: url,
                    x_coordinate: x,
                    y_coordinate: y
                }
            } : m
        ))
    }

    const isValid = sharedImageUrl && markers.length > 0 && markers.every(m =>
        m.x_coordinate > 0 || m.y_coordinate > 0
    )

    const handleSubmit = async () => {
        if (!sharedImageUrl) {
            toast({ title: 'Image required', status: 'warning', duration: 3000 })
            return
        }

        if (markers.length === 0) {
            toast({ title: 'Add at least one marker', status: 'warning', duration: 3000 })
            return
        }

        setIsSubmitting(true)
        const isSync = processingMode === 'sync'

        const colorMarkers = markers.map(m => ({
            x_coordinate: m.x_coordinate,
            y_coordinate: m.y_coordinate,
            swatch_color_code: m.type === 'color' ? m.swatch_color_code : null,
            swatch_image: m.type === 'swatch' ? m.swatch_image : null,
        }))

        const jobId = generateJobId()
        const job = {
            id: jobId,
            type: 'colorMatching' as const,
            status: 'processing' as const,
            isSync,
            createdAt: Date.now(),
            pollInterval: INITIAL_POLL_INTERVAL,
            inputs: {
                image_url: sharedImageUrl,
                color_markers: colorMarkers,
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
                color_markers: colorMarkers,
                callback_url: webhookUrl || undefined,
            }

            const result = await window.pixelz.api.colorMatching(params, !isSync)

            if (result.success) {
                if (isSync) {
                    const data = result.data as { result_image_url: string }
                    updateJob(jobId, {
                        status: 'completed',
                        result: { result_image_url: data.result_image_url },
                    })
                    toast({
                        title: 'Success',
                        description: 'Color matching completed',
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
                    onChange={handleImageChange}
                    onCoordinateClick={handleImageClick}
                    showCoordinatePicker={!!activeMarkerId}
                    markers={markers.map(m => ({ x: m.x_coordinate, y: m.y_coordinate, id: m.id }))}
                />

                <Divider borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'} />

                {/* Color Markers Section */}
                <Box>
                    <HStack justify="space-between" mb={4}>
                        <FormLabel fontSize="sm" mb={0}>Color Markers</FormLabel>
                        <Button
                            size="sm"
                            leftIcon={<AddIcon />}
                            onClick={handleAddMarker}
                            isDisabled={!sharedImageUrl}
                        >
                            Add Marker
                        </Button>
                    </HStack>

                    {markers.length === 0 ? (
                        <Alert status="info" borderRadius="md">
                            <AlertIcon />
                            Add markers to specify which areas should be color-matched
                        </Alert>
                    ) : (
                        <VStack spacing={3} align="stretch">
                            {markers.map((marker, index) => (
                                <Box
                                    key={marker.id}
                                    p={4}
                                    bg={activeMarkerId === marker.id
                                        ? (colorMode === 'dark' ? 'gray.700' : 'brand.50')
                                        : (colorMode === 'dark' ? 'gray.750' : 'white')}
                                    borderRadius="md"
                                    border="1px"
                                    borderColor={activeMarkerId === marker.id ? 'brand.500' : (colorMode === 'dark' ? 'gray.600' : 'gray.200')}
                                    cursor="pointer"
                                    onClick={() => setActiveMarkerId(marker.id)}
                                >
                                    <HStack justify="space-between" mb={3}>
                                        <HStack>
                                            <Badge colorScheme="brand">{index + 1}</Badge>
                                            <Text fontSize="sm">
                                                Position: ({marker.x_coordinate}, {marker.y_coordinate})
                                            </Text>
                                        </HStack>
                                        <IconButton
                                            aria-label="Remove marker"
                                            icon={<DeleteIcon />}
                                            size="xs"
                                            colorScheme="red"
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleRemoveMarker(marker.id)
                                            }}
                                        />
                                    </HStack>

                                    <Tabs
                                        index={marker.type === 'color' ? 0 : 1}
                                        onChange={(i) => handleMarkerTypeChange(marker.id, i === 0 ? 'color' : 'swatch')}
                                        size="sm"
                                        variant="soft-rounded"
                                    >
                                        <TabList>
                                            <Tab>Color Code</Tab>
                                            <Tab>Swatch Image</Tab>
                                        </TabList>
                                        <TabPanels>
                                            <TabPanel px={0}>
                                                <HStack>
                                                    <Input
                                                        type="color"
                                                        value={marker.swatch_color_code || '#FF0000'}
                                                        onChange={(e) => handleColorChange(marker.id, e.target.value)}
                                                        w="60px"
                                                        h="40px"
                                                        p={0}
                                                        border="none"
                                                    />
                                                    <Text fontSize="sm" fontFamily="mono">
                                                        {marker.swatch_color_code}
                                                    </Text>
                                                </HStack>
                                            </TabPanel>
                                            <TabPanel px={0}>
                                                <ImageInput
                                                    label="Swatch Image"
                                                    value={marker.swatch_image?.swatch_image_url || ''}
                                                    onChange={(url) => handleSwatchImageChange(marker.id, url)}
                                                    onCoordinateClick={(x, y) => handleSwatchImageChange(marker.id, marker.swatch_image?.swatch_image_url || '', x, y)}
                                                    showCoordinatePicker={true}
                                                    markers={marker.swatch_image ? [{
                                                        x: marker.swatch_image.x_coordinate,
                                                        y: marker.swatch_image.y_coordinate,
                                                        id: `${marker.id}_swatch`
                                                    }] : []}
                                                />
                                                <Text fontSize="xs" color={colorMode === 'dark' ? 'gray.400' : 'gray.600'} mt={2}>
                                                    Click on the swatch image to set the source color coordinate.
                                                </Text>
                                            </TabPanel>
                                        </TabPanels>
                                    </Tabs>
                                </Box>
                            ))}
                        </VStack>
                    )}
                </Box>

                <Divider borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'} />

                <HStack justify="space-between">
                    <Badge colorScheme="green" fontSize="md" px={3} py={1}>
                        Cost: {TOKEN_COSTS.colorMatching} tokens
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
