# Frontend developer guide

Angular 18, standalone components (no `NgModule`s), talking to the Fastify backend over plain
`HttpClient` calls. If you're new to this codebase, this doc plus 10 minutes reading
`app.routes.ts` and one page component should be enough to start making changes confidently.

## Why standalone components, no NgRx/state library

The app is a read-mostly dashboard: almost every page fetches its own data in `ngOnInit` and
renders it. There's no cross-page shared mutable state that would justify a state management
library — each component owns its own data. If that changes (e.g. you add optimistic updates that
need to be visible across multiple open views), that's the signal to introduce something like
signals-based shared services or NgRx, not before.

## Folder structure

```
frontend/
├── angular.json                 Build/serve configuration (Angular CLI)
├── src/
│   ├── index.html                 Single HTML shell — <app-root> mounts here
│   ├── main.ts                     Bootstraps AppComponent with appConfig
│   ├── styles.css                  Global design system — see "Styling" below
│   ├── environments/
│   │   ├── environment.ts           Dev config (points at localhost:3000)
│   │   └── environment.prod.ts
│   └── app/
│       ├── app.component.ts         Shell: sidebar nav + topbar slot + <router-outlet>
│       ├── app.config.ts             Providers: router, HttpClient
│       ├── app.routes.ts             Every route, lazy-loaded
│       ├── models/
│       │   └── models.ts              TypeScript interfaces mirroring backend JSON shapes
│       ├── services/
│       │   └── api.service.ts          The only place HTTP calls are made
│       ├── shared/
│       │   └── page-header.component.ts  Reusable topbar (title + date + search)
│       └── pages/
│           ├── dashboard/
│           ├── courses/
│           ├── course-form/
│           ├── module-form/
│           ├── batch-detail/
│           ├── learners/
│           ├── trainee-detail/
│           ├── attempt-detail/
│           ├── analytics/
│           ├── module-analysis/
│           ├── cohort-analysis/
│           └── chat/
```

Each folder under `pages/` holds exactly one component file, named `<page>.component.ts`, with
its template and (where used) styles inline in the `@Component` decorator rather than split into
separate `.html`/`.css` files. That's a deliberate choice for this app's size — every template is
short enough to read in one screen. If a template grows past ~100 lines, pull it into a
`templateUrl` file instead.

## Routing

`app.routes.ts` lazy-loads every page via `loadComponent`, so the initial bundle only contains the
shell — each page's JS is fetched on navigation. Route table:

| Path | Component | Wireframe page |
|---|---|---|
| `/` | `DashboardComponent` | Dashboard home |
| `/courses` | `CoursesComponent` | Courses management (active/upcoming/available) |
| `/courses/new` | `CourseFormComponent` | Create Course |
| `/modules/new` | `ModuleFormComponent` | Create Module |
| `/batches/:batchId` | `BatchDetailComponent` | Batch: module + trainee progress |
| `/learners` | `LearnersComponent` | Learners / batch list |
| `/batches/:batchId/trainees/:traineeId` | `TraineeDetailComponent` | Trainee detail + live event log |
| `/attempts/:attemptId` | `AttemptDetailComponent` | Trainee × module performance report |
| `/analytics` | `AnalyticsComponent` | Analytics landing / attention thumbnails |
| `/analytics/modules/:moduleId` | `ModuleAnalysisComponent` | In-depth module analysis |
| `/analytics/cohorts/:batchId` | `CohortAnalysisComponent` | In-depth cohort analysis |
| `/chat` | `ChatComponent` | Chat |
| `**` | redirects to `/` | |

`AppComponent` renders the sidebar (with `routerLinkActive` highlighting the current section) and
a `<router-outlet>` for everything else. Each page component renders its own
`<app-page-header>` at the top — there's no shared layout wrapper beyond the sidebar, so every
page is free to lay out its `.content` however it needs to.

## Data flow: `ApiService`

`services/api.service.ts` is the single HTTP boundary — no component calls `HttpClient` directly.
Every method returns an `Observable` and maps 1:1 to a backend route (see `BACKEND.md` in the
backend package for the full endpoint list). Components subscribe in `ngOnInit`:

```typescript
ngOnInit() {
  this.api.getDashboard().subscribe((s) => (this.stats = s));
}
```

There's no shared caching layer — navigating back to a page re-fetches. That's fine for this data
volume; if you add caching, do it inside `ApiService` (e.g. `shareReplay`) so components don't
need to know about it.

`models/models.ts` defines the TypeScript shape of every API response. These are hand-written to
match the backend's JSON output, **not** auto-generated — if you change a backend route's
response shape, you need to update the matching interface here too. Keep them in sync or you'll
get silent `undefined`s in templates rather than compile errors (TypeScript trusts the interface,
not the actual network response).

