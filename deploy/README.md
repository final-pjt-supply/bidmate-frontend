# Frontend Blue/Green deployment

Each production EC2 instance keeps Nginx on port 80 and alternates the Next.js
container between two loopback-only slots:

- `bidmate-web-blue`: `127.0.0.1:3001 -> 3000`
- `bidmate-web-green`: `127.0.0.1:3002 -> 3000`

`deploy/blue-green-deploy.sh` is transferred through SSM on every deployment.
It acquires a server-side lock, starts the inactive slot, checks `/health` and
the home page render, compares the new slot against the active one, validates
the Nginx configuration, switches traffic, checks `/health` through Nginx, and
only then removes the previous container.

## Rolling across instances

The ALB target group holds two instances and `deploy.yml` walks them **one at a
time**, stopping at the first failure so the remaining instance keeps serving
the previous build. During a rollout the two instances briefly run different
builds; Next.js embeds a build ID in static chunk paths, so target group
stickiness must stay enabled or a browser can request a chunk from the instance
that no longer has it. Turning stickiness off means going back to a
send-to-everything deployment.

`rollback.yml` deliberately does the opposite and targets every instance at
once — the fleet is already broken at that point, so converging fast matters
more than limiting blast radius.

## Regression gate

`/health` only proves the Node process is alive, and the home page returns 200
even when every backend call fails (`Promise.allSettled` in `src/app/page.tsx`).
So before switching traffic the script counts the bids serialized into the home
response and compares the new slot with the currently active one:

| Active slot | New slot | Result |
|---|---|---|
| 24 | 24 | switch |
| 0 | 0 | switch — the backend is down, not this build |
| 24 | 0 | **abort** — this build lost the backend (check `API_BASE_URL`) |

The comparison is what keeps a backend outage from blocking frontend
deployments. If the active slot cannot be read at all, the gate passes rather
than blocking a deployment it has no basis to judge.

## First deployment

The first deployment installs Nginx on Amazon Linux 2023 and migrates the
legacy `bidmate-web` container that owns port 80:

1. Start and validate `bidmate-web-blue` on port 3001.
2. Stop (but do not immediately remove) the legacy container.
3. Start Nginx on port 80 and route it to Blue.
4. Validate `/health` through Nginx.
5. Remove the legacy container only after validation succeeds.

If Nginx fails to start or validate, the script stops Nginx and restarts the
legacy container on port 80.

## State and recovery

- Active slot: `/opt/bidmate-frontend/active-slot`
- Deployment lock: `/opt/bidmate-frontend/deploy.lock`
- Nginx upstream: `/etc/nginx/bidmate-upstream.conf`
- Nginx config source: `/opt/bidmate-frontend/nginx.conf`

Manual rollback runs through `.github/workflows/rollback.yml` with a known-good
ECR commit SHA. Unused images newer than seven days are kept for rollback;
older unused images are pruned after a successful deployment.
