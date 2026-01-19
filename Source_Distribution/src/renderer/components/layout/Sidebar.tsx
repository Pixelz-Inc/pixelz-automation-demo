import {
    Box,
    VStack,
    Divider,
    useColorMode,
} from '@chakra-ui/react'
import AuthForm from '../auth/AuthForm'
import JobList from '../jobs/JobList'
import { useAuthStore } from '../../store/authStore'

export default function Sidebar() {
    const { isAuthenticated } = useAuthStore()
    const { colorMode } = useColorMode()

    return (
        <Box
            w="320px"
            minW="320px"
            h="100%"
            bg={colorMode === 'dark' ? 'gray.850' : 'gray.50'}
            borderRight="1px"
            borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
            overflowY="auto"
            css={{
                '&::-webkit-scrollbar': {
                    width: '6px',
                },
                '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'var(--chakra-colors-gray-600)',
                    borderRadius: '3px',
                },
            }}
        >
            <VStack spacing={0} align="stretch" h="100%">
                {/* Authentication Section */}
                <AuthForm />

                <Divider borderColor="gray.700" />

                {/* Settings Section - Only show when authenticated */}
                {isAuthenticated && (
                    <>
                        {/* Job List */}
                        <Box flex="1" minH="200px" overflow="hidden">
                            <JobList />
                        </Box>
                    </>
                )}
            </VStack>
        </Box>
    )
}
