import {
    HStack,
    Text,
    Switch,
    Tooltip,
    useColorMode,
} from '@chakra-ui/react'
import { useSettingsStore } from '../../store/settingsStore'

export default function ProcessingMode() {
    const { processingMode, setProcessingMode } = useSettingsStore()
    const { colorMode } = useColorMode()

    const handleToggle = () => {
        setProcessingMode(processingMode === 'async' ? 'sync' : 'async')
    }

    return (
        <HStack spacing={2}>
            <Tooltip
                label={processingMode === 'async'
                    ? 'Asynchronous Mode: Jobs run in background (Default)'
                    : 'Synchronous Mode: Wait for each job (Blocking)'
                }
                placement="bottom"
                closeOnClick={false}
            >
                <Text fontSize="xs" fontWeight="semibold" color={colorMode === 'dark' ? 'gray.300' : 'gray.600'} cursor="help">
                    {processingMode === 'async' ? 'ASYNC' : 'SYNC'}
                </Text>
            </Tooltip>
            <Tooltip
                label={processingMode === 'async' ? 'Switch to Sync mode' : 'Switch to Async mode'}
                closeOnClick={true}
                shouldWrapChildren
            >
                <Switch
                    isChecked={processingMode === 'async'}
                    onChange={handleToggle}
                    colorScheme="brand"
                    size="sm"
                />
            </Tooltip>
        </HStack>
    )
}
