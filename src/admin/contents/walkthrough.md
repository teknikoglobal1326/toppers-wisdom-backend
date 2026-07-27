# Walkthrough - Live Streaming & Restreaming Integration

We have updated the go-live and end-live flows for live classes (`Contant` model) to match the OBS Studio + Agora Cloud restreaming mechanism.

## Summary of Changes

### 1. Database Model Schema
- **[Content.model.js](file:///c:/NodeJS/toppers-wisdom-backend/src/models/Content.model.js) [MODIFY]**: Added fields `restreamUrls: [String]` and `agoraConverters: [String]` to record active destinations and dynamic converter instances.

### 2. Admin Controller
- **[admin-content.controller.js](file:///c:/NodeJS/toppers-wisdom-backend/src/admin/contents/admin-content.controller.js) [MODIFY]**: Modified the `goLive` handler to capture request body parameters (e.g. `restreamUrls`) and pass them to the service.

### 3. Admin Service
- **[admin-content.service.js](file:///c:/NodeJS/toppers-wisdom-backend/src/admin/contents/admin-content.service.js) [MODIFY]**:
  - **`goLive(id, body)`**:
    - Generates a publisher token.
    - Constructs and returns the dynamic `rtmpServer` and `rtmpStreamKey` settings to configure OBS.
    - If `restreamUrls` are supplied, automatically initiates Agora Cloud RTMP Converters via Agora's REST APIs, saving converter IDs.
    - Gracefully handles missing Agora API credentials to prevent streaming failures on local setups.
  - **`endLive(id)`**:
    - Iterates and stops all active Agora RTMP cloud converters using Agora's REST APIs.
    - Updates `liveStatus: 'completed'` and clears restream/converter lists.
