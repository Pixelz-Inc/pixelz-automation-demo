import {
    Box,
    Flex,
    Heading,
    HStack,
    IconButton,
    Image,
    useColorMode,
    Tooltip,
} from '@chakra-ui/react'
import { MoonIcon, SunIcon } from '@chakra-ui/icons'
import TokenStatus from '../auth/TokenStatus'
import ProcessingMode from '../settings/ProcessingMode'
import WebhookSettings from '../settings/WebhookSettings'
import RateLimitDisplay from '../settings/RateLimitDisplay'
import iconImage from '../../assets/icon.png'
import { useAuthStore } from '../../store/authStore'

export default function Header() {
    const { colorMode, toggleColorMode } = useColorMode()
    const { isAuthenticated } = useAuthStore()

    return (
        <Box
            as="header"
            bg={colorMode === 'dark' ? 'gray.800' : 'white'}
            borderBottom="1px"
            borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
            px={4}
            py={2}
        >
            <Flex justify="space-between" align="center">
                <HStack spacing={6}>
                    <HStack spacing={3}>
                        <Image
                            src={iconImage}
                            alt="Pixelz Logo"
                            w={8}
                            h={8}
                            borderRadius="md"
                        />
                        <Heading size="md" fontWeight="semibold">
                            Pixelz Automation
                        </Heading>
                    </HStack>

                    {isAuthenticated && (
                        <HStack spacing={4} borderLeft="1px" borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'} pl={6}>
                            <ProcessingMode />
                            <Box h="20px" w="1px" bg={colorMode === 'dark' ? 'gray.700' : 'gray.200'} />
                            <HStack spacing={2}>
                                <WebhookSettings />
                                <RateLimitDisplay />
                            </HStack>
                        </HStack>
                    )}
                </HStack>

                <HStack spacing={4}>
                    <TokenStatus />

                    <Tooltip
                        label={colorMode === 'dark' ? 'Light mode' : 'Dark mode'}
                        closeOnClick={true}
                        shouldWrapChildren
                        placement="left-start"
                    >
                        <IconButton
                            aria-label="Toggle color mode"
                            icon={colorMode === 'dark' ? <SunIcon /> : <MoonIcon />}
                            onClick={toggleColorMode}
                            variant="ghost"
                            size="sm"
                        />
                    </Tooltip>
                </HStack>
            </Flex>
        </Box>
    )
}
