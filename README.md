# Kenshinpro — AI Football Coach Decision System

An AI-powered decision system for Chinese football coaches. Generates personalized training plans, tactical analyses, and session designs.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript 5, Tailwind CSS
- **Visuals:** Fabric.js 5 (tactical whiteboard)
- **Backend:** Supabase (auth + PostgreSQL)
- **AI:** Doubao (ByteDance Volcano Ark) / DeepSeek (auto-fallback)
- **Deployment:** Vercel (kenshin-pro.vercel.app)

## Key Features

- **AI Training Generation** — SSE-streamed personalized training plans (warmup, physical, technical, tactical, nutrition) tailored to athlete position, age, gender, and fitness level.
- **Tactical Diagnosis** — Interactive Fabric.js canvas for drawing and analyzing tactical scenarios.
- **Sequential Training Table** — Structured session plans with warmup, activities, small-sided games, and cooldown.
- **Scene System** — Context-aware generation for pre-season, competition, recovery, and injury-rehab phases.
- **Roster Management** — Excel import for team rosters with injury tracking integration.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment

Set the following environment variables (`.env.local`):

- `ARK_API_KEY` — Doubao API key
- `DEEPSEEK_API_KEY` — DeepSeek API key (fallback)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key

## License

Private project — all rights reserved.
