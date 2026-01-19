import { useState, useEffect } from 'react'
import {
    Box,
    VStack,
    HStack,
    Heading,
    Text,
    Badge,
    Spinner,
    IconButton,
    Tooltip,
    useColorMode,
} from '@chakra-ui/react'
import { DeleteIcon } from '@chakra-ui/icons'
import { useJobStore, Job, METHOD_NAMES } from '../../store/jobStore'

export default function JobList() {
    const { jobs, selectedJobId, selectJob, removeJob } = useJobStore()
    const [, forceUpdate] = useState(0)
    const { colorMode } = useColorMode()

    // Force update every second to refresh countdown timers
    useEffect(() => {
        const interval = setInterval(() => forceUpdate(n => n + 1), 1000)
        return () => clearInterval(interval)
    }, [])

    const getStatusColor = (status: Job['status']): string => {
        switch (status) {
            case 'pending': return 'yellow'
            case 'processing': return 'blue'
            case 'completed': return 'green'
            case 'failed': return 'red'
            default: return 'gray'
        }
    }

    const formatTime = (timestamp: number): string => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        })
    }

    const getCountdownText = (job: Job): string | null => {
        if (job.status !== 'processing' || !job.nextCheckAt) return null
        const remaining = Math.max(0, job.nextCheckAt - Date.now())
        if (remaining <= 0) return 'Checking...'
        return `Next: ${Math.ceil(remaining / 1000)}s`
    }

    if (jobs.length === 0) {
        return (
            <Box p={4}>
                <VStack spacing={2} color="gray.500">
                    <Text fontSize="sm">No jobs yet</Text>
                    <Text fontSize="xs">Select a method and send a request</Text>
                </VStack>
            </Box>
        )
    }

    return (
        <Box h="100%" overflow="hidden" display="flex" flexDirection="column">
            <HStack
                justify="space-between"
                p={3}
                borderBottom="1px"
                borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
            >
                <Heading size="xs" color={colorMode === 'dark' ? 'gray.400' : 'gray.500'}>
                    Jobs ({jobs.length})
                </Heading>
            </HStack>

            <Box flex="1" overflowY="auto" p={2}>
                <VStack spacing={2} align="stretch">
                    {jobs.map((job) => {
                        const countdown = getCountdownText(job)
                        return (
                            <Box
                                key={job.id}
                                p={3}
                                bg={selectedJobId === job.id
                                    ? (colorMode === 'dark' ? 'gray.700' : 'brand.50')
                                    : (colorMode === 'dark' ? 'gray.750' : 'white')}
                                borderRadius="md"
                                cursor="pointer"
                                onClick={() => selectJob(job.id)}
                                border="1px"
                                borderColor={selectedJobId === job.id ? 'brand.500' : (colorMode === 'dark' ? 'transparent' : 'gray.200')}
                                transition="all 0.2s"
                                _hover={{
                                    bg: selectedJobId === job.id
                                        ? (colorMode === 'dark' ? 'gray.700' : 'brand.100')
                                        : (colorMode === 'dark' ? 'gray.700' : 'gray.50')
                                }}
                            >
                                <HStack justify="space-between" mb={1}>
                                    <HStack spacing={2}>
                                        <Text fontSize="sm" fontWeight="medium">
                                            {METHOD_NAMES[job.type]}
                                        </Text>
                                        <Badge size="sm" colorScheme={job.isSync ? 'orange' : 'blue'}>
                                            {job.isSync ? 'Sync' : 'Async'}
                                        </Badge>
                                    </HStack>

                                    <HStack spacing={1}>
                                        {job.status === 'processing' && (
                                            <Spinner size="xs" color="blue.400" />
                                        )}
                                        <Badge colorScheme={getStatusColor(job.status)} fontSize="xs">
                                            {job.status}
                                        </Badge>
                                        <Tooltip
                                            label="Remove job"
                                            closeOnClick={true}
                                            shouldWrapChildren
                                        >
                                            <IconButton
                                                aria-label="Remove job"
                                                icon={<DeleteIcon />}
                                                size="xs"
                                                variant="ghost"
                                                colorScheme="red"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    removeJob(job.id)
                                                }}
                                            />
                                        </Tooltip>
                                    </HStack>
                                </HStack>

                                <HStack justify="space-between">
                                    <Text fontSize="xs" color="gray.500">
                                        {formatTime(job.createdAt)}
                                    </Text>
                                    {countdown && (
                                        <Text fontSize="xs" color={colorMode === 'dark' ? 'blue.300' : 'blue.600'}>
                                            {countdown}
                                        </Text>
                                    )}
                                </HStack>
                            </Box>
                        )
                    })}
                </VStack>
            </Box>
        </Box>
    )
}
