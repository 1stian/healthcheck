# Frontend Dashboard

React-based web dashboard for VM health monitoring.

## Setup

```bash
npm install
npm run dev
```

## Features

- Real-time VM status display
- CPU/RAM usage charts
- Automatic page refresh
- Reset VM controls
- Metrics history view
- System configuration panel

## Environment Variables

Create `.env.local`:

```env
VITE_API_URL=http://localhost:3000/api
VITE_REFRESH_INTERVAL=5000  # 5 seconds
```

## Build

```bash
npm run build
npm run preview
```
