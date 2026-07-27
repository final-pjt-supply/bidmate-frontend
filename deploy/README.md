# Frontend Blue/Green deployment

The production EC2 instance keeps Nginx on port 80 and alternates the Next.js
container between two loopback-only slots:

- `bidmate-web-blue`: `127.0.0.1:3001 -> 3000`
- `bidmate-web-green`: `127.0.0.1:3002 -> 3000`

`deploy/blue-green-deploy.sh` is transferred through SSM on every deployment.
It acquires a server-side lock, starts the inactive slot, checks `/health`,
validates the Nginx configuration, switches traffic, checks `/health` through
Nginx, and only then removes the previous container.

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

Manual rollback is performed by deploying a previously known-good ECR commit
SHA through the same workflow. Unused images newer than seven days are kept for
rollback; older unused images are pruned after a successful deployment.
