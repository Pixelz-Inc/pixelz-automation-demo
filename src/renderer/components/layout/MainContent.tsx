import { useState, useMemo } from 'react'
import {
    Box,
    Flex,
    VStack,
    HStack,
    Heading,
    Button,
    useColorMode,
} from '@chakra-ui/react'
import { AddIcon, ViewIcon } from '@chakra-ui/icons'
import { useJobStore } from '../../store/jobStore'
import MethodSelector from '../methods/MethodSelector'
import JobDetail from '../jobs/JobDetail'
import ColorMatching from '../methods/ColorMatching'
import CreateMask from '../methods/CreateMask'
import CreateTrimap from '../methods/CreateTrimap'
import ModelCrop from '../methods/ModelCrop'
import RemoveBackground from '../methods/RemoveBackground'
import type { JobType } from '../../store/jobStore'

export default function MainContent() {
    const [selectedMethod, setSelectedMethod] = useState<JobType>('removeBackground')
    const { isUiLocked, activeView, setActiveView, selectedJobId } = useJobStore()
    const { colorMode } = useColorMode()

    const MethodComponent = useMemo(() => {
        switch (selectedMethod) {
            case 'colorMatching': return ColorMatching
            case 'createMask': return CreateMask
            case 'createTrimap': return CreateTrimap
            case 'modelCrop': return ModelCrop
            case 'removeBackground': return RemoveBackground
            default: return RemoveBackground
        }
    }, [selectedMethod])

    return (
        <Flex h="100%" overflow="hidden" direction="column">
            {/* View Toggle Buttons */}
            <HStack
                px={4}
                py={2}
                borderBottom="1px"
                borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
                bg={colorMode === 'dark' ? 'gray.800' : 'white'}
                spacing={2}
            >
                <Button
                    leftIcon={<AddIcon />}
                    size="sm"
                    variant={activeView === 'request' ? 'solid' : 'ghost'}
                    colorScheme={activeView === 'request' ? 'brand' : 'gray'}
                    onClick={() => setActiveView('request')}
                >
                    New Request
                </Button>
                <Button
                    leftIcon={<ViewIcon />}
                    size="sm"
                    variant={activeView === 'detail' ? 'solid' : 'ghost'}
                    colorScheme={activeView === 'detail' ? 'brand' : 'gray'}
                    onClick={() => setActiveView('detail')}
                    isDisabled={!selectedJobId}
                >
                    Job Details
                </Button>
            </HStack>

            {/* Main Working Area */}
            <Box
                flex="1"
                h="100%"
                overflow="hidden"
                opacity={isUiLocked ? 0.5 : 1}
                pointerEvents={isUiLocked ? 'none' : 'auto'}
                transition="opacity 0.3s"
            >
                {activeView === 'request' ? (
                    <VStack spacing={0} align="stretch" h="100%">
                        <Box p={4} borderBottom="1px" borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}>
                            <MethodSelector
                                selectedMethod={selectedMethod}
                                onMethodChange={setSelectedMethod}
                            />
                        </Box>

                        <Box flex="1" overflow="auto">
                            <MethodComponent />
                        </Box>
                    </VStack>
                ) : (
                    <JobDetail />
                )}
            </Box>
        </Flex>
    )
}
