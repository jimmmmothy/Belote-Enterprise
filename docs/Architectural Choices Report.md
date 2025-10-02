# Architecture Choices Report

## Current Architecture (as of 02.10.2025)

### Overview
The project is currently structured as a **monorepo** with two main components:
- **Client (`belote-client/`)**: The React frontend application where players interact with the game.
- **Server (`server/`)**: A Node.js backend that manages gameplay logic and multiplayer synchronization.

This setup follows a **client-server architecture**, with real-time communication handled through WebSockets (via `socket.io`). The current architecture is intentionally simple to allow fast iteration during early development, while keeping the code organized in a way that can later evolve into microservices.

---

### Client (`belote-client/`)
- **Framework**: React with TypeScript and Vite bundler.  
- **Responsibilities**:
  - Display the game UI (cards, table, interactions).
  - Send user actions (play card, join game) to the server.
  - Listen for server updates (opponent moves, updated hand).
- **Structure**:
  - `src/` contains React components and configuration:
    - `App.tsx` – main application component.
    - `Card.tsx` – component representing a single card (with styling in `Card.css`).
    - `types.ts` – TypeScript type definitions for consistency across client and server.
    - `Config.ts` – configuration values such as server URL.
  - `assets/` – card images and other static resources.

---

### Server (`server/`)
- **Framework**: Node.js with TypeScript.  
- **Responsibilities**:
  - Handle connections from multiple clients.
  - Manage game flow (dealing cards, processing moves).
  - Enforce game rules.
  - Synchronize state across all players in a match.
- **Structure**:
  - `index.ts` – entry point for the server.
  - `dealer.ts` – handles dealing/shuffling of cards.
  - `player.ts` – manages player state.
  - `client-repo.ts` – repository of connected clients.
  - `dtos/move.ts` – defines data transfer objects for moves (shared structure for client-server communication).

The gameplay handling logic is separated from the client-server communication logic within the current server application. This will allow me to easily refactor/recycle the code when migrating to a microservices architecture (see [Architectural Pattern](#architectural-pattern) below)

---

### Documentation
- `docs/` directory: used for architecture diagrams and design notes.
- `README.md`: project-level overview.

---

### Database
Currently, **no database is integrated**. All state is kept in memory during runtime. Persistent storage (e.g., user accounts, finished games, statistics) will be introduced later when additional services like login/registration and scoring are implemented.

---

### Architectural Pattern
- **Current Pattern**: Monolithic client-server with shared types.
- **Future Direction**: Transition to **microservices**, as outlined in the architecture diagrams:
  - Dedicated services for Login, Lobby, Game, Score/Leaderboard.
  - Central API Gateway for communication and synchronization.
  - Database(s) for persistence.

---
