import {
    Box,
    HStack,
    FormControl,
    FormLabel,
    Select,
    Badge,
    Text,
} from '@chakra-ui/react'
import { JobType, TOKEN_COSTS, RATE_LIMITS, METHOD_NAMES } from '../../store/jobStore'

interface MethodSelectorProps {
    selectedMethod: JobType
    onMethodChange: (method: JobType) => void
}

const methods: JobType[] = [
    'removeBackground',
    'createMask',
    'createTrimap',
    'modelCrop',
    'colorMatching',
]

export default function MethodSelector({ selectedMethod, onMethodChange }: MethodSelectorProps) {
    return (
        <FormControl>
            <FormLabel fontSize="sm" mb={2}>API Method</FormLabel>
            <HStack spacing={4}>
                <Select
                    value={selectedMethod}
                    onChange={(e) => onMethodChange(e.target.value as JobType)}
                    maxW="300px"
                >
                    {methods.map((method) => (
                        <option key={method} value={method}>
                            {METHOD_NAMES[method]}
                        </option>
                    ))}
                </Select>

                <HStack spacing={2}>
                    <Badge colorScheme="green" px={2} py={1}>
                        {TOKEN_COSTS[selectedMethod]} tokens
                    </Badge>
                    <Text fontSize="xs" color="gray.500">
                        Rate: {RATE_LIMITS[selectedMethod]} req/min
                    </Text>
                </HStack>
            </HStack>
        </FormControl>
    )
}
