import { useState, useEffect } from 'react'
import {
    Box,
    VStack,
    Heading,
    FormControl,
    FormLabel,
    Input,
    InputGroup,
    InputRightElement,
    Button,
    Checkbox,
    Alert,
    AlertIcon,
    IconButton,
    useToast,
    Text,
    Divider,
} from '@chakra-ui/react'
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons'
import { useAuthStore } from '../../store/authStore'

export default function AuthForm() {
    const [clientId, setClientId] = useState('')
    const [clientSecret, setClientSecret] = useState('')
    const [showSecret, setShowSecret] = useState(false)
    const [saveCredentials, setSaveCredentials] = useState(false)
    const [hasStoredCredentials, setHasStoredCredentials] = useState(false)

    const { isAuthenticated, isLoading, error, setLoading, setError, setAuthenticated } = useAuthStore()
    const toast = useToast()

    // Check for stored credentials on mount
    useEffect(() => {
        const loadStoredCredentials = async () => {
            const { hasCredentials } = await window.pixelz.storage.hasCredentials()
            setHasStoredCredentials(hasCredentials)

            if (hasCredentials) {
                const result = await window.pixelz.storage.loadCredentials()
                if (result.success && result.credentials) {
                    setClientId(result.credentials.clientId)
                    setClientSecret(result.credentials.clientSecret)
                    setSaveCredentials(true)
                }
            }
        }
        loadStoredCredentials()
    }, [])

    const handleLogin = async () => {
        if (!clientId || !clientSecret) {
            setError('Please enter both Client ID and Client Secret')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const result = await window.pixelz.auth.login(clientId, clientSecret)

            if (result.success && result.expiresAt) {
                setAuthenticated(true, result.expiresAt)

                // Save credentials if requested
                if (saveCredentials) {
                    await window.pixelz.storage.saveCredentials(clientId, clientSecret)
                }

                toast({
                    title: 'Authentication successful',
                    description: `Token valid for ${Math.round((result.expiresIn || 3600) / 60)} minutes`,
                    status: 'success',
                    duration: 3000,
                })
            } else {
                throw new Error(typeof result.error === 'string' ? result.error : 'Authentication failed')
            }
        } catch (err) {
            setError(String(err))
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        await window.pixelz.auth.logout()
        useAuthStore.getState().reset()
        toast({
            title: 'Logged out',
            status: 'info',
            duration: 2000,
        })
    }

    const handleClearCredentials = async () => {
        await window.pixelz.storage.clearCredentials()
        setClientId('')
        setClientSecret('')
        setSaveCredentials(false)
        setHasStoredCredentials(false)
        toast({
            title: 'Stored credentials cleared',
            status: 'info',
            duration: 2000,
        })
    }

    if (isAuthenticated) {
        return (
            <Box p={4}>
                <VStack spacing={4} align="stretch">
                    <Alert status="success" borderRadius="md">
                        <AlertIcon />
                        Authenticated successfully
                    </Alert>

                    <Button onClick={handleLogout} variant="outline" colorScheme="red" size="sm">
                        Logout
                    </Button>
                </VStack>
            </Box>
        )
    }

    return (
        <Box p={4}>
            <VStack spacing={4} align="stretch">
                <Heading size="sm" color="gray.300">
                    Authentication
                </Heading>

                <Text fontSize="sm" color="gray.500">
                    Enter your Pixelz API credentials to get started.
                </Text>

                {error && (
                    <Alert status="error" borderRadius="md" fontSize="sm">
                        <AlertIcon />
                        {error}
                    </Alert>
                )}

                <FormControl>
                    <FormLabel fontSize="sm">Client ID</FormLabel>
                    <Input
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder="Enter your client ID"
                        size="sm"
                    />
                </FormControl>

                <FormControl>
                    <FormLabel fontSize="sm">Client Secret</FormLabel>
                    <InputGroup size="sm">
                        <Input
                            type={showSecret ? 'text' : 'password'}
                            value={clientSecret}
                            onChange={(e) => setClientSecret(e.target.value)}
                            placeholder="Enter your client secret"
                        />
                        <InputRightElement>
                            <IconButton
                                aria-label={showSecret ? 'Hide secret' : 'Show secret'}
                                icon={showSecret ? <ViewOffIcon /> : <ViewIcon />}
                                onClick={() => setShowSecret(!showSecret)}
                                variant="ghost"
                                size="xs"
                            />
                        </InputRightElement>
                    </InputGroup>
                </FormControl>

                <Checkbox
                    size="sm"
                    isChecked={saveCredentials}
                    onChange={(e) => setSaveCredentials(e.target.checked)}
                >
                    <Text fontSize="sm">Remember credentials (encrypted)</Text>
                </Checkbox>

                <Button
                    onClick={handleLogin}
                    isLoading={isLoading}
                    loadingText="Authenticating..."
                    colorScheme="brand"
                    size="sm"
                >
                    Get Access Token
                </Button>

                {hasStoredCredentials && (
                    <>
                        <Divider />
                        <Button
                            onClick={handleClearCredentials}
                            variant="ghost"
                            size="xs"
                            colorScheme="red"
                        >
                            Clear Stored Credentials
                        </Button>
                    </>
                )}
            </VStack>
        </Box>
    )
}
