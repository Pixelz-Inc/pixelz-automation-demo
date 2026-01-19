import {
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverHeader,
    PopoverBody,
    PopoverArrow,
    PopoverCloseButton,
    IconButton,
    FormControl,
    FormLabel,
    Input,
    Button,
    VStack,
    Tooltip,
    useDisclosure,
} from '@chakra-ui/react'
import { LinkIcon } from '@chakra-ui/icons'
import { useSettingsStore } from '../../store/settingsStore'
import WebhookVerifyModal from './WebhookVerifyModal'

export default function WebhookSettings() {
    const { webhookUrl, setWebhookUrl } = useSettingsStore()
    const { isOpen, onOpen, onClose } = useDisclosure()

    return (
        <>
            <Popover placement="bottom-start">
                <PopoverTrigger>
                    <Box>
                        <Tooltip label="Webhook Settings">
                            <IconButton
                                aria-label="Webhook settings"
                                icon={<LinkIcon />}
                                size="sm"
                                variant="ghost"
                                colorScheme={webhookUrl ? 'brand' : 'gray'}
                            />
                        </Tooltip>
                    </Box>
                </PopoverTrigger>
                <PopoverContent width="300px">
                    <PopoverArrow />
                    <PopoverCloseButton />
                    <PopoverHeader fontWeight="bold">Webhook Configuration</PopoverHeader>
                    <PopoverBody>
                        <VStack spacing={4} align="stretch">
                            <FormControl>
                                <FormLabel fontSize="xs">Webhook URL (Optional)</FormLabel>
                                <Input
                                    value={webhookUrl}
                                    onChange={(e) => setWebhookUrl(e.target.value)}
                                    placeholder="https://your-webhook.com/..."
                                    size="sm"
                                    type="url"
                                />
                            </FormControl>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={onOpen}
                                width="full"
                            >
                                Verify Signature
                            </Button>
                        </VStack>
                    </PopoverBody>
                </PopoverContent>
            </Popover>

            <WebhookVerifyModal isOpen={isOpen} onClose={onClose} />
        </>
    )
}

import { Box } from '@chakra-ui/react'
