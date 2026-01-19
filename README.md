# Pixelz Automation API Demo Application

This application is a cross-platform (Windows & macOS) desktop tool designed to demonstrate the capabilities of the [Pixelz Automation API](https://docs.pixelz.com/automationapi/index.html). It serves as "Living Documentation," allowing developers to experiment with image processing methods, view real-time API communication, and understand common integration patterns.

![Pixelz Automation Demo App](icon.png)

## 🚀 Key Features

-   **Interactive API Exploration**: Test methods like Remove Background, Color Matching, Model Crop, and more.
-   **Real-time Debug Panel**: View raw JSON requests and responses directly within the app.
-   **Secure Credential Handling**: Encrypted storage of Client ID and Secret using Electron's `safeStorage`.
-   **Asynchronous Workflow**: Built-in support for job polling and webhook signature verification.
-   **Direct S3 Uploads**: Demonstrates how to securely upload local images for processing.

---

## 🛠️ Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (Active LTS version recommended, e.g., v18 or v20)
-   NPM (comes with Node.js)
-   Pixelz API Credentials (Client ID and Client Secret)

### Installation & Run

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Pixelz-Inc/pixelz-automation-demo.git
    cd pixelz-automation-demo
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run in development mode**:
    ```bash
    npm run dev
    ```

4.  **Login**: Enter your Pixelz API credentials in the sidebar to retrieve an access token.

### Building for Production

To create a standalone executable/installer:

**Windows**:
```bash
npm run build:win
```

**macOS**:
```bash
npm run build:mac
```
Built binaries will be available in the `dist/` directory.

---

## 📖 Using the App

### 1. New Requests
Select an API method, provide a source image URL or upload a local file, and configure your parameters. Each method displays its token cost for transparency.

### 2. Job Management
Most Pixelz operations are asynchronous. The app automatically polls for status updates using exponential backoff. You can track all your jobs in the main list.

### 3. Webhook Verification
The app includes a dedicated utility to verify webhook signatures (`X-Signature` headers) using ECDSA with P-256 and SHA256, ensuring the authenticity of incoming events.

---

## 🤝 Support

For more details on the API, visit the [Official Pixelz Automation API Documentation](https://docs.pixelz.com/automationapi/index.html). We do not offer support for this demo application.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
