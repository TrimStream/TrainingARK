# TrainingARK

TrainingARK is an interactive training simulator for competitive Commander (cEDH). It turns real four-player game states into playable decision scenarios so players can practice threat assessment, priority, interaction, and win attempts without paying for every lesson at the tournament table.

The goal is to provide cEDH with the kind of repeatable puzzle-based training that chess players already have: study a position, choose a line, receive feedback, and learn from the result.

## Features

- Browse published scenarios by difficulty, commander, or author.
- Recreate four-player board states with real Magic card images.
- Build multi-step scenarios with prompts, choices, explanations, and scoring.
- Play scenarios and review the result of every decision.
- Track completed attempts, scores, and personal bests.
- Create accounts and manage authored scenarios.
- Bookmark scenarios and organize them into playlists.
- Search the shared scenario library.

## How It Works

1. An **Arkitekt** reconstructs a meaningful position from a real or representative cEDH game.
2. The Arkitekt records the sequence of game actions and adds decision points.
3. A player studies the board, chooses an answer, and receives immediate feedback.
4. TrainingARK scores the completed run and saves it to the player's history.

Scenarios can test decisions such as when to interact, when to pass priority, whether to hold up mana, and when to attempt a win.

## Tech Stack

- [Next.js](https://nextjs.org/) App Router
- [React](https://react.dev/) and TypeScript
- [PostgreSQL](https://www.postgresql.org/) with Prisma
- [Auth.js](https://authjs.dev/) credentials authentication
- [Zustand](https://zustand.docs.pmnd.rs/) for builder state
- [Vitest](https://vitest.dev/) for tests
- [Tailwind CSS](https://tailwindcss.com/) tooling with CSS Modules for component styles
- [Scryfall](https://scryfall.com/) card images

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm
- A PostgreSQL database

### Installation

```bash
git clone <repository-url>
cd TrainingARK/trainingark
npm install
cp .env.example .env
```

Configure the following values in `.env`:

```dotenv
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
AUTH_SECRET="..."
```

- `DATABASE_URL` is used by the application for database queries.
- `DIRECT_URL` is used by Prisma for migrations.
- `AUTH_SECRET` signs Auth.js sessions. Generate one with `npx auth secret` or `openssl rand -base64 32`.

Apply the database migrations and start the development server:

```bash
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

```bash
npm run dev        # Start the development server
npm run build      # Create a production build
npm run start      # Run the production build
npm run lint       # Run ESLint
npm test           # Run the Vitest suite once
npm run test:watch # Run Vitest in watch mode
```

## Project Structure

```text
app/                 Next.js pages and API routes
components/board/    Scenario builder and board interactions
components/viewer/   Scenario playback, decisions, and scoring
components/shell/    Shared application navigation and layout
components/dashboard User scenarios, bookmarks, and playlists
lib/                 Authentication, Prisma, and shared utilities
prisma/              Database schema and migrations
store/               Zustand scenario-builder state
types/               Shared TypeScript domain types
```

## Main Routes

- `/` — published scenario library
- `/scenario/[id]` — interactive scenario player
- `/builder` — authenticated scenario builder
- `/dashboard` — scenarios, bookmarks, and playlists
- `/history` — completed training attempts
- `/search` — scenario search
- `/tutorial` — product walkthrough
- `/rules` — cEDH rules reference
- `/settings` — account and history preferences

## Data Model

TrainingARK stores users, scenarios, scenario events, completed attempts, bookmarks, and playlists in PostgreSQL. Scenario board state and decision sequences are stored as structured JSON, while searchable metadata and user relationships remain relational.

Deleting a scenario does not erase another player's training history, bookmarks, or playlists. Those records retain a snapshot of the scenario title so the user's library remains understandable.

## Vision

Live tournament experience is expensive and many important cEDH mistakes are difficult to recognize after a game. TrainingARK aims to make those moments visible by giving players a free place to share real situations, compare decisions, and deliberately practice competitive play.
