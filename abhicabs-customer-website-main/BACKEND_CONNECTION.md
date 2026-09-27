# Backend Connection Guide

The frontend is now wired to your backend API. Follow these steps to connect it.

## 1. Find your backend's port

Your frontend (Vike) runs on **http://localhost:3000**, so the backend must be on a
different port. Look at your backend's terminal output — it prints something like:

    Server listening on port 4000

Common ports: `4000`, `5000`, `8000`, `8080`.

## 2. Set the URL in `.env`

Open the `.env` file in the project root and set the base URL to match your backend:

    VITE_API_BASE_URL=http://localhost:4000/api/v1

(Replace `4000` with your actual port. Keep the `/api/v1` suffix — that's the
base path defined in your backend reference.)

## 3. Choose the mode

    VITE_USE_MOCK=false        # use the real backend
    VITE_MOCK_FALLBACK=true    # if backend is unreachable, use mock data (dev safety)

- **Real backend:** `VITE_USE_MOCK=false`
- **Force mock (no backend calls):** `VITE_USE_MOCK=true`
- **Turn off auto-fallback (see real errors):** `VITE_MOCK_FALLBACK=false`

## 4. Restart the dev server

Env changes only apply on restart:

    npm run dev

## What's connected

| Feature            | Endpoint                          |
|--------------------|-----------------------------------|
| Vehicle options    | `POST /fares/options`             |
| Fare estimate      | `POST /fares/estimate`            |
| Create booking     | `POST /bookings` (Idempotency-Key)|
| Payment order      | `POST /payments/orders`           |
| Payment status     | `GET  /payments/:id`              |
| Booking lookup     | `GET  /bookings/:id`              |
| Cancel booking     | `POST /bookings/:id/cancel`       |
| Invoice            | `GET  /bookings/:id/invoice`      |
| OTP request        | `POST /auth/otp/request`          |
| OTP verify         | `POST /auth/otp/verify`           |
| Token refresh      | `POST /auth/refresh` (auto)       |

## How auth works

- On OTP verify, the backend returns `accessToken` + `refreshToken`, stored in
  localStorage.
- Every authenticated request sends `Authorization: Bearer <accessToken>`.
- On a 401, the client automatically calls `POST /auth/refresh`, stores the new
  rotated token pair, and retries the request once.

## CORS note

If you see CORS errors in the browser console, your backend must allow the
frontend origin. In your Express backend:

    app.use(cors({ origin: "http://localhost:3000", credentials: true }));

## Expected response shape

The client expects the envelope from your backend reference:

    Success:  { "success": true, "data": { ... } }
    Error:    { "success": false, "error": { "code": "...", "message": "..." } }

If your backend uses a different shape, adjust `src/api/client.js`.
