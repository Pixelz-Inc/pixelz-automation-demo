import { create } from 'zustand'

interface ImageState {
    imageUrl: string
    displayUrl: string // Can be a local blob URL or a real URL
    imageDimensions: { width: number; height: number } | null

    // Actions
    setImageUrl: (url: string) => void
    setDisplayUrl: (url: string) => void
    setImageDimensions: (dimensions: { width: number; height: number } | null) => void
    clear: () => void
}

export const useImageStore = create<ImageState>((set) => ({
    imageUrl: '',
    displayUrl: '',
    imageDimensions: null,

    setImageUrl: (url) => set({ imageUrl: url }),
    setDisplayUrl: (url) => set({ displayUrl: url }),
    setImageDimensions: (dimensions) => set({ imageDimensions: dimensions }),
    clear: () => set({ imageUrl: '', displayUrl: '', imageDimensions: null })
}))
