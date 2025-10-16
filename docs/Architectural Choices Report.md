# Architecture Choices Report

## Current Architecture (as of 16.10.2025)
I have updated the architecture of the applications, most notably the server.

### Server
In order to update the process of running a production version of my server, I have updated the Dockerfile and scripts available to build and start. Now Typescript files get parsed into Javascript, similarly to the client application.
Therefore I placed the server logic inside a main `src/` folder.
- **New Structure**
  - `src/`
    - `dtos/`
      - `move.ts`
      - `send-hand.ts`
    - `game/` - newly added folder to hold all game logic
      - `phases/`
        - `bidding.ts` - logic during the bidding phase
        - `playing.ts` - logic during the playing phase
      - `dealer.ts`
      - `game.ts`
      - `player.ts`
      - `types.ts`
    - `index.ts`

**OOP and functional** <br>
In my mind, it makes sense that the game object should be an object, an instance of a class. Each game will hold its own players, dealer and state. However, I opted to keep the bidding and playing logic as purely functional, since it helps with separation of concerns, neatness and I believe that's logic that doesn't need to be tied to the instance of a game class, it will never change. I have achieved this by putting all the necessary game fields into one state field, which gets passed through the phases logic.

**Events** <br>
I have restructured the way I trigger events. This was necessary due to the refactor I made with the separation of phases and restructuring of folders and files. Now, events are created in the index/gateway layer of the server and passed as parameters through the game class and its helper functions. This allows me to emit any type of event from anywhere within my code structure.

**Dockerfile** <br>
It is now tested and working. I have introduced proper handling of typescript within this app (added `tsconfig.json` for TS compiling to JS within a `dist/` folder), and a good pipeline to build and start the app.

### Client
There have been no major changes to the client. Only minor updates and tweaks to reflect the server's updates in logic.

### Extra
The architectural pattern is still of a monolithic client-server application. The eventual shift to microservices is approaching steadily at a rapid pace. Once the game is playable *enough*, I will apply the "Strangler" design pattern for migration. For a brief moment in time during development, both my microservice and monolith architecture will exist until stability can be guaranteed, at which point full migration can occur.

## Outdated Architecture (as of 05.10.2025)

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
    - `Table.tsx` - component representing the playing table, with a view of the user's cards and other players.
    - `Card.tsx` – component representing a single card.
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
  - `index.ts` – entry point for the server; contains all event handling and directs communication between client and game logic.
  - `game.ts` - handles the logic of the game, including rules, validating player moves.
  - `dealer.ts` – handles dealing/shuffling of cards.
  - `player.ts` – manages player state.
  - `dtos/move.ts` – defines data transfer objects for moves (shared structure for client-server communication).
  - `dtos/send-hand.ts` – defines data transfer objects for the dealt hand (shared structure for client-server communication).  

The gameplay handling is logically separated from the client-server communication logic within the current server application. This will allow me to easily refactor/recycle the code when migrating to a microservices architecture (see [Architectural Pattern](#architectural-pattern) below)

---

### Documentation
- `docs/` directory: used for architecture diagrams and design notes.
- `README.md`: project-level overview.

---

### Database
Currently, **no database is integrated**. All state is kept in memory during runtime for the sake of development haste. Persistent storage (e.g., user accounts, finished games, statistics) will be introduced later when additional services like login/registration and scoring are implemented.

---

### Architectural Pattern
- **Current Pattern**: Monolithic client-server with shared types.
- **Future Direction**: Transition to **microservices**, as outlined in the architecture diagrams:
  - Dedicated services for Login, Lobby, Game, Score/Leaderboard.
  - Central API Gateway for communication and synchronization.
  - Database(s) for persistence.

---
