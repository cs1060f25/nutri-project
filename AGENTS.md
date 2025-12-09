# Harvard Eats – Agent Briefing

This document gives software agents and collaborators the operational context for the Harvard Eats project. Use it to understand the system boundaries, priorities, and guardrails before making autonomous changes.

## Mission & Current Focus
- Deliver a dining analytics platform for Harvard University Dining Services (HUDS) students to log meals, review nutrition plans, and sync data between local development servers and production serverless endpoints.
- Maintain parity between the Express-based backend under `backend/` (local development) and the Vercel serverless functions under `api/` (production deployment).
- Guard sensitive data: never commit `.env` files, API keys, or Firestore credentials.

## System Overview
- **Frontend (`frontend/`)**: React application that authenticates with Firebase, consumes HUDS APIs through local Express or Vercel endpoints, and renders nutrition dashboards and logging flows.
- **Backend for Local Dev (`backend/src/`)**: Express server that mirrors the serverless handlers, handles middleware authentication, and exposes REST endpoints for meal logging, HUDS data, profiles, and nutrition plans.
- **Serverless Production (`api/`)**: Vercel-compatible functions sharing business logic intent with Express controllers; this code ships to production.
- **Documentation (`docs/`)**: API specifications and Firestore schema references that double as source-of-truth contracts.

## Operating Modes
- **Local Development**: Run `npm run dev` from project root to launch both backend and frontend with live reload.
- **Production / Preview**: Vercel builds and deploys the `api/` serverless functions and the React static bundle. Ensure backend changes are mirrored in both environments.

## Collaboration Protocols
- Keep Express controllers/services and their serverless counterparts behaviorally identical. When updating one, update the other within the same change set.
- Follow Firebase security best practices; authentication middleware lives in `backend/src/middleware/authMiddleware.js` and should be kept lightweight.
- Prefer incremental, well-tested changes. If modifying shared DTOs or response formats, update client services and associated contract tests.
- Coordinate schema changes through `docs/firestore-schema.md` before modifying Firestore collections.

## Testing Instructions
- **Continuous integration**: No automated CI pipeline is configured yet. Before merging, run the manual test matrix described below and document results in your change notes. Setting up GitHub Actions or Vercel Checks to execute the same commands is a standing improvement task.
- **Run all Node installs**: `npm run install-all` (from repository root) ensures root, backend, and frontend dependencies are in sync.
- **Backend unit and integration tests**: `cd backend && npm test`. For targeted suites, use `npm run test:huds`, `npm run test:auth`, or `npm run test:api`.
- **Backend smoke syntax check**: `cd backend && npm run test:syntax` for quick regression detection in route wiring.
- **Frontend React tests**: `cd frontend && npm test -- --watch=false` (append `-- --coverage` for coverage reports). Ensure Jest DOM environment passes for UI changes.
- **Frontend linting / static analysis**: `cd frontend && npx eslint ./src --max-warnings=0`. If ESLint is not yet configured globally, add rule updates instead of skipping them.
- **Root formatting and type checks**: None enforced today; if you introduce Prettier or TypeScript, document the commands here.
- **When to update tests**: Update or add tests whenever you change public APIs, data contracts, critical workflows (meal logging, nutrition plans, auth), or introduce new regressions to catch edge cases. Keep fixtures realistic with HUDS data formats.
- **Do not edit existing tests** unless the user explicitly requests changes or they fail due to intentional behavior updates that you are implementing with stakeholder approval.
- **Documentation of results**: Record command outputs (pass/fail) in your PR description or task notes; include environment details when relevant.

## Observability & Debugging
- Monitor Express logs (stdout) during `npm run dev` sessions; they capture request metadata and error stacks.
- Use browser DevTools Network tab to inspect API calls. Response payloads should match schema definitions in `docs/firestore-schema.md`.

## Deployment Notes
- Vercel uses the root `vercel.json` and automatically builds `api/` + `frontend/`. Run `vercel --prod` locally to preview deployments when necessary.
- Keep environment variables synchronized between local `.env` files and Vercel project settings. Rotate keys promptly if leaked.

## Outstanding Risks & Watch Items
- Duplication between Express and serverless handlers invites drift; compare implementations periodically.
- HUDS external API rate limits and schema instability can break ingestion; safeguard with retry logic and logging.
- Firebase security rules must remain aligned with backend expectations; review whenever adding new Firestore collections.

Use this briefing as a living document—update it when architecture, processes, or testing expectations shift. Keep changes concise and accurate so autonomous agents can act safely.

