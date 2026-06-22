---
name: sildram-secret-scanning
description: Local secret-scanning workflow for Sildram Studio. Use before commit, push, GitHub publication, Vercel deploys, or when changing .env handling, data storage, leads, chat sessions, visitor IDs, tokens, or security preflight scripts.
---

# Sildram Secret Scanning

Use this skill before preparing Sildram Studio changes for GitHub or Vercel.

## Required Check

Run:

```bash
npm run security:preflight
```

If it fails, stop and fix the flagged file before commit or push.

## What Must Stay Out Of Git

- `.env`
- `.env.*` except `.env.example`
- `data/*.json`
- `data/*.ndjson`
- `data/leads.json`
- `data/unanswered.json`
- `data/chat-sessions.json`
- real leads, contacts, visitor IDs, chat sessions, and client data
- API keys, service tokens, private keys, database URLs, and webhook secrets

## Manual Review

- Confirm `.env.example` contains placeholders only.
- Confirm `data/.gitkeep` is the only committed runtime data file.
- Confirm no staged file contains OpenAI, Resend, Turnstile, GitHub, Vercel, Supabase, Stripe, Postgres, JWT, or private key secrets.
- If there is any doubt, stop and ask the user before committing.

## Hook Setup

Enable the local hook with:

```bash
git config core.hooksPath .githooks
```

Do not install Husky, Gitleaks, Python packages, or additional npm dependencies for this project-level check.
