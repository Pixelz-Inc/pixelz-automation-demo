import { BrowserWindow } from 'electron'

export interface LogEntry {
    timestamp: string
    level: 'info' | 'warn' | 'error' | 'debug'
    message: string
    data?: unknown
}

class Logger {
    private logs: LogEntry[] = []
    private maxLogs = 1000

    private formatTimestamp(): string {
        const now = new Date()
        return now.toISOString().replace('T', ' ').replace('Z', '')
    }

    private redactSecrets(data: unknown): unknown {
        if (typeof data !== 'object' || data === null) {
            return data
        }

        const redacted = { ...data } as Record<string, unknown>
        const sensitiveKeys = ['client_secret', 'clientSecret', 'authorization', 'Authorization', 'access_token', 'accessToken']

        for (const key of Object.keys(redacted)) {
            if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
                redacted[key] = '***REDACTED***'
            } else if (typeof redacted[key] === 'object') {
                redacted[key] = this.redactSecrets(redacted[key])
            }
        }

        return redacted
    }

    private addLog(level: LogEntry['level'], message: string, data?: unknown): void {
        const entry: LogEntry = {
            timestamp: this.formatTimestamp(),
            level,
            message,
            data: data ? this.redactSecrets(data) : undefined
        }

        this.logs.push(entry)

        // Keep log size manageable
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs)
        }

        // Send to renderer
        this.sendToRenderer(entry)

        // Also log to console in dev
        if (process.env.NODE_ENV === 'development') {
            console.log(`[${entry.timestamp}] [${level.toUpperCase()}] ${message}`, data || '')
        }
    }

    private sendToRenderer(entry: LogEntry): void {
        const windows = BrowserWindow.getAllWindows()
        windows.forEach(win => {
            win.webContents.send('debug-log', entry)
        })
    }

    info(message: string, data?: unknown): void {
        this.addLog('info', message, data)
    }

    warn(message: string, data?: unknown): void {
        this.addLog('warn', message, data)
    }

    error(message: string, data?: unknown): void {
        this.addLog('error', message, data)
    }

    debug(message: string, data?: unknown): void {
        this.addLog('debug', message, data)
    }

    getLogs(): LogEntry[] {
        return [...this.logs]
    }

    clear(): void {
        this.logs = []
    }
}

export const logger = new Logger()
