# PulseFeed — RSS Command Center

A modern, self-hosted RSS reader with AI-powered summaries, sentiment analysis, and smart filtering.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-6-dark?logo=prisma)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite)

## Features

- 📡 **25+ Default Feeds** — Pre-configured RSS feeds across Tech, News, Science, Business, AI, and Dev
- 🤖 **AI Summarization** — TLDR summaries, sentiment analysis, and importance scoring (OpenAI-compatible API)
- 🔍 **Full-Text Search** — Search across titles, summaries, and article content
- 🏷️ **Smart Tagging** — AI-generated topic tags for every article
- 📊 **Importance Scoring** — Articles ranked 0-100 by news significance
- 🔐 **Invite-Only** — Registration requires an invite code
- 👥 **Role-Based Access** — Reader, Editor, and Admin roles
- ⭐ **Bookmarks** — Save articles for later
- 🔄 **Auto-Fetching** — Cron-based periodic feed updates
- 🌙 **Dark Mode** — Automatic dark/light theme

## Quick Start

### 1. Install Dependencies

```bash
cd pulsefeed
npm install
```

### 2. Set Up Database

```bash
# Create SQLite database and tables
npm run db:push

# Seed with default feeds and demo users
npm run db:seed
```

### 3. Configure Environment

Edit `.env` with your settings:

```env
# Required: Auth secret (change in production!)
NEXTAUTH_SECRET="your-random-secret"

# Optional: AI Summarization
OPENAI_API_KEY="sk-..."
OPENAI_BASE_URL="https://api.openai.com/v1"  # or any OpenAI-compatible endpoint
OPENAI_MODEL="gpt-4o-mini"

# Invite code for new registrations
INVITE_CODE="pulse2025"
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Login Credentials (after seeding)

| Role   | Username | Password   |
|--------|----------|------------|
| Admin  | admin    | admin123   |
| Reader | reader   | reader123  |

Invite code for new registrations: `pulse2025`

## Production Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add NEXTAUTH_SECRET
vercel env add INVITE_CODE
vercel env add OPENAI_API_KEY
```

### Vercel Cron Jobs

Add to `vercel.json` for automatic feed fetching:

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

### Self-Hosted

```bash
# Build for production
npm run build

# Start
npm start

# Run feed fetcher via cron
# crontab -e
# */30 * * * * cd /path/to/pulsefeed && npm run cron:fetch
```

## Configuration

### Adding Feeds

1. Log in as admin
2. Go to **Admin** panel
3. Click **+ Add Feed**
4. Enter the RSS/Atom feed URL

### AI Summarization

PulseFeed works with any OpenAI-compatible API:

- **OpenAI**: Set `OPENAI_API_KEY` and use default URLs
- **Local LLMs**: Point `OPENAI_BASE_URL` to your local server (Ollama, LM Studio, vLLM)
- **Other Providers**: Any OpenAI-compatible endpoint works

Articles are automatically summarized on feed fetch. The AI generates:
- **Summary**: 2-3 sentence TLDR
- **Sentiment**: Positive/Negative/Neutral
- **Tags**: 3-5 relevant topic tags
- **Importance**: 0-100 news significance score

### Feed Categories

Default categories: `tech`, `news`, `business`, `science`, `ai`, `entertainment`, `dev`

Custom categories can be set when adding feeds.

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | Next.js 15, React 19, Tailwind CSS |
| Backend  | Next.js API Routes                  |
| Database | Prisma ORM + SQLite                 |
| Auth     | NextAuth.js (Credentials Provider)  |
| RSS      | rss-parser                          |
| AI       | OpenAI-compatible API               |

## API Endpoints

| Endpoint          | Method | Description                    |
|-------------------|--------|--------------------------------|
| `/api/auth/*`     | *      | NextAuth authentication        |
| `/api/articles`   | GET    | List articles with filters     |
| `/api/articles`   | POST   | Mark read/bookmark/hide        |
| `/api/feeds`      | GET    | List all feeds                 |
| `/api/feeds`      | POST   | Add new feed (admin/editor)    |
| `/api/feeds`      | DELETE | Remove feed (admin only)       |
| `/api/cron`       | POST   | Trigger feed fetch + AI summary|

## License

MIT
