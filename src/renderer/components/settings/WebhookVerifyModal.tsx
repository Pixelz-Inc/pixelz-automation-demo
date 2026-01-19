import { useState, useEffect } from 'react'
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalCloseButton,
    VStack,
    HStack,
    FormControl,
    FormLabel,
    Textarea,
    Input,
    Button,
    Alert,
    AlertIcon,
    Text,
    Code,
    useToast,
    useDisclosure,
    Collapse,
    Link,
    Box,
    Divider,
    useColorMode,
} from '@chakra-ui/react'
import { ChevronDownIcon, ChevronUpIcon, RepeatIcon } from '@chakra-ui/icons'

interface WebhookVerifyModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function WebhookVerifyModal({ isOpen, onClose }: WebhookVerifyModalProps) {
    const [payload, setPayload] = useState('')
    const [signature, setSignature] = useState('')
    const [customPublicKey, setCustomPublicKey] = useState('')
    const [isVerifying, setIsVerifying] = useState(false)
    const [result, setResult] = useState<{ isValid: boolean; message: string } | null>(null)
    const { isOpen: isAdvancedOpen, onToggle: onAdvancedToggle, onOpen: openAdvanced } = useDisclosure()
    const toast = useToast()
    const { colorMode } = useColorMode()

    // Auto-fetch public key on open
    useEffect(() => {
        if (isOpen) {
            fetchPublicKey()
        }
    }, [isOpen])

    const fetchPublicKey = async () => {
        try {
            const response = await window.pixelz.webhook.getPublicKey()
            if (response.success && response.publicKey) {
                setCustomPublicKey(response.publicKey)
            } else if (!response.success) {
                toast({
                    title: 'Public Key Fetch Failed',
                    description: typeof response.error === 'string'
                        ? response.error
                        : JSON.stringify(response.error) || 'The API did not return a valid public key.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                })
            }
        } catch (error) {
            console.error('Failed to auto-fetch public key:', error)
            toast({
                title: 'Network Error',
                description: 'Failed to connect to the public key endpoint.',
                status: 'error',
                duration: 5000,
            })
        }
    }

    const handleVerify = async () => {
        if (!payload || !signature) {
            toast({
                title: 'Missing input',
                description: 'Please enter both payload and signature',
                status: 'warning',
                duration: 3000,
            })
            return
        }

        setIsVerifying(true)
        setResult(null)

        try {
            const response = await window.pixelz.webhook.verify(payload, signature, customPublicKey || undefined)

            if (response.success) {
                setResult({
                    isValid: response.isValid || false,
                    message: response.isValid
                        ? 'Signature is valid! The webhook payload is authentic.'
                        : 'Signature is invalid. The payload may have been tampered with. Make sure you are using the EXACT raw JSON body including any whitespace.'
                })
            } else {
                setResult({
                    isValid: false,
                    message: `${response.error}`
                })
            }
        } catch (error) {
            setResult({
                isValid: false,
                message: `Error: ${String(error)}`
            })
        } finally {
            setIsVerifying(false)
        }
    }

    const handleClearCache = async () => {
        try {
            setCustomPublicKey('')
            await window.pixelz.webhook.clearCache()
            await fetchPublicKey()
            toast({
                title: 'Key re-fetched',
                description: 'The public key has been cleared and re-fetched from the API.',
                status: 'success',
                duration: 3000,
            })
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to clear public key cache',
                status: 'error',
                duration: 3000,
            })
        }
    }

