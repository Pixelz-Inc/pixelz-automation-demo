import { extendTheme, type ThemeConfig } from '@chakra-ui/react'

const config: ThemeConfig = {
    initialColorMode: 'dark',
    useSystemColorMode: false,
}

const theme = extendTheme({
    config,
    colors: {
        brand: {
            50: '#e3f2fd',
            100: '#bbdefb',
            200: '#90caf9',
            300: '#64b5f6',
            400: '#42a5f5',
            500: '#2196f3',
            600: '#1e88e5',
            700: '#1976d2',
            800: '#1565c0',
            900: '#0d47a1',
        },
        accent: {
            50: '#fff3e0',
            100: '#ffe0b2',
            200: '#ffcc80',
            300: '#ffb74d',
            400: '#ffa726',
            500: '#ff9800',
            600: '#fb8c00',
            700: '#f57c00',
            800: '#ef6c00',
            900: '#e65100',
        }
    },
    fonts: {
        heading: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        mono: '"JetBrains Mono", "Fira Code", monospace',
    },
    styles: {
        global: (props: any) => ({
            body: {
                bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
                color: props.colorMode === 'dark' ? 'gray.100' : 'gray.800',
                overflow: 'hidden',
            },
            '*::-webkit-scrollbar': {
                width: '8px',
                height: '8px',
            },
            '*::-webkit-scrollbar-track': {
                bg: props.colorMode === 'dark' ? 'gray.800' : 'gray.200',
            },
            '*::-webkit-scrollbar-thumb': {
                bg: props.colorMode === 'dark' ? 'gray.600' : 'gray.400',
                borderRadius: '4px',
            },
            '*::-webkit-scrollbar-thumb:hover': {
                bg: props.colorMode === 'dark' ? 'gray.500' : 'gray.300',
            },
        }),
    },
    components: {
        Button: {
            defaultProps: {
                colorScheme: 'brand',
            },
            variants: {
                solid: {
                    _hover: {
                        transform: 'translateY(-1px)',
                        boxShadow: 'lg',
                    },
                    transition: 'all 0.2s',
                },
            },
        },
        Card: {
            baseStyle: (props: any) => ({
                container: {
                    bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
                    borderRadius: 'lg',
                    boxShadow: 'lg',
                    border: props.colorMode === 'dark' ? 'none' : '1px solid',
                    borderColor: 'gray.200',
                },
            }),
        },
        Divider: {
            baseStyle: (props: any) => ({
                borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
            }),
        },
        Badge: {
            baseStyle: {
                borderRadius: 'full',
                px: 2,
            },
        },
        Progress: {
            baseStyle: (props: any) => ({
                filledTrack: {
                    bg: props.colorMode === 'dark' ? 'brand.500' : 'brand.400',
                },
                track: {
                    bg: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
                },
            }),
        },
        Input: {
            defaultProps: {
                focusBorderColor: 'brand.500',
            },
        },
        Select: {
            defaultProps: {
                focusBorderColor: 'brand.500',
            },
        },
        Slider: {
            defaultProps: {
                colorScheme: 'brand',
            },
        },
        Switch: {
            defaultProps: {
                colorScheme: 'brand',
            },
        },
        Tabs: {
            defaultProps: {
                colorScheme: 'brand',
            },
        },
        Modal: {
            baseStyle: (props: any) => ({
                dialog: {
                    bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
                },
            }),
        },
        Drawer: {
            baseStyle: (props: any) => ({
                dialog: {
                    bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
                },
            }),
        },
    },
})

export default theme
