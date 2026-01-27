import { create } from 'zustand'

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type JobType = 'colorMatching' | 'createMask' | 'createTrimap' | 'modelCrop' | 'removeBackground'

export interface Job {
    id: string
    jobId?: string // API job_id for async jobs
    type: JobType
    status: JobStatus
    isSync: boolean
    createdAt: number
    lastCheckedAt?: number
    nextCheckAt?: number
    pollInterval?: number // Current poll interval in ms (for exponential backoff)
    retryAfter?: number // Initial delay in seconds from API
    inputs: Record<string, unknown>
    result?: {
        result_image_url?: string
        result_trimap_vector_url?: string
    }
    error?: string
}

interface JobState {
    jobs: Job[]
    selectedJobId: string | null
    isUiLocked: boolean // For sync job processing
    activeView: 'request' | 'detail' // Track which view is active

    // Actions
    addJob: (job: Job) => void
    updateJob: (id: string, updates: Partial<Job>) => void
    removeJob: (id: string) => void
    selectJob: (id: string | null) => void
    setUiLocked: (locked: boolean) => void
    setActiveView: (view: 'request' | 'detail') => void
    getJob: (id: string) => Job | undefined
    getRemainingLimit: (type: JobType) => number
    clearJobs: () => void
}

export const useJobStore = create<JobState>((set, get) => ({
    jobs: [],
    selectedJobId: null,
    isUiLocked: false,
    activeView: 'request',

    addJob: (job) => set((state) => ({
        jobs: [job, ...state.jobs],
        selectedJobId: job.id,
        activeView: 'detail' // Switch to detail view when new job is added
    })),

    updateJob: (id, updates) => set((state) => ({
        jobs: state.jobs.map(job =>
            job.id === id ? { ...job, ...updates } : job
        )
    })),

    removeJob: (id) => set((state) => ({
        jobs: state.jobs.filter(job => job.id !== id),
        selectedJobId: state.selectedJobId === id ? null : state.selectedJobId
    })),

    selectJob: (id) => set({
        selectedJobId: id,
        activeView: 'detail' // Switch to detail view when job is selected
    }),

    setUiLocked: (locked) => set({ isUiLocked: locked }),

    setActiveView: (view) => set({ activeView: view }),

    getJob: (id) => get().jobs.find(job => job.id === id),

    getRemainingLimit: (type) => {
        const now = Date.now()
        const oneMinuteAgo = now - 60000
        const recentJobs = get().jobs.filter(j => j.type === type && j.createdAt > oneMinuteAgo)
        const limit = RATE_LIMITS[type]
        return Math.max(0, limit - recentJobs.length)
    },

    clearJobs: () => set({ jobs: [], selectedJobId: null })
}))

// Helper to generate unique job IDs
export function generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Initial poll interval and max for exponential backoff
export const INITIAL_POLL_INTERVAL = 15000 // 15 seconds
export const MAX_POLL_INTERVAL = 60000 // 60 seconds

// Token costs per method
export const TOKEN_COSTS: Record<JobType, number> = {
    colorMatching: 100,
    createMask: 100,
    createTrimap: 50,
    modelCrop: 10,
    removeBackground: 100
}

// Rate limits per method (per minute)
export const RATE_LIMITS: Record<JobType, number> = {
    colorMatching: 30,
    createMask: 60,
    createTrimap: 60,
    modelCrop: 60,
    removeBackground: 30
}

// Display names for methods
export const METHOD_NAMES: Record<JobType, string> = {
    colorMatching: 'Color Matching',
    createMask: 'Create Mask',
    createTrimap: 'Create Trimap',
    modelCrop: 'Model Crop',
    removeBackground: 'Remove Background'
}
