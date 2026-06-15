# Observability & Error Reporting

This document describes the observability stack and how to test it locally.

## Components added

- Micrometer + Prometheus: metrics exported at `/actuator/prometheus`.
- Sentry: optional error/reporting integration (backend & frontend). Provide `SENTRY_DSN` (backend) and `VITE_SENTRY_DSN` (frontend) env vars.
- Developer debug table: application records detailed error logs in `debug_error_log` (existing).

## How to run Prometheus + Grafana locally

1. Start the backend (make sure it's available as `backend:8080` in Docker network or change `prometheus.yml`).
2. From `deployment/monitoring` run:

```bash
docker compose -f docker-compose.prometheus.yml up -d
```

3. Open Prometheus at `http://localhost:9090` and Grafana at `http://localhost:3000` (default creds).
4. In Grafana import `grafana-dashboard-example.json` as a dashboard.

## How to test Sentry

Backend:

1. Set `SENTRY_DSN` as an environment variable and restart the backend. Also set `SENTRY_ENVIRONMENT` and `SENTRY_RELEASE` if you use releases.
2. (Optional) enable dev test endpoints: set `app.dev.enable-test-endpoints=true` (env var or `application.properties`) and call `GET /api/dev/throw` to generate a test exception which will be sent to Sentry.
3. To avoid leaking PII, the backend registers a Sentry `EventProcessor` that strips emails, cookies, Authorization headers and request bodies before sending.

Frontend:

1. Set `VITE_SENTRY_DSN` in your Vite environment (e.g., `.env` with `VITE_SENTRY_DSN=...`) and rebuild the frontend.
2. To upload source maps and associate releases automatically during CI or deploy, use the `@sentry/cli` or `sentry-cli` to create a release and upload source maps. CI example (conceptual):

```bash
# set SENTRY_AUTH_TOKEN and SENTRY_ORG / SENTRY_PROJECT
sentry-cli releases new $SENTRY_RELEASE
sentry-cli releases files $SENTRY_RELEASE upload-sourcemaps ./frontend/dist --url-prefix '~/'
sentry-cli releases finalize $SENTRY_RELEASE
```

Frontend:

1. Set `VITE_SENTRY_DSN` in your Vite environment (e.g., `.env` with `VITE_SENTRY_DSN=...`) and rebuild the frontend.
2. Trigger an error in the UI or simulate by throwing from console; Sentry will capture it.

## Actuator security

- `/actuator/health` and `/actuator/info` are public.
- Other `/actuator/**` endpoints (including `/actuator/prometheus`) require an `ADMIN` role by default. Authenticate as an ADMIN user to access them.

## Running backend tests

From the `backend` folder run:

```bash
./gradlew.bat test
```

The CI-friendly smoke test uses an in-memory H2 DB and disables Flyway.
