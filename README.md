# Real-Time Collaborative Code Editor

[![Live Demo](https://img.shields.io/badge/Live%20Demo-online-22c55e?style=for-the-badge)](https://real-time-code-editor-3-t6mg.onrender.com/)

A live, multi-user code editing platform — think Google Docs for code, similar to Replit.
Multiple users join a shared room and edit the same document simultaneously with
conflict-free synchronization, live cursors, presence tracking, and syntax highlighting.

**🔗 Live demo:** https://real-time-code-editor-3-t6mg.onrender.com/

> Open the link in two browser tabs, join the same Room ID, and edit together.
> _(Hosted on Render's free tier — the first load may take ~30–50s while the server wakes from sleep.)_

## Architecture

```
                    ┌──────────────┐
   Browser ◀──────▶ │  Frontend    │  React + Monaco editor + Yjs (CRDT)
   (Monaco)         │  (Vite)      │
                    └──────┬───────┘
                           │ WebSocket (Socket.IO)
                    ┌──────▼───────┐
                    │  Backend     │  Node.js + Express + Socket.IO
                    │  (Node)      │  Room mgmt · presence · Yjs sync
                    └──────┬───────┘
                           │ Pub/Sub
                    ┌──────▼───────┐
                    │   Redis      │  Fan-out across backend instances
                    └──────────────┘
```

## Tech Stack

| Layer        | Technology                                            |
| ------------ | ----------------------------------------------------- |
| Frontend     | React, Vite, Monaco Editor, Yjs (`y-monaco`)          |
| Realtime     | Socket.IO (WebSockets)                                 |
| Collab engine| Yjs — CRDT for conflict-free concurrent editing       |
| Scaling      | Redis Pub/Sub (Socket.IO Redis adapter)               |
| Container    | Docker + Docker Compose                                |
| CI/CD        | GitHub Actions                                         |
| Cloud        | AWS (ECS/Fargate + ElastiCache + ALB)                  |

## Project Structure

```
real-time-code-editor/
├── backend/        # Express + Socket.IO server
├── frontend/       # React + Monaco client
├── docker-compose.yml
└── .github/workflows/
```

## Local Development

Prerequisites: Node.js 20+, npm, (Docker for the full stack).

```bash
# Backend
cd backend
npm install
npm run dev          # http://localhost:4000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Or run the whole stack (backend + frontend + Redis) with Docker:

```bash
docker compose up --build
```

## Deployment

Deployed live on **Render** as a single service (the Node backend serves the built
React frontend and the Socket.IO API from one URL): https://real-time-code-editor-3-t6mg.onrender.com/

Infrastructure-as-code for a scalable AWS deployment (ECS/Fargate + ElastiCache + ALB)
is also provided under [`infra/terraform`](infra/terraform).

## Status

✅ Live and functional — real-time collaborative editing, chat, presence, run-code, and settings.
