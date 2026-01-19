import { useEffect } from 'react'
import {
    Box,
    Flex,
    useToast,
} from '@chakra-ui/react'
import { useAuthStore } from './store/authStore'
import { useDebugStore } from './store/debugStore'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import MainContent from './components/layout/MainContent'
import DebugPanel from './components/layout/DebugPanel'
import { useJobPolling } from './hooks/useJobPolling'

function App() {
    const { isAuthenticated } = useAuthStore()
    const { addLog } = useDebugStore()
    const toast = useToast()

    // Initialize job polling
    useJobPolling()

    // Set up debug log listener from main process
    useEffect(() => {
        // Only set up listener if running in Electron (pixelz is available)
        if (typeof window.pixelz === 'undefined') {
            console.warn('Running outside Electron - pixelz API not available')
            return
        }

        const unsubscribe = window.pixelz.debug.onLog((entry) => {
            addLog(entry)

            // Show toast for errors
            if (entry.level === 'error') {
                toast({
                    title: 'Error',
                    description: entry.message,
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                    position: 'bottom-right',
                })
            }
        })

        return () => unsubscribe()
    }, [addLog, toast])

    // Set up auth status listener from main process
    useEffect(() => {
        if (typeof window.pixelz === 'undefined') return

        const unsubscribe = window.pixelz.auth.onStatusChanged((status) => {
            useAuthStore.getState().setAuthenticated(status.isAuthenticated, status.expiresAt)

            if (!status.isAuthenticated) {
                toast({
                    title: 'Session Expired',
                    description: 'Your session has ended. Please log in again.',
                    status: 'warning',
                    duration: 5000,
                    isClosable: true,
                })
            }
        })

        return () => unsubscribe()
    }, [toast])

    // Check initial auth status
    useEffect(() => {
        if (typeof window.pixelz === 'undefined') return

        const checkAuth = async () => {
            const status = await window.pixelz.auth.getStatus()
            if (status.isAuthenticated && status.expiresAt) {
                useAuthStore.getState().setAuthenticated(true, status.expiresAt)
            }
        }
        checkAuth()
    }, [])

    return (
        <Flex direction="column" h="100vh" overflow="hidden">
            <Header />

            <Flex flex="1" overflow="hidden">
                <Sidebar />

                <Box
                    flex="1"
                    overflow="hidden"
                    opacity={isAuthenticated ? 1 : 0.5}
                    pointerEvents={isAuthenticated ? 'auto' : 'none'}
                    transition="opacity 0.3s"
                >
                    <MainContent />
                </Box>
            </Flex>

            <DebugPanel />
        </Flex>
    )
}

export default App
