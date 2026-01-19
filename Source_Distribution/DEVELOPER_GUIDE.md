# Pixelz Automation API - Developer Guide

This application is built with Electron, React, and Chakra UI. It demonstrates how to interact with the Pixelz Automation API.

## Core Architecture

- **Main Process**: Handles Electron window management, IPC communication, and sensitive operations.
- **Renderer Process**: The React application UI.
- **IPC Layer**: Bridges the main and renderer processes for secure API calls and system operations.

## Key Services

- `pixelzApi.ts`: Low-level wrapper for Pixelz REST API.
- `auth.ts`: IPC handlers for authentication and token management.
- `storage.ts`: Handles secure storage of API credentials.

## State Management

- **Zustand**: Used for client-side state (Authentication, Jobs, Settings, Images, Debug logs).
- **Auto-Refresh**: Synchronized between main and renderer processes via IPC events.

## UI Components

- `MethodSelector`: Switches between various API methods (Remove Background, Create Mask, etc).
- `JobDetail`: Displays real-time JSON requests/responses for transparency.
- `TokenStatus`: Real-time countdown and auto-refresh controls.

## Building and Packaging

- `npm run dev`: Start development server.
- `npm run build:win`: Create a Windows installer (nsis).
- Source distribution is maintained in the `Source_Distribution` folder.
