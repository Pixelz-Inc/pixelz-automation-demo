import {
    Box,
    VStack,
    Text,
    Progress,
    HStack,
    Tooltip,
    useColorMode,
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverHeader,
    PopoverBody,
    PopoverArrow,
    PopoverCloseButton,
    IconButton,
} from '@chakra-ui/react'
import { InfoOutlineIcon } from '@chakra-ui/icons'
import { useJobStore, METHOD_NAMES, RATE_LIMITS } from '../../store/jobStore'

export default function RateLimitDisplay() {
    const { getRemainingLimit } = useJobStore()
    const { colorMode } = useColorMode()

    const methods = Object.keys(RATE_LIMITS) as (keyof typeof RATE_LIMITS)[]

    return (
        <Popover placement="bottom-end">
            <PopoverTrigger>
                <Box>
                    <Tooltip label="API Rate Limits">
                        <IconButton
                            aria-label="API Rate Limits"
                            icon={<InfoOutlineIcon />}
                            size="sm"
                            variant="ghost"
                        />
                    </Tooltip>
                </Box>
            </PopoverTrigger>
            <PopoverContent bg={colorMode === 'dark' ? 'gray.800' : 'white'} borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'} width="240px">
                <PopoverArrow />
                <PopoverCloseButton />
                <PopoverHeader fontWeight="bold" fontSize="xs" borderBottomWidth="1px" borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'} py={2} px={3}>
                    API RATE LIMITS
                </PopoverHeader>
                <PopoverBody p={3}>
                    <VStack align="stretch" spacing={3}>
                        {methods.map((method) => {
                            const remaining = getRemainingLimit(method)
                            const limit = RATE_LIMITS[method]
                            const used = limit - remaining
                            const percentage = (used / limit) * 100
                            const isHigh = percentage > 80

                            return (
                                <Box key={method}>
                                    <HStack justify="space-between" mb={1}>
                                        <Text fontSize="2xs" color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}>
                                            {METHOD_NAMES[method]}
                                        </Text>
                                        <Text fontSize="2xs" color={isHigh ? 'orange.300' : 'gray.500'}>
                                            {remaining}/{limit} left
                                        </Text>
                                    </HStack>
                                    <Progress
                                        value={percentage}
                                        size="xs"
                                        colorScheme={percentage > 95 ? 'red' : percentage > 80 ? 'orange' : 'brand'}
                                        borderRadius="full"
                                        bg={colorMode === 'dark' ? 'gray.900' : 'gray.200'}
                                    />
                                </Box>
                            )
                        })}
                    </VStack>
                </PopoverBody>
            </PopoverContent>
        </Popover>
    )
}