    const handleClose = () => {
        setPayload('')
        setSignature('')
        setCustomPublicKey('')
        setResult(null)
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="lg">
            <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
            <ModalContent
                bg={colorMode === 'dark' ? 'gray.800' : 'white'}
                borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
                borderWidth="1px"
            >
                <ModalHeader>Webhook Signature Verification</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <VStack spacing={4} align="stretch">
                        <Text fontSize="sm" color={colorMode === 'dark' ? 'gray.400' : 'gray.600'}>
                            Verify the authenticity of webhooks using ECDSA (P-256) with SHA-256.
                            Ensure the payload is the <strong>exact, raw JSON body</strong> including any spaces or newlines.
                        </Text>

                        <FormControl isRequired>
                            <FormLabel fontSize="sm">Webhook Payload (Raw JSON Body)</FormLabel>
                            <Textarea
                                value={payload}
                                onChange={(e) => setPayload(e.target.value)}
                                placeholder='{"JobId": "...", "Status": "completed", ...}'
                                rows={4}
                                fontFamily="mono"
                                fontSize="xs"
                                bg={colorMode === 'dark' ? 'gray.900' : 'gray.50'}
                            />
                        </FormControl>

                        <FormControl isRequired>
                            <FormLabel fontSize="sm">X-Signature Header</FormLabel>
                            <Input
                                value={signature}
                                onChange={(e) => setSignature(e.target.value)}
                                placeholder="Base64-encoded signature (e.g. 4R8y5h...)"
                                fontFamily="mono"
                                fontSize="xs"
                                size="sm"
                                bg={colorMode === 'dark' ? 'gray.900' : 'gray.50'}
                            />
                        </FormControl>

                        <Box>
                            <Link
                                fontSize="xs"
                                color="brand.400"
                                onClick={onAdvancedToggle}
                                display="flex"
                                alignItems="center"
                                userSelect="none"
                            >
                                {isAdvancedOpen ? <ChevronUpIcon mr={1} /> : <ChevronDownIcon mr={1} />}
                                Advanced Tools & Public Key Override
                            </Link>

                            <Collapse in={isAdvancedOpen} animateOpacity>
                                <VStack mt={4} spacing={4} align="stretch" pb={2}>
                                    <Divider borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'} />

                                    <FormControl>
                                        <HStack justify="space-between" mb={2}>
                                            <FormLabel fontSize="xs" m={0}>Global Public Key Override</FormLabel>
                                            <Button
                                                size="xs"
                                                leftIcon={<RepeatIcon />}
                                                variant="ghost"
                                                onClick={handleClearCache}
                                            >
                                                Force Re-fetch From API
                                            </Button>
                                        </HStack>
                                        <Textarea
                                            value={customPublicKey}
                                            onChange={(e) => setCustomPublicKey(e.target.value)}
                                            placeholder="Paste SPKI Base64 Public Key (optional)"
                                            rows={3}
                                            fontFamily="mono"
                                            fontSize="xs"
                                            bg={colorMode === 'dark' ? 'gray.900' : 'gray.50'}
                                        />
                                        <Text fontSize="2xs" color={colorMode === 'dark' ? 'gray.500' : 'gray.400'} mt={1}>
                                            Leave empty to use the public key automatically fetched from Pixelz API.
                                        </Text>
                                    </FormControl>
                                </VStack>
                            </Collapse>
                        </Box>

                        {result && (
                            <Alert
                                status={result.isValid ? 'success' : 'error'}
                                borderRadius="md"
                                bg={result.isValid
                                    ? (colorMode === 'dark' ? 'success.900' : 'green.50')
                                    : (colorMode === 'dark' ? 'error.900' : 'red.50')}
                                color={result.isValid
                                    ? (colorMode === 'dark' ? 'white' : 'green.800')
                                    : (colorMode === 'dark' ? 'white' : 'red.800')}
                                border="1px solid"
                                borderColor={result.isValid ? 'green.200' : 'red.200'}
                            >
                                <AlertIcon color={result.isValid ? 'green.500' : 'red.500'} />
                                <Box fontSize="sm">
                                    {result.message}
                                </Box>
                            </Alert>
                        )}
                    </VStack>
                </ModalBody>

                <ModalFooter borderTop="1px solid" borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}>
                    <Button variant="ghost" mr={3} onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        colorScheme="brand"
                        onClick={handleVerify}
                        isLoading={isVerifying}
                        loadingText="Verifying..."
                        px={8}
                    >
                        Verify Now
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}
