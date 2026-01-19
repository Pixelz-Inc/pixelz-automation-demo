import { useState, useRef, useCallback, useEffect } from 'react'
import { useImageStore } from '../../store/imageStore'
import {
    Box,
    VStack,
    HStack,
    FormControl,
    FormLabel,
    Input,
    Button,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    Image,
    Text,
    Spinner,
    Alert,
    AlertIcon,
    useToast,
    useColorMode,
} from '@chakra-ui/react'
import { AttachmentIcon, LinkIcon } from '@chakra-ui/icons'

interface ImageInputProps {
    label?: string
    value: string
    onChange: (url: string, naturalWidth?: number, naturalHeight?: number) => void
    onCoordinateClick?: (x: number, y: number) => void
    showCoordinatePicker?: boolean
    markers?: Array<{ x: number; y: number; id: string }>
}

export default function ImageInput({
    label = 'Image',
    value,
    onChange,
    onCoordinateClick,
    showCoordinatePicker = false,
    markers = []
}: ImageInputProps) {
    const { imageUrl: globalImageUrl, displayUrl: globalDisplayUrl, setDisplayUrl: setGlobalDisplayUrl } = useImageStore()
    const [inputMode, setInputMode] = useState<'url' | 'upload'>('url')
    const [urlInput, setUrlInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
    const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null) // For uploaded files
    const imageRef = useRef<HTMLImageElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const toast = useToast()
    const { colorMode } = useColorMode()

    // Use local preview URL if available (for uploaded files)
    // Otherwise, if this is the shared source image, use the global display URL
    // Otherwise fall back to the value prop
    const displayUrl = localPreviewUrl || (value === globalImageUrl ? globalDisplayUrl : null) || value

    // Clean up object URL when component unmounts or preview changes
    const cleanupPreview = () => {
        if (localPreviewUrl && localPreviewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(localPreviewUrl)
        }
    }

    const handleUrlSubmit = async () => {
        if (!urlInput) return

        setIsLoading(true)
        setError(null)
        cleanupPreview()
        setLocalPreviewUrl(null)

        try {
            // Validate by trying to load the image
            const img = new window.Image()
            img.crossOrigin = 'anonymous'

            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve()
                img.onerror = () => reject(new Error('Failed to load image'))
                img.src = urlInput
            })

            setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })

            // If this is the global source image, update the global display URL
            if (urlInput === globalImageUrl) {
                setGlobalDisplayUrl(urlInput)
            }

            onChange(urlInput, img.naturalWidth, img.naturalHeight)
        } catch (err) {
            setError('Invalid image URL or image could not be loaded')
        } finally {
            setIsLoading(false)
        }
    }

    const handleFileSelect = async () => {
        // Create a file input element
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/jpeg,image/png,image/webp'

        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return

            setIsLoading(true)
            setError(null)
            cleanupPreview()

            try {
                // Create local object URL for preview
                const objectUrl = URL.createObjectURL(file)

                // Get dimensions from local preview
                const img = new window.Image()
                await new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve()
                    img.onerror = (e) => {
                        console.error('Image load error:', e)
                        reject(new Error('Failed to load image (check CSP or file format)'))
                    }
                    img.src = objectUrl
                })

                const dimensions = { width: img.naturalWidth, height: img.naturalHeight }
                setImageDimensions(dimensions)
                setLocalPreviewUrl(objectUrl)

                // Upload to S3 via presigned URL
                toast({
                    title: 'Uploading...',
                    description: 'Uploading image to server',
                    status: 'info',
                    duration: 2000,
                })

                const arrayBuffer = await file.arrayBuffer()
                const mimeType = file.type || 'application/octet-stream'

                const result = await window.pixelz.files.uploadBuffer(file.name, arrayBuffer, mimeType)

                if (!result.success) {
                    console.error('Buffer upload failed:', result.error)
                    throw new Error(String(result.error) || 'Upload failed')
                }

                const s3Url = result.imageUrl!

                // If this is the global source image, update the global display URL
                // We compare with the value passed to the component
                if (value === globalImageUrl) {
                    setGlobalDisplayUrl(objectUrl)
                }

                // Pass S3 URL to parent (for API calls)
                onChange(s3Url, dimensions.width, dimensions.height)

                toast({
                    title: 'Upload complete',
                    description: 'Image uploaded and ready to use',
                    status: 'success',
                    duration: 3000,
                })
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Failed to upload image file'
                setError(errorMsg)
                cleanupPreview()
                setLocalPreviewUrl(null)
                toast({
                    title: 'Upload failed',
                    description: errorMsg,
                    status: 'error',
                    duration: 5000,
                })
            } finally {
                setIsLoading(false)
            }
        }

        input.click()
    }

    const handleImageClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
        if (!showCoordinatePicker || !onCoordinateClick || !imageRef.current || !imageDimensions) return

        const rect = imageRef.current.getBoundingClientRect()
        const displayX = e.clientX - rect.left
        const displayY = e.clientY - rect.top

        // Scale to natural dimensions
        const scaleX = imageDimensions.width / rect.width
        const scaleY = imageDimensions.height / rect.height

        const naturalX = Math.round(displayX * scaleX)
        const naturalY = Math.round(displayY * scaleY)

        onCoordinateClick(naturalX, naturalY)
    }, [showCoordinatePicker, onCoordinateClick, imageDimensions])

    const getDisplayPosition = (x: number, y: number) => {
        if (!imageRef.current || !imageDimensions) return { left: 0, top: 0 }

        const rect = imageRef.current.getBoundingClientRect()
        const scaleX = rect.width / imageDimensions.width
        const scaleY = rect.height / imageDimensions.height

        return {
            left: x * scaleX,
            top: y * scaleY
        }
    }

    return (
        <FormControl>
            <FormLabel fontSize="sm">{label}</FormLabel>

            <Tabs
                index={inputMode === 'url' ? 0 : 1}
                onChange={(i) => setInputMode(i === 0 ? 'url' : 'upload')}
                variant="soft-rounded"
                colorScheme="brand"
                size="sm"
                mb={4}
            >
                <TabList>
                    <Tab><LinkIcon mr={2} />URL</Tab>
                    <Tab><AttachmentIcon mr={2} />Upload</Tab>
                </TabList>

                <TabPanels>
                    <TabPanel px={0}>
                        <HStack>
                            <Input
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                placeholder="https://example.com/image.jpg"
                                size="sm"
                            />
                            <Button
                                onClick={handleUrlSubmit}
                                size="sm"
                                isLoading={isLoading}
                            >
                                Load
                            </Button>
                        </HStack>
                    </TabPanel>

                    <TabPanel px={0}>
                        <Button
                            onClick={handleFileSelect}
                            leftIcon={<AttachmentIcon />}
                            size="sm"
                            isLoading={isLoading}
                        >
                            Select Image File
                        </Button>
                        <Text fontSize="xs" color={colorMode === 'dark' ? 'gray.500' : 'gray.600'} mt={1}>
                            Supports: JPG, PNG, WEBP
                        </Text>
                    </TabPanel>
                </TabPanels>
            </Tabs>

            {error && (
                <Alert status="error" borderRadius="md" mb={4} fontSize="sm">
                    <AlertIcon />
                    {error}
                </Alert>
            )}

            {displayUrl && (
                <Box
                    ref={containerRef}
                    position="relative"
                    borderRadius="md"
                    overflow="hidden"
                    border="1px"
                    borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                    bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
                >
                    <Image
                        ref={imageRef}
                        src={displayUrl}
                        alt="Input image"
                        maxH="400px"
                        w="100%"
                        objectFit="contain"
                        cursor={showCoordinatePicker ? 'crosshair' : 'default'}
                        onClick={handleImageClick}
                    />

                    {/* Markers overlay */}
                    {markers.map((marker) => {
                        const pos = getDisplayPosition(marker.x, marker.y)
                        return (
                            <Box
                                key={marker.id}
                                position="absolute"
                                left={`${pos.left}px`}
                                top={`${pos.top}px`}
                                transform="translate(-50%, -50%)"
                                w="20px"
                                h="20px"
                                borderRadius="full"
                                bg="brand.500"
                                border="2px solid white"
                                boxShadow="0 0 4px rgba(0,0,0,0.5)"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                fontSize="xs"
                                fontWeight="bold"
                                color="white"
                                pointerEvents="none"
                            >
                                {markers.indexOf(marker) + 1}
                            </Box>
                        )
                    })}

                    {imageDimensions && (
                        <Text fontSize="xs" color={colorMode === 'dark' ? 'gray.500' : 'gray.600'} p={2}>
                            {imageDimensions.width} × {imageDimensions.height}px
                            {showCoordinatePicker && ' • Click to place marker'}
                        </Text>
                    )}
                </Box>
            )}
        </FormControl>
    )
}
