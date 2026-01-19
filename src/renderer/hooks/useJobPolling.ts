import { useEffect, useRef, useCallback } from 'react'
import { useJobStore } from '../store/jobStore'

// Poll intervals: start at 15s, max 60s
const INITIAL_POLL_INTERVAL = 15000  // 15 seconds
const MAX_POLL_INTERVAL = 60000      // 60 seconds

export function useJobPolling() {
    const { jobs, updateJob } = useJobStore()
    const pollTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

    const checkJobStatus = useCallback(async (jobId: string, apiJobId: string, currentInterval: number) => {
        if (typeof window.pixelz === 'undefined') return

        try {
            const result = await window.pixelz.api.getJobStatus(apiJobId)

            if (result.success && result.data) {
                const data = result.data as {
                    status: { status_code: number; status_name: string }
                    result?: { result_image_url?: string; result_trimap_vector_url?: string }
                }

                // Use status_name for reliable detection since status_codes may vary
                // Known values: "Pending", "Processing", "Completed", "Failed"
                let newStatus: 'pending' | 'processing' | 'completed' | 'failed'
                let shouldContinuePolling = false

                const statusName = data.status.status_name.toLowerCase()

                if (statusName === 'completed') {
                    newStatus = 'completed'
                } else if (statusName === 'failed') {
                    newStatus = 'failed'
                } else if (statusName === 'pending') {
                    newStatus = 'pending'
                    shouldContinuePolling = true
                } else {
                    // "Processing" or any other status
                    newStatus = 'processing'
                    shouldContinuePolling = true
                }

                // Calculate next poll interval with exponential backoff
                const nextInterval = Math.min(currentInterval * 1.5, MAX_POLL_INTERVAL)

                updateJob(jobId, {
                    status: newStatus,
                    lastCheckedAt: Date.now(),
                    nextCheckAt: shouldContinuePolling ? Date.now() + nextInterval : undefined,
                    pollInterval: shouldContinuePolling ? nextInterval : undefined,
                    result: data.result || undefined,
                })

                // Schedule next poll if still processing
                if (shouldContinuePolling) {
                    const timeout = setTimeout(() => {
                        checkJobStatus(jobId, apiJobId, nextInterval)
                    }, nextInterval)
                    pollTimeoutsRef.current.set(jobId, timeout)
                } else {
                    // Clear the timeout reference
                    pollTimeoutsRef.current.delete(jobId)
                }
            }
        } catch (error) {
            console.error('Job status check failed:', error)
            // On error, try again with increased interval
            const nextInterval = Math.min(currentInterval * 2, MAX_POLL_INTERVAL)
            updateJob(jobId, {
                lastCheckedAt: Date.now(),
                nextCheckAt: Date.now() + nextInterval,
                pollInterval: nextInterval,
            })
            const timeout = setTimeout(() => {
                checkJobStatus(jobId, apiJobId, nextInterval)
            }, nextInterval)
            pollTimeoutsRef.current.set(jobId, timeout)
        }
    }, [updateJob])

    // Start polling for processing jobs
    useEffect(() => {
        jobs.forEach(job => {
            if (
                !job.isSync &&
                job.jobId &&
                job.status === 'processing' &&
                !pollTimeoutsRef.current.has(job.id)
            ) {
                // Start polling for this job
                const interval = job.pollInterval || INITIAL_POLL_INTERVAL
                const delay = job.nextCheckAt ? Math.max(0, job.nextCheckAt - Date.now()) : 0

                const timeout = setTimeout(() => {
                    checkJobStatus(job.id, job.jobId!, interval)
                }, delay)
                pollTimeoutsRef.current.set(job.id, timeout)
            }
        })

        // Clean up timeouts for jobs that are no longer processing
        pollTimeoutsRef.current.forEach((timeout, jobId) => {
            const job = jobs.find(j => j.id === jobId)
            if (!job || job.status === 'completed' || job.status === 'failed') {
                clearTimeout(timeout)
                pollTimeoutsRef.current.delete(jobId)
            }
        })
    }, [jobs, checkJobStatus])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            pollTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
            pollTimeoutsRef.current.clear()
        }
    }, [])

    // Function to manually trigger a status check
    const checkNow = useCallback(async (jobId: string) => {
        const job = jobs.find(j => j.id === jobId)
        if (!job?.jobId) return

        // Clear existing timeout
        const existingTimeout = pollTimeoutsRef.current.get(jobId)
        if (existingTimeout) {
            clearTimeout(existingTimeout)
            pollTimeoutsRef.current.delete(jobId)
        }

        await checkJobStatus(jobId, job.jobId, job.pollInterval || INITIAL_POLL_INTERVAL)
    }, [jobs, checkJobStatus])

    return { checkNow }
}
