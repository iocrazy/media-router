# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**蚁小二 (Yi Xiaoer)** - A multi-platform social media content management and publishing system.

MVP scope: Douyin-first, accounts + publish + records only.

## Technology Stack

### Frontend
- React 19 + TypeScript + Vite
- Tailwind CSS 4.0
- React Router v7
- Supabase JS client

### Backend
- FastAPI (Python)
- Supabase (PostgreSQL + Auth + Storage + RLS)
- httpx (async HTTP), Pydantic (validation)

## Commands

```bash
# Frontend
cd frontend
npm install
npm run dev          # http://localhost:5173

# Backend
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload  # http://localhost:8000

# API docs available at http://localhost:8000/docs
```

## Project Structure

```
meida-router/
├── frontend/
│   └── src/
│       ├── pages/           # Login, Accounts, Publish, Tasks
│       ├── components/      # Reusable components
│       ├── services/api.ts  # Backend API client
│       └── lib/supabase.ts  # Supabase client
├── backend/
│   └── app/
│       ├── api/             # auth.py, accounts.py, tasks.py
│       ├── core/            # config.py, supabase.py
│       ├── models/          # Pydantic schemas
│       ├── services/        # douyin.py (platform API)
│       └── main.py          # FastAPI app
└── supabase/
    └── migrations/          # SQL setup scripts
```

## Key Files

- `backend/app/api/auth.py` - Douyin OAuth flow
- `backend/app/api/tasks.py` - Video publishing logic
- `backend/app/services/douyin.py` - Douyin API wrapper
- `frontend/src/pages/Publish.tsx` - Video upload and publish UI
- `supabase/migrations/001_initial_schema.sql` - Database schema

## Database Tables

- `social_accounts` - Bound Douyin accounts with tokens
- `publish_tasks` - Publishing job records
- `task_accounts` - Per-account publish status

## Setup

1. Create Supabase project at supabase.com
2. Run `supabase/migrations/001_initial_schema.sql` in SQL Editor
3. Copy `.env.example` to `.env` in both frontend and backend
4. Register Douyin developer account at open.douyin.com
5. Configure OAuth redirect URI: `http://localhost:8000/api/auth/douyin/callback`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/douyin` | Redirect to Douyin OAuth |
| GET | `/api/auth/douyin/callback` | OAuth callback handler |
| GET | `/api/accounts` | List user's accounts |
| DELETE | `/api/accounts/{id}` | Unbind account |
| POST | `/api/accounts/{id}/refresh` | Refresh expired token |
| POST | `/api/tasks` | Create and publish video |
| GET | `/api/tasks` | List publish records |
| GET | `/api/tasks/{id}` | Get task details |
