# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project: LAN Hub – Secure Local Collaboration (Next.js + TypeScript)

Common development commands (pwsh on Windows)
- Install deps
  - npm install
- Run dev server (Next 15 with Turbopack)
  - npm run dev
  - Opens http://localhost:3000
- Build production bundle
  - npm run build
- Start production server
  - npm start
- Lint (ESLint via Next)
  - npm run lint
- Optional: Bun (bun.lock present). If Bun is installed: bun dev, bun run build, bun start
- Tests: none configured in this repo (no Jest/Vitest/Playwright config or test files)

Environment expectations
- Node.js: 20.11+ recommended (ESM + eslint flat config comment indicates import.meta.dirname usage available >= 20.11)
- Package manager: npm (package-lock.json present). Bun supported as above

High-level architecture and flow
- App Router with client-side context
  - Entry: src/app/page.tsx renders <AuthForm /> or <Dashboard /> based on auth state
  - Global provider: src/contexts/AppContext.tsx is the single orchestrator for application state
    - Persists all domain data (users, devices, messages, file transfers, activity logs, chat rooms) to localStorage via src/lib/local-storage.ts
    - On mount: loads persisted data, optionally re-registers the current user with the backend, and pulls initial server state
    - Heartbeat to backend every 10s to fetch new messages and refresh online presence
    - Provides actions: login/register/logout, sendMessage, add/update file transfers, createChatRoom, simulateDeviceDiscovery
  - Types: src/types/index.ts defines the domain model (User, Device, Message, FileTransfer, ChatRoom, ActivityLog)
- Backend API (serverless, polling-based)
  - Route: src/app/api/ws/route.ts
  - Implements a long-poll style API instead of true WebSocket (Next serverless limitation). POST body type controls behavior:
    - register_user: adds a user to an in-memory onlineUsers map and returns online users + message history
    - unregister_user: removes user from online map
    - heartbeat: updates lastSeen and returns online users plus messages since the client’s lastSync
    - send_message: appends to in-memory messageHistory and returns it to all polling clients on next sync
    - register_device: adds a device to an in-memory registry
    - get_state: returns onlineUsers, messages, devices snapshots
  - State is in-memory; it resets when the process restarts. No persistence beyond the client’s localStorage
- Visual editing and instrumentation (“orchids” attributes and messaging)
  - Build-time JSX tagger: src/visual-edits/component-tagger-loader.js (wired via next.config.ts turbopack.rules)
    - Injects data-orchids-id and data-orchids-name attributes into JSX/TSX elements at build/dev time
    - IDs encode file path + location and optionally add context from array .map() iterations and referenced identifiers
    - Skips Three.js/React Three Fiber and @react-three/drei elements via explicit blacklists
  - Runtime messenger/overlay: src/visual-edits/VisualEditsMessenger.tsx (added globally in layout)
    - When running inside an iframe, listens/sends postMessage events on the ORCHIDS_HOVER_v1 channel
    - Provides hover/focus overlays, contentEditable toggling for simple text nodes, inline style previewing, image source updates, and resize handles
    - Emits TEXT_CHANGED, STYLE_BLUR, IMAGE_BLUR, FOCUS_MOVED messages with file location context derived from data-orchids-id
  - Error capture: src/components/ErrorReporter.tsx posts runtime and Next dev overlay errors to the parent frame
  - Global wiring: src/app/layout.tsx includes ErrorReporter, VisualEditsMessenger, and an external route-messenger script (via next/script) used to post route-change messages to a parent frame
  - Note: Removing VisualEditsMessenger, the custom loader, or the route-messenger script will disable this instrumentation
- UI system and styling
  - shadcn/ui components under src/components/ui and config in components.json; Tailwind v4 via @tailwindcss/postcss (see postcss.config.mjs) and global stylesheet at src/app/globals.css
  - Path aliases in tsconfig.json: @/* -> ./src/*
- Linting
  - eslint.config.mjs extends "next" and enables import plugin rules. Selected rules are disabled (e.g., react/no-unescaped-entities, @next/next/no-img-element, react-hooks/exhaustive-deps, TS no-unused-vars/no-explicit-any). Import-related violations are treated as errors (unresolved/named/default/namespace/self-import/cycles/useless path segments)
- Images and Next config
  - next.config.ts allows remote images from any host (http/https) and registers the Turbopack loader rule for JSX/TSX
  - outputFileTracingRoot is set to path.resolve(__dirname, '../../'); confirm this is intended for your workspace layout when deploying

What’s not present
- No automated tests or test runner configuration
- No CI workflows in .github/workflows

Pointers to important files
- src/app/layout.tsx: global wiring (ErrorReporter, route-messenger script, VisualEditsMessenger)
- src/contexts/AppContext.tsx: core app logic and client/server sync
- src/app/api/ws/route.ts: polling-based collaboration backend
- src/visual-edits/*: build-time tagger + runtime messenger for visual editing
- eslint.config.mjs and tsconfig.json: linting + module resolution

Notes from README.md
- Start dev server and open http://localhost:3000 (README lists multiple package managers; npm is the default here). The primary page to modify is under src/app/page.tsx
