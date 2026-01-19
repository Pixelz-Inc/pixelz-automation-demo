import { useState } from 'react'
import {
    Box,
    VStack,
    HStack,
    FormControl,
    FormLabel,
    Input,
    Button,
    useDisclosure,
} from '@chakra-ui/react'
import { ExternalLinkIcon } from '@chakra-ui/icons'
import { useSettingsStore } from '../../store/settingsStore'
import WebhookVerifyModal from './WebhookVerifyModal'

export default function WebhookInput() {
    const { webhookUrl, setWebhookUrl } = useSettingsStore()
    const { isOpen, onOpen, onClose } = useDisclosure()

    return (
        <>
            <FormControl>
                <FormLabel fontSize="sm" mb={2}>
                    Webhook URL (Optional)
                </FormLabel>
                <VStack spacing={2} align="stretch">
                    <Input
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://your-webhook-tester.com/..."
                        size="sm"
                        type="url"
                    />
                    <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<ExternalLinkIcon />}
                        onClick={onOpen}
                    >
                        Webhook Verification
                    </Button>
                </VStack>
            </FormControl>

            <WebhookVerifyModal isOpen={isOpen} onClose={onClose} />
        </>
    )
}
