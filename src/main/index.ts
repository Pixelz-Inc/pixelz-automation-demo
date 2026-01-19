import { app, BrowserWindow, ipcMain, safeStorage } from 'electron'
import { join } from 'path'
import { registerAuthHandlers } from './ipc/auth'
import { registerApiHandlers } from './ipc/api'
import { registerFileHandlers } from './ipc/files'
import { registerStorageHandlers } from './ipc/storage'
import { registerWebhookHandlers } from './ipc/webhook'
import { logger } from './services/logger'

let mainWindow: BrowserWindow | null = null

const iconPath = join(__dirname, '../../icon.png')
console.log('Icon path resolved to:', iconPath)

function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        backgroundColor: '#1a1a2e',
        icon: iconPath,
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        },
        titleBarStyle: 'default',
        show: false
    })

    // Show window when ready to prevent visual flash
    mainWindow.on('ready-to-show', () => {
        mainWindow?.show()
    })

    mainWindow.on('closed', () => {
        mainWindow = null
    })

    // Load the app
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173')
        mainWindow.webContents.openDevTools()
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    logger.info('Application started')
}

// Register all IPC handlers
function registerIpcHandlers(): void {
    registerAuthHandlers(ipcMain)
    registerApiHandlers(ipcMain)
    registerFileHandlers(ipcMain)
    registerStorageHandlers(ipcMain, safeStorage)
    registerWebhookHandlers(ipcMain)
}

app.whenReady().then(() => {
    // Set App User Model ID for Windows Taskbar Icon
    if (process.platform === 'win32') {
        app.setAppUserModelId('com.pixelz.automation-demo')
    }

    registerIpcHandlers()
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// Security: Open external links in default browser
app.on('web-contents-created', (_, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:') || url.startsWith('https:')) {
            require('electron').shell.openExternal(url)
        }
        return { action: 'deny' }
    })
})
