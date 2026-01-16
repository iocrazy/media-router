# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**蚁小二 (Yi Xiaoer)** - A multi-platform social media content management and publishing system. Currently in pre-development stage with only requirements documentation (需求.md).

The platform enables users to manage and publish content across 15+ social media platforms (Douyin, Kuaishou, Xiaohongshu, Bilibili, Weibo, YouTube, TikTok, Instagram, etc.) with features for analytics, team collaboration, and asset management.

## Technology Stack

### Frontend
- React 19.2.3 + TypeScript 5.9.3 + Vite 7.3.1
- Tailwind CSS 4.0 + Radix UI (headless components)
- Zustand (state management), React Router v7, TanStack Query v5
- React Hook Form + Zod (forms/validation), Recharts (charts)

### Backend
- FastAPI (Python) - chosen for pandas/numpy data analysis, auto OpenAPI docs, cleaner OAuth handling, LangChain ecosystem
- Supabase (PostgreSQL + Auth + Storage + RLS)
- APScheduler or Celery (scheduled tasks), httpx (async HTTP), Pydantic (validation)

## Commands (To Be Implemented)

```bash
# Frontend
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # TypeScript checking

# Backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload  # Development server
pytest                                    # Run tests
```

## Architecture

### Core Modules
1. **Dashboard** (`/web/dashboard`) - Quick publish actions, account status, 30-day trends, membership info
2. **Publish** (`/web/publish`, `/web/tasks`) - Multi-platform publishing with drafts, scheduling, platform-specific settings
3. **Accounts** (`/web/accounts`) - OAuth-based account binding, grouping, status management
4. **Analytics** (`/web/overview`) - Account/content stats via official Creator Center APIs (not scraping)
5. **Team** (`/web/team`) - Role-based access (owner/admin/member), invitations, quotas
6. **Assets** (`/web/asset-library`) - Media storage via Supabase Storage

### Key Patterns
- **OAuth Flow**: User authorizes → system stores encrypted tokens → calls platform Creator Center APIs
- **Data Sync**: Hourly API polling via APScheduler, daily snapshot aggregation
- **Publishing**: draft → pending → publishing → completed/failed, with per-platform customization
- **Security**: Token encryption, Supabase RLS for team isolation, API signature verification

### Planned Directory Structure
```
# Frontend (src/)
components/ui/        # Base UI (Button, Modal, etc.)
components/layout/    # Sidebar, Header, PageContainer
pages/               # Dashboard, Publish, Accounts, Overview, Team, Assets, Auth
stores/              # Zustand state
services/            # API layer
types/               # TypeScript definitions

# Backend (app/)
api/v1/              # auth, teams, accounts, tasks, assets, stats endpoints
core/                # config, security, supabase client
services/platforms/  # Per-platform API wrappers (douyin.py, kuaishou.py, etc.)
jobs/                # Scheduled tasks
```

## Platform Integration Notes

- Each platform requires separate developer account and OAuth app registration
- Enterprise certification needed for Douyin, Kuaishou
- Key scopes needed: user_info, video.create, video.data (varies by platform)
- Token refresh must be handled automatically before expiration
- Rate limiting varies by platform - implement request throttling

## Database

Core tables: `teams`, `team_members`, `social_accounts`, `publish_tasks`, `task_accounts`, `account_stats_daily`, `content_stats`, `assets`, `asset_folders`

All tables use Supabase RLS policies for team-based data isolation.
