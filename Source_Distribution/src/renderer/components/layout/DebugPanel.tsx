import { useState } from 'react'
import {
    Box,
    Collapse,
    HStack,
    VStack,
    Text,
    IconButton,
    Badge,
    Code,
    Tooltip,
    useToast,
    useColorMode,
} from '@chakra-ui/react'
import { ChevronUpIcon, ChevronDownIcon, CopyIcon, DeleteIcon } from '@chakra-ui/icons'
import { useDebugStore, LogEntry } from '../../store/debugStore'

export default function DebugPanel() {
    const { logs, isExpanded, toggleExpanded, clearLogs } = useDebugStore()
    const toast = useToast()
    const { colorMode } = useColorMode()

    const getLevelColor = (level: LogEntry['level']): string => {
        switch (level) {
            case 'info': return 'blue'
            case 'warn': return 'yellow'
            case 'error': return 'red'
            case 'debug': return 'gray'
            default: return 'gray'
        }
    }

    const handleCopyAll = () => {
        const logText = logs
            .map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}${log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''}`)
            .join('\n\n')
        navigator.clipboard.writeText(logText)
        toast({ title: 'All logs copied', status: 'success', duration: 1500 })
    }

    const handleCopySingle = (log: LogEntry) => {
        const logText = `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}${log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''}`
        navigator.clipboard.writeText(logText)
        toast({ title: 'Log entry copied', status: 'success', duration: 1500 })
    }

    return (
        <Box borderTop="1px" borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}>
            {/* Toggle Bar */}
            <HStack
                justify="space-between"
                px={4}
                py={2}
                bg={colorMode === 'dark' ? 'gray.800' : 'white'}
                cursor="pointer"
                onClick={toggleExpanded}
                _hover={{ bg: colorMode === 'dark' ? 'gray.750' : 'gray.50' }}
            >
                <HStack spacing={3}>
                    <Text fontSize="sm" fontWeight="medium" color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}>
                        Debug Log
                    </Text>
                    <Badge colorScheme="gray" fontSize="xs">
                        {logs.length} entries
                    </Badge>
                </HStack>

                <HStack spacing={2}>
                    {isExpanded && (
                        <>
                            <Tooltip
                                label="Copy all logs"
                                closeOnClick={true}
                                shouldWrapChildren
                            >
                                <IconButton
                                    aria-label="Copy all logs"
                                    icon={<CopyIcon />}
                                    size="xs"
                                    variant="ghost"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleCopyAll()
                                    }}
                                />
                            </Tooltip>
                            <Tooltip
                                label="Clear logs"
                                closeOnClick={true}
                                shouldWrapChildren
                            >
                                <IconButton
                                    aria-label="Clear logs"
                                    icon={<DeleteIcon />}
                                    size="xs"
                                    variant="ghost"
                                    colorScheme="red"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        clearLogs()
                                    }}
                                />
                            </Tooltip>
                        </>
                    )}
                    <IconButton
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        icon={isExpanded ? <ChevronDownIcon /> : <ChevronUpIcon />}
                        size="xs"
                        variant="ghost"
                    />
                </HStack>
            </HStack>

            {/* Log Content */}
            <Collapse in={isExpanded}>
                <Box
                    h="250px"
                    overflowY="auto"
                    bg={colorMode === 'dark' ? 'gray.900' : 'gray.50'}
                    fontFamily="mono"
                    fontSize="xs"
                    p={2}
                >
                    {logs.length === 0 ? (
                        <Text color="gray.500" p={2}>No logs yet</Text>
                    ) : (
                        <VStack spacing={1} align="stretch">
                            {logs.map((log, index) => (
                                <Box
                                    key={index}
                                    p={2}
                                    bg={colorMode === 'dark' ? 'gray.850' : 'white'}
                                    borderRadius="sm"
                                    borderLeft="3px"
                                    borderLeftColor={`${getLevelColor(log.level)}.500`}
                                    borderBottom="1px"
                                    borderBottomColor={colorMode === 'dark' ? 'transparent' : 'gray.100'}
                                    position="relative"
                                    _hover={{
                                        '& .copy-btn': { opacity: 1 }
                                    }}
                                >
                                    <HStack spacing={2} mb={1} justify="space-between">
                                        <HStack spacing={2}>
                                            <Text color={colorMode === 'dark' ? 'gray.500' : 'gray.400'}>{log.timestamp}</Text>
                                            <Badge colorScheme={getLevelColor(log.level)} fontSize="2xs">
                                                {log.level.toUpperCase()}
                                            </Badge>
                                            <Text color={colorMode === 'dark' ? 'gray.300' : 'gray.700'}>{log.message}</Text>
                                        </HStack>
                                        <IconButton
                                            className="copy-btn"
                                            aria-label="Copy entry"
                                            icon={<CopyIcon />}
                                            size="xs"
                                            variant="ghost"
                                            opacity={0}
                                            transition="opacity 0.2s"
                                            onClick={() => handleCopySingle(log)}
                                        />
                                    </HStack>
                                    {!!log.data && (
                                        <Code
                                            display="block"
                                            whiteSpace="pre-wrap"
                                            bg="transparent"
                                            color={colorMode === 'dark' ? 'gray.400' : 'gray.600'}
                                            fontSize="2xs"
                                        >
                                            {JSON.stringify(log.data, null, 2)}
                                        </Code>
                                    )}
                                </Box>
                            ))}
                        </VStack>
                    )}
                </Box>
            </Collapse>
        </Box>
    )
}
