# Discord Reminder Bot

A TypeScript Discord bot running on Cloudflare Workers that provides advanced reminder functionality with multiple notification timing options.

## Features

- **Multiple Notification Formats**:
  - Relative time: `5m`, `1h`, `2d` (minutes, hours, days)
  - Absolute date: `2024-12-25`, `2024-12-25 14:30`
- **Smart Deadline Handling**:
  - For `00:00` deadlines: Sets actual deadline to 23:59 of previous day
  - For other times: Uses specified time as deadline
- **Dual Notifications**:
  - 3 days before deadline at 00:00
  - Day of deadline at 00:00 with time-specific messages
- **Persistent Storage**: Uses Cloudflare Durable Objects for data persistence
- **Automatic Execution**: Cron triggers check for due reminders every minute

## Commands

- `/remind <message> <time>` - Set a reminder
  - Examples:
    - `/remind Meeting 1h` (1 hour from now)
    - `/remind Project deadline 2024-12-25` (specific date)
    - `/remind Presentation 2024-12-25 14:30` (specific date and time)
- `/reminders` - List your active reminders

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Language**: TypeScript
- **Storage**: Cloudflare Durable Objects

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm
- Cloudflare account
- Discord application

### Environment Configuration

1. **Copy environment files**:

   ```bash
   cp .env.example .env
   cp .dev.vars.example .dev.vars
   ```

2. **Configure `.env`** (for Wrangler CLI):

   ```bash
   CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
   ```

3. **Configure `.dev.vars`** (for local Worker development):

   ```bash
   DISCORD_APPLICATION_ID=your_discord_application_id
   DISCORD_PUBLIC_KEY=your_discord_public_key
   DISCORD_TOKEN=your_discord_bot_token
   ```

### Installation & Setup

```bash
# Install dependencies
pnpm install

# Login to Cloudflare
wrangler login

# Deploy Discord commands (global)
pnpm tsx deploy-commands.ts

# Start local development
pnpm dev

# Deploy to production
pnpm deploy
```

### Production Secrets

Set production secrets using Wrangler:

```bash
wrangler secret put DISCORD_APPLICATION_ID
wrangler secret put DISCORD_PUBLIC_KEY
wrangler secret put DISCORD_TOKEN
```

### Discord Setup

1. Create application at [Discord Developer Portal](https://discord.com/developers/applications)
2. Create bot and get token
3. Set Interactions Endpoint URL to your Worker URL
4. Invite bot to server with `applications.commands` and `bot` scopes

## Project Structure

```
src/
├── index.ts          # Main Worker entry point
├── storage.ts        # Durable Objects for data persistence
├── commands.ts       # Discord command handlers
├── types.ts          # TypeScript type definitions
└── utils.ts          # Utility functions
```

## Environment Variables

### File Usage

- **`.env`**: Wrangler CLI configuration (Cloudflare account ID only)
- **`.dev.vars`**: All Worker environment variables including Discord settings
- **Production**: Use `wrangler secret put` for sensitive Discord data

### Why This Separation?

- `.env` contains only Wrangler CLI configuration (non-sensitive account info)
- `.dev.vars` contains all Worker runtime variables and is used by both `wrangler dev` and deployment scripts
- Production secrets are encrypted and managed by Cloudflare's secure storage

### Command Registration

The bot uses **global commands** which are available in all servers where the bot is invited. Global commands may take up to 1 hour to propagate across all Discord servers after deployment.

## Architecture Notes

The bot implements smart notification timing:

1. **3 days before**: Always at 00:00 of that day
2. **Day of deadline**:
   - For 00:00 deadlines: Previous day 00:00 ("deadline is today at 23:59")
   - For other times: Same day 00:00 ("deadline is today at XX:XX")

## License

Public Domain - Feel free to use this code however you want.
