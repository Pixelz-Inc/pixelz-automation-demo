# Pixelz Automation Demo Requirements

## Overview
**Role:** Act as a Senior Full-Stack & Desktop Engineer. Build a high-performance, secure, and cross-platform (Mac/Windows) Electron application to demo the Pixelz Automation API. The developer must prioritize non-blocking UI, memory efficiency, and industrial-grade security.

---

## 1. Core Architecture & Security

### API Documentation
Use the `PixelzAutomation.yaml` file in the project folder as the primary source of truth for all endpoints, parameters, and costs. Documentation also available at [docs.pixelz.com/automationapi](https://docs.pixelz.com/automationapi/index.html).

### Authentication (Keycloak)
The identity server is Keycloak-based. Implement OAuth 2.0 Client Credentials flow to retrieve a JWT `access_token`.

**Token Endpoint:**
```
POST https://id.pixelz.com/realms/pixelz-automations/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
&audience=automation.api
```

### Token Management
- Show a live countdown for the token (valid for **1 hour / 3600 seconds**).
- Include a manual "Refresh" button and an "Auto Refresh" checkbox (refresh 1-5 mins before expiry, randomly selected).
- Disable all processing UI if no access token is active.

### Secure Storage
Store client credentials using Electron's `safeStorage` API to ensure encryption at rest.

### IPC Security
Use `contextIsolation: true` and `nodeIntegration: false`. All API logic must reside in the Main process; communication with the Renderer must be via a secure preload script.

---

## 2. User Interface Design

### Modern UI Framework
The application must have a **polished, modern, and professional appearance**. Use a state-of-the-art UI design framework suitable for Electron applications:

- **Recommended frameworks:** React with Material UI, Chakra UI, Ant Design, or Radix UI with Tailwind CSS.
- **Design principles:**
  - Clean, minimalist layout with consistent spacing and typography.
  - Dark mode support (with toggle).
  - Smooth micro-animations and transitions for a premium feel.
  - Responsive layout that adapts well to different window sizes.
  - Clear visual hierarchy with proper use of cards, shadows, and color accents.
  - Accessible color contrast ratios and keyboard navigation support.
  - Loading states, spinners, and skeleton screens where appropriate.
  - Toast notifications for success/error feedback.

---

## 3. General User Interface (Global Settings)
The App should present a UI for the user to input authentication info and request an `access_token`.

### Authentication UI
Input fields for credentials. If no token is active, all other features are disabled.

### Processing Modes
Toggle between **Sync** and **Async** (Async as default).
- In Async mode, add the header `Respond-Mode: async`.

### Webhook Verification Utility
- Optional Input for a webhook URL (e.g., a webhook tester URL). If filled, it should be sent to all API methods supporting `callback_url`.
- **Webhook Verification Button:** Opens a popup for verifying webhook requests.
- **Verification Logic:** Verify `X-Signature` headers using **ECDSA with P-256 and SHA256**. Retrieve public key from `https://automation-api.pixelz.com/v1/webhook/public-keys` and cache indefinitely (the key is static per client).

### Image Handling
- **URL Mode:** Validate image format (JPG, JPEG, PNG, WEBP) and render to a Canvas.
- **Direct Upload Mode:** Use `https://automation-api.pixelz.com/v1/files/request-upload-url` to get a presigned URL, upload via PUT to S3, and use that URL for the processing request.

> **Note:** Direct upload feature is **disabled by default**. Users must contact Pixelz to enable file upload functionality for their account.

### File Storage Policy
| File Type | Storage Duration |
|-----------|------------------|
| Uploaded files (source images) | 24 hours |
| Presigned upload URLs | 24 hours |
| Result files (processed images) | 7 days |

### Job Management
- Maintain a "Job List".
- **Sync Jobs:** Lock UI, show a graphical activity spinner, wait for HTTP 200 response. Clearly state it is a Sync job.
- **Async Jobs:** Return `job_id` (HTTP 201), add to list, and poll `https://automation-api.pixelz.com/v1/images/jobs/{jobId}/status` using exponential backoff.
- **Selection:** When a job is selected from the list, show inputs in read-only mode and display the result or status.
- **Check Now Button:** Debounced/locked for 2 seconds after click to avoid spamming.

---

## 4. Method-Specific UI Requirements
The UI must dynamically update based on the selected API method. All methods take at least one input image (URL or Direct Upload). Show the **token cost** next to the "Send Request" button.

### Token Costs & Rate Limits

| Method | Token Cost | Rate Limit |
|--------|------------|------------|
| Color Matching | 100 tokens | 30 req/min |
| Create Mask | 100 tokens | 60 req/min |
| Create Trimap | 50 tokens | 60 req/min |
| Model Crop | 10 tokens | 60 req/min |
| Remove Background | 100 tokens | 30 req/min |
| Get Job Status | Free | 120 req/min |

---

### Color Matching
- **Coordinate Scaling:** User clicks the image to set markers. Scale coordinates from display size to `naturalWidth`/`naturalHeight`.
- **Markers:** Allow adding multiple `color_markers`.
- **Marker Options:** Choose between a Hex Color Picker (`swatch_color_code`) **OR** a Swatch Image (URL or Direct Upload) — not both.
- **Swatch UI:** Show a thumbnail for swatch images with a 30x30px selection box that scales with the image.

---

### Create Mask
- **Feather Slider:** Range 0–50 (Integer pixel value, e.g., 3).
- **Trimap:** Optional `trimap_url` input (URL or Direct Upload).

---

### Create Trimap
- **UI:** No specific inputs.
- **Output:** Returns both `result_image_url` (PNG trimap image) and `result_trimap_vector_url` (JSON vector format). Display both in results.

---

### Model Crop
- **Dropdowns:** `top_crop_location` and `bottom_crop_location`.
- **Validation:** At least one location must be selected.

**Available enum values:**
| Value | Description |
|-------|-------------|
| `eye_higher` | Above eye level |
| `below_eye` | Below the eyes |
| `btw_eye_and_nose` | Between eye and nose |
| `below_nose` | Below the nose |
| `between_nose_and_mouth` | Between nose and mouth |
| `below_mouth` | Below the mouth |
| `below_chin` | Below the chin |
| `chest` | At chest level |
| `at_elbow_higher` | At elbow (higher) |
| `at_elbow_lower` | At elbow (lower) |
| `waist` | At waist |
| `below_buttock` | Below buttock |
| `main_body_axis` | Main body axis |
| `mid_thigh` | Mid-thigh |
| `above_knee` | Above knee |
| `at_knee` | At knee |
| `below_knee` | Below knee |

---

### Remove Background
- **Feather Slider:** Range 0–50 (Integer pixel value).
- **Background Options:** Choose between `background_color` (Hex Picker) **OR** `transparent_background` (Checkbox).
  - ⚠️ **Mutually exclusive:** One must be set, but not both.
  - If `transparent_background` is selected, disable background color picker and show text: "Output will be a PNG image".
- **Trimap:** Optional `trimap_url` input (URL or Direct Upload).

---

## 5. Logging & Error Handling

### Debug Panel
Real-time log of all API requests and responses.
- Redact `client_secret` and `Authorization` headers.
- Timestamps must include milliseconds (e.g., `2025-01-15T14:32:05.123`).
- Log should be easy to read and copy.
- This log panel should be collapsible and the default state should be collapsed.

### Error Mapping
Map API error codes to user-friendly toast notifications:

| Error Code | User Message |
|------------|--------------|
| `insufficient_balance` | "Insufficient token balance" |
| `invalid_file_url` | "Invalid image URL format" |
| `download_failed` | "Failed to download image from URL" |
| `file_type_not_supported` | "Unsupported file type" |
| `presigned_url_creation_failed` | "Failed to create upload URL" |
| `invalid_request` | "Invalid request parameters" |

---

## 6. Technical Implementation Details

### Rate Limits
Implement local tracking for method-specific rate limits (see table above) and warn the user if they are approaching or exceeding limits.

### Cleanup Notice
Display a note that result URLs expire after **7 days**. Encourage users to download results promptly.
