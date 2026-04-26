# Vienna — Product Overview

## What It Is

Vienna is a programmable desktop IDE for AI-assisted software development. It wraps Claude Code (and other AI providers) into a local-first Electron app where developers bring their own API keys (BYOK), maintain full control over permissions and data, and orchestrate AI agents across projects with persistent, stateful workspaces.

It is not a chat wrapper. It is an orchestration platform — agents get scoped permissions, isolated git worktrees, scheduled routines, and extensible tool access. The developer stays in control of what agents can see, touch, and do.

## The Problem

AI coding tools today force tradeoffs developers shouldn't have to make:

- **Vendor lock-in** — Copilot ties you to GitHub/OpenAI; Cursor ties you to their backend. Switch providers? Start over.
- **Black-box agents** — Most tools hide what agents are doing, what context they have, and what tools they can access. Developers lose visibility and trust.
- **No persistent state** — Conversations are disposable. There's no way to maintain long-running project context, link to external issues, or resume where you left off.
- **No automation** — AI chat is reactive. There's no way to schedule agents to run reviews, checks, or maintenance tasks on their own.

## What Vienna Does Differently

**Provider-agnostic agents.** Switch between Claude, Gemini, and Codex without re-architecting. Your workflow survives model changes.

**Workstreams.** Each task gets an isolated workspace — bound directories, a dedicated git worktree, linked GitHub/Linear issues, full message history. Context persists across sessions. Work doesn't bleed between projects.

**Granular permissions.** Control exactly which tools agents can use, per-project or per-workstream. Presets range from restrictive to autonomous, with custom rules for anything in between.

**Routines and automation.** Schedule prompts on cron or interval. Agents can run code reviews, check CI status, or triage issues autonomously — creating their own workstreams and reporting back.

**Extensible entity system.** Link workstreams to GitHub issues, Linear tasks, or custom entity types through a plugin registry. Agents get structured context about what they're working on.

**Local-first and transparent.** API keys live in the OS keychain. No telemetry by default. All data stays on your machine. You own everything.

## The Space

Vienna operates at the intersection of **developer tools** and **AI agent infrastructure**. The market is moving from AI-as-autocomplete (Copilot, tab-completion) toward AI-as-agent (autonomous coding, multi-step task execution). Vienna targets the control layer — the part that decides what agents can do, what they know, and how they fit into real engineering workflows.

Competitors include Cursor (AI-native editor), Windsurf (Codeium's IDE), and GitHub Copilot Workspace. Vienna differentiates by being provider-agnostic, local-first, and programmable rather than opinionated.

## Ideal Customer Persona

**Primary: Professional developers and small engineering teams** who are already using AI coding tools but frustrated by lack of control, context loss between sessions, and vendor lock-in. They want to use the best model for the job without switching tools. They care about privacy, transparency, and the ability to customize their workflow.

**Secondary: Privacy-conscious engineers and enterprise teams** who cannot send code to third-party-hosted AI services. BYOK means the data path goes directly from their machine to the API provider — Vienna never sees the code.

**Tertiary: Teams building AI-assisted workflows** — automating code reviews, PR triage, dependency updates, or recurring checks. These users treat AI agents as team members that need proper scoping, scheduling, and accountability.

## Business Model

Vienna is free. Instead of charging users, the project asks developers to donate to a non-profit of their choice — any organization, any amount. If enterprise features are built in the future, 30% of that revenue goes to non-profits. This is a values-driven model designed to build trust and community during the early-adopter phase.

## Tech Stack (For Agent Context)

- **Desktop app**: Electron + React 19 + TypeScript + SQLite
- **Data layer**: GraphQL (Pothos schema) + Apollo Client
- **Web backend**: Next.js + PostgreSQL + Prisma
- **IPC**: Custom Zod-validated type-safe framework
- **Monorepo**: pnpm workspaces + Turborepo
- **Current version**: v0.0.6 — early stage, macOS only (Windows/Linux coming)

## One-Line Summary

Vienna is a local-first, provider-agnostic IDE for orchestrating AI coding agents with persistent workspaces, granular permissions, and built-in automation — designed for developers who want control over their AI tools, not the other way around.
