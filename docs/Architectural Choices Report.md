# Architecture Choices Report

## Architecture Update (30.10.2025)

The system has now evolved into a fully distributed microservice architecture consisting of the Server, Lobby Service, and Game Service, all communicating asynchronously through NATS. Each service is independently deployable, containerized, and connected to PostgreSQL for persistent storage. Prometheus and Grafana provide observability for metrics and performance monitoring.

### Overview

- Server – Acts as the main gateway and orchestrator. It manages connections, session data, and message routing.
- Lobby Service – Handles all matchmaking and lobby management logic. It creates, fills, and transitions lobbies to active games by publishing game.start events.
- Game Service – Runs all core game logic. It receives moves and state updates through NATS topics and responds with processed results to the server.
- NATS – The backbone of the communication layer. It enables event-driven interactions between services while maintaining loose coupling.

### Lobby Service
- `src/`
  - `dtos/`
    - `player.ts`          # Player-related data transfer objects
  - `lobby/`
    - `lobby.ts`           # Core lobby logic (create, join, ready-up, start)
  - `index.ts`               # Service entry point (NATS subscriptions)
  - `nats-client.ts`         # Helper for publishing/subscribing to topics
- `prisma/`                    # Database schema & migrations
- `prisma.config.js`           # Prisma configuration

The Lobby Service maintains in-memory state for active lobbies and coordinates with the database for persistence. Once a lobby is full, it emits a game.start event via NATS, triggering the Game Service to initialize a new match.

### Communication Flow

```Client → Server → NATS → Lobby Service → NATS → Game Service → NATS → Server → Client```

This asynchronous chain allows services to operate independently, improving scalability and resilience. Failures in one service (e.g., a failed game start) no longer propagate to others.

### Data Layer and Monitoring

All persistent data (only lobby states for now) is stored in a PostgreSQL instance. Currently, only the lobby service has access to this database through its own isolated data access layer, ensuring separation of concerns and simpler schema evolution. The schema is normalized around players, lobbies, and games, with references linking their respective IDs. Transaction boundaries have been clearly defined to avoid deadlocks during high-concurrency scenarios observed in load testing.

For system observability, I integrated Prometheus and Grafana. Each service exposes metrics that are scraped and visualized in Grafana dashboards, providing insight into latency, throughput, and resource utilization. This setup enables early detection of performance bottlenecks and verification of non-functional requirements such as scalability and reliability. These tools also made it possible to quantify performance improvements between architecture iterations.

### Containerization and Orchestration plan

All components — including the main services, database, message broker, and monitoring stack — are containerized through Docker. They can be orchestrated together using Docker Compose or deployed individually in future Kubernetes environments. This structure enables isolated development, parallel service updates, and simple replication of the environment on other machines. Continuous integration pipelines automatically build and push updated images to GitHub Container Registry (GHCR), ensuring that all containers are versioned and ready for deployment.

## Architecture Update (23.10.2025)
I have migrated to a basic-level microservice architecture.

### NATS
To enable communication between different services, I introduced NATS — a lightweight and high-performance messaging system.
It serves as the backbone for event-based communication between the main server and the game service.

The main advantages of using NATS are:
- Decoupling: Services no longer need to know about each other’s existence; they simply publish or subscribe to relevant topics.
- Scalability: Each service can be scaled independently without affecting others.
- Simplicity: NATS is easy to configure and fast enough for real-time updates, which suits my project’s requirements perfectly.

**Topics**
- `game.move` – published by the main server when a player performs an action.
- `game.result` – published by the game service once a move has been processed.
- `test` – used for basic connectivity and debugging. 

The message payloads are encoded using JSON and sent as strings through the StringCodec from the NATS client library.

### Game Service
Due to my planning, I have successfully created a microservice handling the game logic which was previously a part of the monolith structure of the server application. The internal logic is exactly the same as before, keeping the same structure, with just a few differences.
- **New Structure**
  - `src/`
    - `dtos/`
      - `move.ts`
      - `send-hand.ts`
    - `game/`
      - `phases/`
        - `playing.ts` 
        - `bidding.ts` 
      - `dealer.ts`
      - `game.ts`
      - `player.ts`
      - `types.ts`
    - `index.ts` - logic handling the communication with the NATS message software
    - `nats-client.ts` - helper functions to publish and subscribe to topics

**Events** <br>
In my last update I changed the handling of events. This has payed off now that I have changed the communication proccess between the game logic and the server logic.

### Server
The main server now acts primarily as an API gateway and orchestrator.

- **New Structure**
  - `src/`
    - `dtos/`
      - `move.ts`
    - `index.ts` - logic handling the communication with the NATS message software
    - `nats-client.ts` - helper functions to publish and subscribe to topics

It is responsible for:
- Managing player connections and game rooms.
- Receiving client actions (e.g., moves) through socket events or HTTP endpoints.
- Publishing these actions to the game.move topic in NATS.
- Subscribing to game.result to receive updates from the game service and forward them to clients.

The migration required minimal refactoring in the server code.
Most of the changes were related to:
- Removing direct imports of the game logic files.
- Implementing the NATS client initialization to handle message publishing and subscriptions.
- Adjusting event flows so that socket.io now reacts to NATS messages rather than local function calls.

This separation has made the codebase cleaner, more modular, and easier to maintain.
It also opens up possibilities for adding more services in the future, such as analytics or player management, without modifying the core game logic.

**Player connections and game rooms** <br>
As mentioned above, this step is currently handled in the server application. Soon I will delegate that to a Lobby microservice. The point will be to easily be able to create multiple games, adding horizontal scalability and the ability to be load tested.

## Architecture Update (16.10.2025)
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

## Architecture Update (05.10.2025)

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
