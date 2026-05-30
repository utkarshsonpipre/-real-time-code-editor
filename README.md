# Real-Time Collaborative Code Editor

A live, multi-user code editing platform — think Google Docs for code, similar to Replit.
Multiple users join a shared room and edit the same document simultaneously with
conflict-free synchronization, live cursors, presence tracking, and syntax highlighting.

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

## Status

🚧 In active development. See build phases in project notes.