## Live event logs (WebSocket)

`trainee-detail.component.ts` is the one component that does more than fetch-and-render. When the
trainee detail payload comes back with a `live_attempt_id`, it opens a WebSocket via
`api.liveSocket(attemptId)` (`services/api.service.ts` → `new WebSocket(...)`) and appends any
incoming `{ type: 'event', event }` message to the on-screen `events` array. The socket is closed
in `ngOnDestroy` — don't remove that, or navigating away from a live trainee page leaves the
connection open.

If you need this pattern elsewhere (e.g. a live dashboard-wide activity feed), pull the
connect/reconnect/cleanup logic out of the component and into a small injectable service rather
than copy-pasting it — this component currently doesn't handle reconnection on drop, which is
worth fixing centrally if a second consumer needs it.

## Forms

`course-form` and `module-form` use Angular's `ReactiveFormsModule` (`FormBuilder`, `formGroup`).
Both follow the same pattern: a `FormGroup` for the plain fields, plus a plain `Set<number>` for
multi-select chip pickers (modules, trainees, prerequisites) that doesn't need full reactive-forms
machinery for a toggle-on-click list. On submit, the form value and the selected-ID sets are
merged into one payload and posted via `ApiService`.

## Styling

There's no component library (no Material, no Tailwind) — `src/styles.css` is a small hand-rolled
design system: CSS custom properties for color/spacing/radius, plus a set of reusable utility
classes (`.card`, `.btn`, `.badge`, `.progress-track`, `.list-row`, table styles, form field
styles, etc.) that every page composes from directly in its inline template. If you're building a
new page, look for an existing class before writing new CSS — the vocabulary is intentionally
small.

Key tokens (all in `:root` in `styles.css`):

| Variable | Use |
|---|---|
| `--ink`, `--ink-soft`, `--ink-faint` | Text, in decreasing emphasis |
| `--paper`, `--surface` | Page background vs. card background |
| `--accent` | The one brand color (route-marker green) — used sparingly, mostly for progress bars and the "live"/"ok" status dot |
| `--amber`, `--red`, `--blue` | Semantic only — warnings, errors/attention, informational badges. Not decorative |
| `--radius-sm/md/lg` | Corner rounding, small buttons → large cards |

Status dots (`.dot-live`, `.dot-ok`, `.dot-attention`) and badges (`.badge-green`, `.badge-amber`,
`.badge-red`, `.badge-blue`) are the main place color carries meaning — everywhere else stays
close to monochrome, matching the original wireframe's restraint.

## Running it locally

```bash
npm install
npm start        # ng serve, http://localhost:4200
```

Requires the backend running at the URL in `src/environments/environment.ts`
(`http://localhost:3000/api` by default) — see the backend's own README/`BACKEND.md` for how to
start it. If API calls fail silently, check the browser's Network tab for CORS errors first; the
backend's `CORS_ORIGIN` env var has to match the origin Angular is actually served from.

`npm run build` produces a production bundle in `dist/lms-frontend/browser/`, servable by any
static file host. `frontend/src/environments/environment.prod.ts` controls what API URL that build
points at — update it before deploying if the backend isn't on `localhost:3000`.

## Adding a new page — checklist

1. Create `pages/<name>/<name>.component.ts` as a standalone component (`standalone: true`,
   explicit `imports: [...]`).
2. Add any new response shape to `models/models.ts`.
3. Add the corresponding method to `ApiService` if the backend route doesn't have one yet.
4. Add a lazy route in `app.routes.ts`.
5. Link to it from wherever makes sense (sidebar in `app.component.ts` for a top-level section,
   or a `routerLink` from a related page for a detail view).
6. Reuse existing CSS classes from `styles.css` before adding new ones.

## Things intentionally left out (and where to add them)

- **No route guards / auth.** Every route is publicly reachable. Add an `authGuard` function in
  `app.routes.ts` once the backend has real authentication.
- **No error UI.** `ApiService` calls that fail just leave the page's data `null` (stuck on the
  loading state) — there's no toast/banner for failed requests. Worth adding a shared error
  interceptor (`HttpInterceptorFn`) once this goes past demo stage.
- **No tests.** No `.spec.ts` files were written for this build. If you add testing, Angular's CLI
  defaults to Jasmine/Karma — component tests would mostly be "does it call the right `ApiService`
  method and render the response," which is quick to write given how thin these components are.
- **No global loading/skeleton state** beyond the individual `*ngIf="data"` guards already in each
  page — fine at this scale, but a shared skeleton component would reduce repetition if the app
  grows.
