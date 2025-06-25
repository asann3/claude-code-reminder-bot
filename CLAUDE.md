# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Discord Reminder Bot - TypeScript Discord bot running on Cloudflare Workers

## Development Commands

```bash
# Install dependencies
pnpm install

# Type checking
pnpm type-check

# Build TypeScript
pnpm build

# Deploy commands to Discord
pnpm tsx deploy-commands.ts

# Local development
pnpm dev

# Deploy to Cloudflare Workers
pnpm deploy

# Format and lint code
pnpm lint

# Fix formatting and linting issues
pnpm lint:fix
```

## Architecture

### Cloudflare Workers Environment

- **src/index.ts**: Main Worker entry point, Discord Interaction handling
- **src/storage.ts**: Reminder data persistence using Durable Objects
- **src/commands.ts**: Discord slash command handlers
- **src/types.ts**: TypeScript type definitions
- **src/utils.ts**: Utility functions

### Key Differences from Traditional Discord Bots

- HTTP Interactions instead of WebSocket communication with Discord API
- Request-driven instead of always-running
- Durable Objects instead of SQLite
- Cron Triggers for reminder execution

### Data Storage

Reminder management using Durable Objects:
- `POST /reminders`: Create reminder
- `GET /reminders?userId=`: Get user's reminders list
- `GET /reminders/due`: Get due reminders
- `PUT /reminders/:id`: Update reminder

### Available Commands

- `/remind <message> <time>`: Set reminder (time format: 5m, 1h, 2d)
- `/reminders`: Display active reminders list

## Setup Requirements

1. Set up Cloudflare Workers environment
2. Create `.env` file based on `.env.example`
3. Create application in Discord Developer Portal
4. Configure environment variables in `wrangler.toml`
5. Register slash commands with `pnpm tsx deploy-commands.ts`
6. Deploy Worker with `pnpm deploy`

## TypeScript Configuration

- Strict type checking enabled (`strict: true`)
- `any` type usage prohibited (`noImplicitAny: true`)
- Cloudflare Workers type definitions used

## Key Libraries

- **discord-interactions**: Discord signature verification
- **@cloudflare/workers-types**: Cloudflare Workers type definitions