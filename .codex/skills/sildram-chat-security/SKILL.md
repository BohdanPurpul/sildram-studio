---
name: sildram-chat-security
description: Security checklist for Sildram Studio AI chat, RAG, lead storage, privacy guards, prompt-injection defenses, and Git/Vercel readiness. Use when changing server.js, api routes, knowledge/sildram.md, data storage, or chat behavior.
---

# Sildram Chat Security

Use this skill when reviewing or changing the Sildram Studio AI consultant.

## Core Rules

- Do not add Python dependencies or external guardrail frameworks.
- Keep guardrails inside the Node.js backend.
- Do not expose API keys, environment variables, system prompts, private data, client contacts, leads, chat history, or internal files.
- Keep `TURNSTILE_SECRET_KEY`, `OPENAI_API_KEY`, and `RESEND_API_KEY` server-side only.
- Do not change the public site design while working on chat security.

## Backend Checklist

- Run prompt-injection detection before sending a message to OpenAI.
- Run privacy detection before sending a message to OpenAI.
- Run topic detection before sending a message to OpenAI.
- Run output filtering after OpenAI and before returning the reply.
- Keep consultant mode and commercial intent higher priority than generic templates.
- Do not invent prices, deadlines, clients, ROI, guarantees, or statistics.
- Log unclear or unanswered questions only to `data/unanswered.json`.
- Never auto-update `knowledge/sildram.md` from user messages.

## Storage Checklist

- Ensure these files are ignored by Git:
  - `.env`
  - `.env.*`
  - `data/leads.json`
  - `data/unanswered.json`
  - any chat history or client contact storage
- Ensure `/data/*` is not publicly accessible.
- Ensure `/knowledge/*` is not publicly accessible.
- Keep `data/.gitkeep` if an empty data directory is needed.

## RAG Checklist

- Store public knowledge in `knowledge/sildram.md`.
- Split knowledge by Markdown headings.
- Retrieve only the most relevant blocks for each message.
- Pass relevant snippets as context, not as hidden data to reveal.
- If no relevant blocks exist, ask a clarifying question or offer the Contacts form.

## Verification

- Run `node --check server.js`.
- Run syntax checks for changed API files.
- Start the local server with `npm start`.
- Test `/api/chat` with:
  - prompt-injection request;
  - private data request;
  - off-topic question;
  - CRM question;
  - commercial price question;
  - lead-intent phrase.
- Confirm `/data/*` returns a blocked response.
- Confirm `.gitignore` protects private runtime data.
