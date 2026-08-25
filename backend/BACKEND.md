# Backend developer guide

This is the API server for the LMS Trainer Portal: Fastify + TypeScript, talking directly to
PostgreSQL with parameterized SQL (no ORM). If you're new to this codebase, read this top to
bottom once — it's short — then use it as a reference while you work.

## Why no ORM

The schema is small and stable enough (11 tables) that an ORM would add a layer of indirection
without much payoff. Every query lives in the route file that uses it, in plain SQL, so you can
read a route top-to-bottom and see exactly what it does to the database. If the schema grows
substantially, revisit this decision — Prisma or Drizzle would pay for themselves at a larger
scale.

## Tech stack

| Piece | Choice | Why |
|---|---|---|
| Web framework | [Fastify](https://fastify.dev) | Fast, schema-friendly, first-class plugin model |
| Language | TypeScript (strict mode) | Catch shape mismatches between routes and the DB at compile time |
| Database driver | [`pg`](https://node-postgres.com) | Thin wrapper over libpq, full control over SQL |
| Real-time | `@fastify/websocket` | Pushes live event-log updates to the trainer's browser |
| Dev runner | `tsx` | Runs TypeScript directly without a separate build step in dev |

## Folder structure

```
backend/
├── migrations/
│   └── 001_init.sql          Full schema — run once against a fresh database
├── seed/
│   └── seed.sql               Demo data matching the original wireframes
├── scripts/
│   ├── migrate.ts             Runs every .sql file in migrations/, in filename order
│   └── seed.ts                 Runs seed.sql
├── src/
│   ├── server.ts               Entry point: registers plugins + routes, starts listening
│   ├── db.ts                    The single shared `pg` connection pool
│   ├── plugins/
│   │   └── eventBus.ts          In-process pub/sub used for live event-log streaming
│   └── routes/
│       ├── courses.ts
│       ├── modules.ts
│       ├── batches.ts
│       ├── trainees.ts
│       ├── attempts.ts
│       ├── analytics.ts
│       └── chat.ts
├── .env.example
├── package.json
└── tsconfig.json
```

Each file in `routes/` is a Fastify plugin registered under a URL prefix in `server.ts` — e.g.
everything in `courses.ts` is mounted under `/api/courses`. There's no separate
controller/service/repository split; at this size, route handler → SQL query is direct and easy
to follow. If a query starts being reused across multiple routes, that's the signal to extract a
`repositories/` layer.

## Data model

Read `migrations/001_init.sql` for the authoritative schema. The mental model:

- A **course** is made of several **modules**, linked via `course_modules` (many-to-many, with
  `sort_order`). Both courses and modules can declare prerequisites on themselves
  (`course_prerequisites`, `module_prerequisites`).
- A **batch** is one scheduled *run* of a course (e.g. "Course 1 / Batch 10", 9 Aug – 31 Aug).
  Trainees are enrolled into a batch via `batch_trainees`, not directly into a course — this is
  what lets the same course run multiple times with different cohorts.
- A **module attempt** (`module_attempts`) is the unit everything else hangs off: one trainee's
  attempt number N at one module, within one batch. It carries `status`
  (`to_do` / `in_progress` / `completed` / `failed`), `score`, and an `is_live` flag that marks
  "this trainee is doing this right now."
- **Performance indicators** (`performance_indicators`) are defined per module (the rows you see
  in the Module 1 performance table — Task Completion, Critical Safety Errors, etc.), and scored
  per attempt in `attempt_indicator_scores`.
- **Event logs** (`event_logs`) belong to a single attempt — this is what powers the Live Event
  Logs panel on the trainee page.
- **Reports** (`reports`) hold the free-text analysis + suggestions shown on the module and
  cohort analysis pages. In this codebase they're hand-seeded; in production you'd have a job
  that (re)generates them from the underlying attempt/event data, possibly via an LLM call.
- **Chat messages** (`chat_messages`) are a flat log of the Chat page conversation.

```
courses ──< course_modules >── modules
   │                              │
   └─< course_prerequisites       └─< module_prerequisites
   │
   └─< batches ──< batch_trainees >── trainees
          │                              │
          └──────< module_attempts >─────┘
                        │
                        ├─< attempt_indicator_scores >── performance_indicators
                        └─< event_logs
```

## Request lifecycle

`server.ts` is the only file that wires things together:

1. Register `@fastify/cors` (origin from `CORS_ORIGIN` env var — the Angular dev server by
   default) and `@fastify/websocket`.
2. Register each route file under its `/api/...` prefix.
3. Listen on `PORT`/`HOST` from env.

Every route handler follows the same shape: read `req.params` / `req.query` / `req.body`
(cast to a local inline type — there's no request-schema validation library in use, see
"Things intentionally left out" below), run one or more SQL queries via the shared `pool` from
`db.ts`, shape the result into the JSON the frontend expects, return it. Fastify serializes the
return value automatically.

## Live event logs (WebSocket)

This is the one place the backend does something more interesting than CRUD, so it's worth
understanding end to end.

1. `eventBus.ts` exports a single Node `EventEmitter` shared by the whole process. Channels are
   named `attempt:${attemptId}`.
2. `attempts.ts` has `POST /:id/events` — when a new event log row is inserted, it also does
   `eventBus.emit('attempt:' + id, { type: 'event', event })`.
3. `attempts.ts` also has `GET /:id/live`, registered with `{ websocket: true }`. When the
   frontend opens a WebSocket to this route, the handler subscribes a listener to that attempt's
   channel and forwards anything emitted straight down the socket as JSON. It unsubscribes on
   `close`.
4. The frontend (`trainee-detail.component.ts`) opens this socket only when a trainee has a live
   attempt, and appends incoming events to the on-screen list in real time.

**Important limitation:** `eventBus` is in-memory, scoped to a single Node process. It works
perfectly for local dev and single-instance deployments. If you ever run multiple backend
instances behind a load balancer, an event ingested on instance A will never reach a trainer
whose WebSocket landed on instance B. At that point, swap `eventBus` for Redis pub/sub or NATS —
the emit/listen interface in `attempts.ts` wouldn't need to change, just what's underneath it.

You can manually trigger a live event from the command line to see this working:

```bash
curl -X POST http://localhost:3000/api/attempts/<attempt_id>/events \
  -H "Content-Type: application/json" \
  -d '{"event_type":"step_complete","description":"Step 6 complete","is_error":false}'
```

## Chat endpoint

`routes/chat.ts` does one of two things depending on whether `ANTHROPIC_API_KEY` is set in the
environment:

- **Not set (default):** `ruleBasedReply()` pattern-matches on a handful of phrases ("how many
  trainees", "active batch", "average score", "needs attention") and answers them with a direct
  SQL query. Anything else falls back to a generic summary of current DB stats.
- **Set:** `anthropicReply()` calls the real Anthropic Messages API, with a short summary of
  current database stats injected into the system prompt so the model has some grounding. If
  that call throws (network issue, bad key), it falls back to the rule-based responder rather
  than erroring out to the user.

Every message (both user and assistant) is persisted to `chat_messages`, so `GET /chat/history`
gives you the full transcript on page load.

## Environment variables

See `.env.example`. The two that matter day-to-day:

- `DATABASE_URL` (or the discrete `PGHOST`/`PGUSER`/etc. vars if you don't set this) — see `db.ts`
- `CORS_ORIGIN` — must match wherever the Angular app is actually running, or the browser will
  block every request silently (check the Network tab, not just the Console, if requests seem to
  vanish)

## Running it locally

```bash
cp .env.example .env      # adjust DB credentials if needed
npm install
npm run migrate           # applies migrations/*.sql, in order
npm run seed                # loads seed/seed.sql
npm run dev                  # tsx watch — restarts on file changes
```

`npm run build` compiles to `dist/` with `tsc`; `npm start` runs the compiled output — that's
the path for a real deployment, since `tsx` is a dev convenience, not something you want fronting
production traffic.

## API reference

All routes are prefixed with `/api`. Request/response bodies are JSON unless noted.

### Courses — `/api/courses`

| Method & path | Purpose |
|---|---|
| `GET /` | All courses, plus every batch (for the Courses management page) |
| `GET /:id` | One course with its modules, prerequisites, and batches |
| `POST /` | Create a course. Optional `module_ids[]`, `prerequisite_course_ids[]`. If `trainee_ids[]` is given, also creates a `Batch 1` and enrolls them. |
| `PUT /:id` | Partial update (any field omitted is left unchanged) |
| `DELETE /:id` | Cascades to `course_modules`, `batches`, etc. via FK `ON DELETE CASCADE` |

### Modules — `/api/modules`

| Method & path | Purpose |
|---|---|
| `GET /` | All modules |
| `GET /:id` | One module with prerequisites + performance indicators |
| `POST /` | Create a module. Optional `prerequisite_module_ids[]` |
| `PUT /:id` | Partial update |
| `DELETE /:id` | |
| `POST /:id/performance-indicators` | Add a scoring indicator (`name`, `measurement`, `weight`) |

### Batches — `/api/batches`

| Method & path | Purpose |
|---|---|
| `GET /?status=active\|upcoming` | List batches, optionally filtered by date range |
| `GET /:id` | Full batch detail: per-module average progress, per-trainee progress % and status dot (`live` / `attention` / `ok`) |
| `POST /` | Create a batch (`course_id`, `name`, `start_date`, `end_date`, optional `trainee_ids[]`) |
| `PUT /:id` | Partial update |
| `DELETE /:id` | |
| `POST /:id/trainees` | Enroll one trainee (`trainee_id`) |
| `DELETE /:id/trainees/:traineeId` | Un-enroll |

The trainee `status` field on `GET /:id` is computed, not stored: `live` if any attempt has
`is_live = true`, else `attention` if they have a completed attempt scoring under 70 or any
error-flagged event log, else `ok`.

### Trainees — `/api/trainees`

| Method & path | Purpose |
|---|---|
| `GET /` | All trainees |
| `POST /` | Create (`name`, optional `email`) |
| `GET /:id` | One trainee |
| `PUT /:id` | Partial update |
| `DELETE /:id` | |
| `GET /:id/batches/:batchId` | The trainee-detail page payload: overall stats, full learning path (one row per module attempt, in course order), and — if they have a live attempt — its event log so far |

### Attempts — `/api/attempts`

A "module attempt" is the trainee × module × batch record described above.

| Method & path | Purpose |
|---|---|
| `GET /:id` | Full attempt detail: performance indicators + scores, past attempts by the same trainee on the same module, and the generated report if one exists |
| `POST /` | Start a new attempt (`trainee_id`, `module_id`, `batch_id`). Attempt number is computed automatically; marks `is_live = true` |
| `PUT /:id` | Update `status` / `score` / `is_live`. Setting status to `completed` or `failed` stamps `completed_at`. Emits on the event bus so any open live WebSocket sees the status change |
| `GET /:id/events` | Full event log for this attempt |
| `POST /:id/events` | Append an event (`event_type`, `description`, `is_error`). Broadcasts to the live WebSocket |
| `GET /:id/live` *(WebSocket)* | Subscribes the caller to this attempt's live event stream |

### Analytics — `/api/analytics`

| Method & path | Purpose |
|---|---|
| `GET /dashboard` | Home-page stats: totals, completion rate, average score, enrolment-by-category, recent activity feed |
| `GET /attention` | Modules and cohorts that have a generated report (used as the proxy for "needs attention" on the Analytics landing page) |
| `GET /modules/:id?batchId=` | In-depth module analysis: average score, pass rate, attempt count, report. `batchId` scopes stats to one cohort; omit it for all-time stats |
| `GET /cohorts/:batchId` | In-depth cohort analysis: average score, pass rate, hardest module, trainees with flagged error events, report |

### Chat — `/api/chat`

| Method & path | Purpose |
|---|---|
| `GET /history` | Full chat transcript, oldest first |
| `POST /` | Send a message (`message`, optional `trainer_id`). Returns the assistant's reply and persists both sides |

## Things intentionally left out (and where to add them)

This is a demo/reference implementation matched to a wireframe, not a production system. Notable
gaps, in rough order you'd likely tackle them:

- **No authentication.** Every request acts as the implicit "Trainer X." Add a real auth layer
  (session cookies or JWTs) and thread a `trainerId` through requests before exposing this beyond
  localhost.
- **No request body validation.** Route handlers cast `req.body` to a TypeScript type but don't
  validate it at runtime — a malformed request will fail with a raw Postgres error rather than a
  clean 400. Fastify has first-class JSON Schema validation (`schema: { body: ... }` per route);
  worth adding once the API surface stabilizes.
- **No pagination.** `GET /trainees`, `GET /modules`, etc. return everything. Fine at seed-data
  scale, not fine at thousands of rows.
- **Reports are static.** They're seeded text, not generated from live data. A real version would
  have a background job (cron, or triggered on attempt completion) that recomputes stats and
  regenerates the `content`/`suggestions` text, plausibly via an LLM call.
- **`eventBus` doesn't scale horizontally** — see the Live event logs section above.
