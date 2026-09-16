# Same Wi‑Fi room function (Appwrite)

SkyShare groups devices by **public IP as Appwrite sees it** — the same way AirForShare works on their server.

## Deploy once in Appwrite Console

1. Open [Appwrite Console](https://cloud.appwrite.io) → **Functions** → **Create function**
2. Name: `room-id` · Runtime: **Node.js 18+**
3. Open the function → **Deployments** → create deployment with this file as entrypoint:
   - Path in repo: `functions/room-id/src/main.js`
   - Entrypoint: `src/main.js`
4. **Settings → Execute access** → allow **Any** (guests can run it)
5. Copy the **Function ID** into `.env`:
   ```
   VITE_APPWRITE_ROOM_FUNCTION_ID=your_function_id
   ```
6. Rebuild and redeploy SkyShare

## How it works

- Laptop and phone on the **same Wi‑Fi** → same public IP → same room → shared text/files
- Different networks → different rooms → each sees only their own content
- **Separate mobile data on each device is not the same network** (by design)

## Test

1. Connect **both** devices to the **same Wi‑Fi**
2. Turn **off mobile data** on the phone
3. Save text on laptop → refresh on phone → should appear
