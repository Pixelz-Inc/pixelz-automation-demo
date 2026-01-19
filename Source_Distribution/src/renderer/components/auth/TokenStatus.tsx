import { useState, useEffect } from 'react'
import {
    Box,
    VStack,
    Heading,
    Text,
    Badge,
    Progress,
    Button,
    HStack,
    Checkbox,
    Tooltip,
    useToast,
    useColorMode,
} from '@chakra-ui/react'
import { RepeatIcon } from '@chakra-ui/icons'
import { useAuthStore } from '../../store/authStore'

export default function TokenStatus() {
    const {
        isAuthenticated,
        expiresAt,
        autoRefresh,
        setAuthenticated,
        setAutoRefresh,
    } = useAuthStore()
    const { colorMode } = useColorMode()

    const [timeLeft, setTimeLeft] = useState<number>(0)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const toast = useToast()

    // Update countdown timer
    useEffect(() => {
        if (!isAuthenticated || !expiresAt) {
            setTimeLeft(0)
            return
        }

        const updateTimer = () => {
            const now = Date.now()
            const remaining = Math.max(0, expiresAt - now)
            setTimeLeft(remaining)

            if (remaining === 0) {
                useAuthStore.getState().setAuthenticated(false)
            }
        }

        updateTimer()
        const interval = setInterval(updateTimer, 1000)
        return () => clearInterval(interval)
    }, [isAuthenticated, expiresAt])

    // Handle auto-refresh
    useEffect(() => {
        if (!autoRefresh || !isAuthenticated || !expiresAt) return

        // Random minutes between 1-5
        const minutesBefore = Math.floor(Math.random() * 5) + 1

        window.pixelz.auth.setupAutoRefresh(true, minutesBefore)

        return () => {
            window.pixelz.auth.setupAutoRefresh(false, 0)
        }
    }, [autoRefresh, isAuthenticated, expiresAt])

    const handleRefresh = async () => {
        setIsRefreshing(true)
        try {
            const result = await window.pixelz.auth.refresh()
            if (result.success && result.expiresAt) {
                setAuthenticated(true, result.expiresAt)
                toast({
                    title: 'Token refreshed',
                    status: 'success',
                    duration: 2000,
                })
            } else {
                throw new Error(result.error as string)
            }
        } catch (error) {
            toast({
                title: 'Refresh failed',
                description: String(error),
                status: 'error',
                duration: 5000,
            })
        } finally {
            setIsRefreshing(false)
        }
    }

    const formatTime = (ms: number): string => {
        const totalSeconds = Math.floor(ms / 1000)
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }

    const getProgressColor = (): string => {
        const totalMs = 3600000 // 1 hour
        const percentage = (timeLeft / totalMs) * 100
        if (percentage > 50) return 'green'
        if (percentage > 20) return 'yellow'
        return 'red'
    }

    if (!isAuthenticated) {
        return (
            <Badge colorScheme="red" variant="subtle" px={2} py={1}>
                Not Authenticated
            </Badge>
        )
    }

    return (
        <HStack
            spacing={3}
            bg={colorMode === 'dark' ? 'gray.700' : 'gray.100'}
            px={3}
            py={1.5}
            borderRadius="md"
            border="1px solid"
            borderColor={colorMode === 'dark' ? 'transparent' : 'gray.200'}
        >
            <VStack spacing={0} align="start">
                <Text fontSize="xs" color="gray.400">
                    Token expires in
                </Text>
                <HStack spacing={2}>
                    <Text fontSize="sm" fontWeight="bold" fontFamily="mono">
                        {formatTime(timeLeft)}
                    </Text>
                    <Progress
                        value={(timeLeft / 3600000) * 100}
                        size="xs"
                        colorScheme={getProgressColor()}
                        w="60px"
                        borderRadius="full"
                    />
                </HStack>
            </VStack>

            <Tooltip
                label="Refresh token"
                closeOnClick={true}
                shouldWrapChildren
            >
                <Button
                    size="xs"
                    variant="ghost"
                    onClick={handleRefresh}
                    isLoading={isRefreshing}
                    leftIcon={<RepeatIcon />}
                >
                    Refresh
                </Button>
            </Tooltip>

            <Tooltip
                label="Automatically refresh token before expiry"
                closeOnClick={true}
                shouldWrapChildren
            >
                <Checkbox
                    size="sm"
                    isChecked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                >
                    <Text fontSize="xs">Auto</Text>
                </Checkbox>
            </Tooltip>
        </HStack>
    )
}
