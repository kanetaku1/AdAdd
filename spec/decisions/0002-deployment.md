# ADR-0002: Deployment — Vercel as a Mock-Only Preview

## Status

Accepted — 2026-10-08

---

## Context

At this stage, AdAdd is operated as follows:

* The original business data lives in a MySQL instance on a local machine.
* `apps/api` (Go/Echo) runs locally against that MySQL.
* `apps/web` (Next.js) reads and writes data only through `apps/api`.

No deployment target was recorded in the specification.
`spec/architecture.md` only described local development (Docker Compose).

Meanwhile, the GitHub repository had been connected to Vercel, which
automatically deploys every pushed branch:

* Pushes to any branch created Preview deployments.
* On 2026-08-29, `feat/committee-mock-preview` (not merged into `main`) was
  deployed to Production so committee members could try the UI with mock data.
* On 2026-09-04, `main` was deployed to Production.

Because `apps/api` and MySQL are not reachable from Vercel, these deployments
could only ever show the in-memory mock data (`NEXT_PUBLIC_API_BASE_URL` unset).
Their purpose and limits had not been agreed or documented.

---

## Decision

### Vercel is a mock-only preview

Vercel is used only to let committee members try the UI with mock data.

* Every Vercel environment (Production and Preview) runs in mock mode:
  `NEXT_PUBLIC_API_BASE_URL` is never set on Vercel.
* Vercel never connects to `apps/api` or MySQL, and never holds business data.
* The Vercel Production Branch is `main`.
  Deploying unmerged branches to Production is not allowed.
* The mock mode behavior (login skipped, persistent "not production" banner)
  is defined in `spec/frontend.md`.

### Production deployment is undecided

How AdAdd will be deployed for real operation is **not decided** by this ADR.

Candidates (Vercel, Cloudflare, or others) will be evaluated carefully in a
separate ADR before any deployment connects to real business data.

That ADR must answer at least:

* Where `apps/api` runs, and how it reaches the MySQL that is the
  Single Source of Truth (NFR-006).
* How authentication and authorization are enforced for every protected
  resource (NFR-003).
* Who may access the deployment, and how access is restricted.
* How MySQL is backed up.

---

## Reasons

### Business data must stay in the Single Source of Truth

MySQL is the Single Source of Truth (NFR-006).
Exposing it to an external host is a significant decision that affects
security and operations, so it must not happen implicitly through a
repository integration.

### A mock preview is sufficient for the current stage

The current need is for committee members to see and try the workflow.
Mock data meets this need without exposing any real company or payment data.

### Explicit is better than implicit

Automatic deployments without a documented purpose caused confusion about
why AdAdd was already "deployed". Recording the purpose and limits prevents
the preview from being mistaken for production.

---

## Consequences

* `spec/architecture.md` Infrastructure section references this ADR.
* `apps/web/.env.example` notes that `NEXT_PUBLIC_API_BASE_URL` must not be set on Vercel.
* Vercel project settings are aligned with this ADR (Production Branch = `main`,
  no `NEXT_PUBLIC_API_BASE_URL` in any environment).
* Mock data must remain fictitious. Real company names, people, or payment
  data must never be added to `apps/web/src/lib/mock/`.
* A future ADR will decide the production deployment and supersede the
  relevant parts of this one.
