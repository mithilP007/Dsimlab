# SimLab Production Deployment Architecture

This document describes the multi-tier production architecture of SimLab using a Mermaid visual diagram.

---

```mermaid
graph TD
    User([Student/Instructor/Admin Browser]) -->|HTTPS / WSS| Nginx[Nginx Reverse Proxy & Load Balancer]
    
    subgraph Web & Static Tier
        Nginx -->|Serves Static Files| FrontendContainer[Frontend React SPA Container]
    end
    
    subgraph Application Tier
        Nginx -->|API Proxies| FastifyServer[Fastify App Server Container]
        FastifyServer -->|Push real-time events| SocketIO[Socket.io Telemetry Server]
        FastifyServer -->|Delegate jobs| BullMQQueue[BullMQ Background Queue System]
    end

    subgraph Data & Cache Tier
        FastifyServer -->|Read/Write Session & Cache| RedisCache[(Redis Key/Value Cache)]
        BullMQQueue -->|Read/Write Jobs| RedisQueue[(Redis Queue Store)]
        FastifyServer -->|Queries & Updates| PostgresDB[(PostgreSQL Database)]
        BullMQQueue -->|Queries & Updates| PostgresDB
    end

    subgraph Storage Tier
        FastifyServer -->|Saves generated PDF certs| DiskStorage[Static Storage Volume /uploads]
        BullMQQueue -->|Writes generated PDF certs| DiskStorage
    end
```

---

## Component Layout & Responsibilities

1. **Nginx Reverse Proxy**: Terminate SSL, forward API calls to the Fastify container, and serve static HTML/JS/CSS assets with Gzip compression.
2. **Fastify Backend Server**: Process REST API requests, manage authentication middleware (Better Auth), and execute simulation configurations.
3. **BullMQ Background Workers**: Execute resource-intensive operations in separate event loop processes (e.g. certificate generation and metric compilation).
4. **Redis Cache & Queue Broker**: Act as the caching server for leaderboards and system states, and manage the message store for background jobs.
5. **PostgreSQL Database**: Serve as the persistent relational database for users, classes, simulations, and transaction receipts.
