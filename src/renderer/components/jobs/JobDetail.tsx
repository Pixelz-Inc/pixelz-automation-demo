import { useState, useEffect } from 'react'
import {
    Box,
    VStack,
    HStack,
    Heading,
    Text,
    Badge,
    Button,
    Image,
    Spinner,
    Alert,
    AlertIcon,
    Code,
    Divider,
    Link,
    Progress,
} from '@chakra-ui/react'
import { ExternalLinkIcon, RepeatIcon, SearchIcon } from '@chakra-ui/icons'
import { useJobStore, Job, METHOD_NAMES, INITIAL_POLL_INTERVAL } from '../../store/jobStore'
import { useJobPolling } from '../../hooks/useJobPolling'
import { useColorMode } from '@chakra-ui/react'

export default function JobDetail() {
    const { selectedJobId, jobs, updateJob } = useJobStore()
    const { checkNow } = useJobPolling()
    const [checkCooldown, setCheckCooldown] = useState(false)
    const [, forceUpdate] = useState(0)
    const { colorMode } = useColorMode()

    const job = jobs.find(j => j.id === selectedJobId)

    // Force update every second to refresh countdown timer
    useEffect(() => {
        const interval = setInterval(() => forceUpdate(n => n + 1), 1000)
        return () => clearInterval(interval)
    }, [])

    const handleCheckNow = async () => {
        if (!job?.jobId || checkCooldown) return

        setCheckCooldown(true)

        try {
            await checkNow(job.id)
        } catch (error) {
            console.error('Check now failed:', error)
        }

        // 2 second cooldown
        setTimeout(() => setCheckCooldown(false), 2000)
    }

    const handleCheckStatusWithApi = async () => {
        if (!job?.jobId || checkCooldown) return

        setCheckCooldown(true)

        try {
            const result = await window.pixelz.api.getJobStatus(job.jobId)

            if (result.success && result.data) {
                const data = result.data as {
                    status: { status_code: number; status_name: string }
                    result?: { result_image_url?: string; result_trimap_vector_url?: string }
                }

                // For completed jobs, update with latest status (might be 'deleted' etc.)
                updateJob(job.id, {
                    lastCheckedAt: Date.now(),
                    result: data.result || job.result,
                })
            }
        } catch (error) {
            console.error('Check status failed:', error)
        }

        setTimeout(() => setCheckCooldown(false), 2000)
    }

    if (!job) {
        return (
            <Box p={6} textAlign="center" color="gray.500">
                <Text>Select a job from the list to view details</Text>
            </Box>
        )
    }

    const getStatusColor = (status: Job['status']): string => {
        switch (status) {
            case 'pending': return 'yellow'
            case 'processing': return 'blue'
            case 'completed': return 'green'
            case 'failed': return 'red'
            default: return 'gray'
        }
    }

    const getCountdownSeconds = (): number | null => {
        if (!job.nextCheckAt || job.status !== 'processing') return null
        const remaining = Math.max(0, job.nextCheckAt - Date.now())
        return Math.ceil(remaining / 1000)
    }

    const countdownSeconds = getCountdownSeconds()

    return (
        <Box p={6} h="100%" overflowY="auto">
            <VStack spacing={6} align="stretch">
                {/* Header */}
                <HStack justify="space-between">
                    <VStack align="start" spacing={1}>
                        <HStack>
                            <Heading size="md">{METHOD_NAMES[job.type]}</Heading>
                            <Badge colorScheme={job.isSync ? 'orange' : 'blue'}>
                                {job.isSync ? 'Sync' : 'Async'}
                            </Badge>
                        </HStack>
                        <Text fontSize="sm" color="gray.500">
                            Created: {new Date(job.createdAt).toLocaleString()}
                        </Text>
                    </VStack>

                    <Badge colorScheme={getStatusColor(job.status)} fontSize="md" px={3} py={1}>
                        {job.status === 'processing' && <Spinner size="xs" mr={2} />}
                        {job.status.toUpperCase()}
                    </Badge>
                </HStack>

                {/* Sync Job Waiting State */}
                {job.isSync && job.status === 'processing' && (
                    <Alert status="info" borderRadius="md">
                        <Spinner size="sm" mr={3} />
                        <VStack align="start" spacing={0}>
                            <Text fontWeight="medium">Waiting for response...</Text>
                            <Text fontSize="sm" color="gray.400">
                                Sync job in progress. UI is locked until completion.
                            </Text>
                        </VStack>
                    </Alert>
                )}

                {/* Async Job Status - Processing */}
                {!job.isSync && job.status === 'processing' && (
                    <Box
                        bg={colorMode === 'dark' ? 'gray.700' : 'gray.100'}
                        p={4}
                        borderRadius="md"
                        border="1px solid"
                        borderColor={colorMode === 'dark' ? 'transparent' : 'gray.200'}
                    >
                        <VStack spacing={3} align="stretch">
                            <HStack justify="space-between">
                                <Text fontSize="sm">
                                    Last checked: {job.lastCheckedAt
                                        ? new Date(job.lastCheckedAt).toLocaleTimeString()
                                        : 'Never'}
                                </Text>
                                {countdownSeconds !== null && countdownSeconds > 0 && (
                                    <Badge colorScheme="blue" fontSize="sm">
                                        Next check in: {countdownSeconds}s
                                    </Badge>
                                )}
                                {countdownSeconds === 0 && (
                                    <Badge colorScheme="blue" fontSize="sm">
                                        Checking...
                                    </Badge>
                                )}
                            </HStack>

                            <Button
                                size="sm"
                                leftIcon={<RepeatIcon />}
                                onClick={handleCheckNow}
                                isDisabled={checkCooldown}
                                isLoading={checkCooldown}
                                loadingText="Checking..."
                            >
                                Check Now
                            </Button>

                            {checkCooldown && (
                                <Progress size="xs" isIndeterminate colorScheme="brand" />
                            )}
                        </VStack>
                    </Box>
                )}

                {/* Async Job Status - Completed */}
                {!job.isSync && job.status === 'completed' && (
                    <Box
                        bg={colorMode === 'dark' ? 'gray.700' : 'gray.100'}
                        p={4}
                        borderRadius="md"
                        border="1px solid"
                        borderColor={colorMode === 'dark' ? 'transparent' : 'gray.200'}
                    >
                        <VStack spacing={3} align="stretch">
                            <HStack justify="space-between">
                                <Text fontSize="sm">
                                    Last checked: {job.lastCheckedAt
                                        ? new Date(job.lastCheckedAt).toLocaleTimeString()
                                        : 'Never'}
                                </Text>
                            </HStack>

                            <Button
                                size="sm"
                                leftIcon={<SearchIcon />}
                                onClick={handleCheckStatusWithApi}
                                isDisabled={checkCooldown}
                                isLoading={checkCooldown}
                                loadingText="Checking..."
                                variant="outline"
                            >
                                Check Status with API
                            </Button>
                            <Text fontSize="xs" color="gray.400">
                                Use this to check if the job has been deleted or status changed
                            </Text>
                        </VStack>
                    </Box>
                )}

                {/* Error State */}
                {job.status === 'failed' && job.error && (
                    <Alert status="error" borderRadius="md">
                        <AlertIcon />
                        {job.error}
                    </Alert>
                )}

                <Divider borderColor="gray.600" />

                {/* Input Summary */}
                <Box>
                    <Heading size="sm" mb={3}>Request Inputs</Heading>
                    <Box
                        bg={colorMode === 'dark' ? 'gray.750' : 'gray.50'}
                        p={4}
                        borderRadius="md"
                        fontFamily="mono"
                        fontSize="sm"
                        border="1px solid"
                        borderColor={colorMode === 'dark' ? 'transparent' : 'gray.200'}
                    >
                        <Code
                            display="block"
                            whiteSpace="pre-wrap"
                            bg="transparent"
                            color={colorMode === 'dark' ? 'gray.300' : 'gray.700'}
                        >
                            {JSON.stringify(job.inputs, null, 2)}
                        </Code>
                    </Box>
                </Box>

                {/* Results */}
                {job.status === 'completed' && job.result && (
                    <Box>
                        <Heading size="sm" mb={3}>Results</Heading>
                        <VStack spacing={4} align="stretch">
                            {job.result.result_image_url && (
                                <Box>
                                    <Text fontSize="sm" color="gray.400" mb={2}>Result Image</Text>
                                    <Box
                                        borderRadius="md"
                                        overflow="hidden"
                                        border="1px"
                                        borderColor="gray.600"
                                    >
                                        <Image
                                            src={job.result.result_image_url}
                                            alt="Result"
                                            maxH="400px"
                                            objectFit="contain"
                                            w="100%"
                                            bg={colorMode === 'dark' ? 'blackAlpha.400' : 'gray.100'}
                                        />
                                    </Box>
                                    <Link
                                        href={job.result.result_image_url}
                                        isExternal
                                        fontSize="sm"
                                        color="brand.400"
                                        mt={2}
                                        display="inline-flex"
                                        alignItems="center"
                                    >
                                        Open in browser <ExternalLinkIcon mx="2px" />
                                    </Link>
                                </Box>
                            )}

                            {job.result.result_trimap_vector_url && (
                                <Box>
                                    <Text fontSize="sm" color="gray.400" mb={1}>Trimap Vector URL</Text>
                                    <Link
                                        href={job.result.result_trimap_vector_url}
                                        isExternal
                                        fontSize="sm"
                                        color="brand.400"
                                    >
                                        {job.result.result_trimap_vector_url} <ExternalLinkIcon mx="2px" />
                                    </Link>
                                </Box>
                            )}

                            <Alert status="warning" borderRadius="md" mt={4}>
                                <AlertIcon />
                                <Text fontSize="sm">
                                    Result URLs expire after 7 days. Download your results promptly.
                                </Text>
                            </Alert>
                        </VStack>
                    </Box>
                )}
            </VStack>
        </Box>
    )
}
