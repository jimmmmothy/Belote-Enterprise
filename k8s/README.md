# Belote Kubernetes (Minikube)

This directory contains a Kustomize-based layout ready for Minikube now and GitOps/ArgoCD later.

## Quickstart (Minikube)
1. Clean old runs if needed: `minikube delete`
2. Start Minikube and ingress:
   - `minikube start`
   - `minikube addons enable ingress`
3. Deploy with Kustomize:
   - `kubectl apply -k k8s/overlays/minikube`
4. Access the frontend/API:
   - NodePort: `minikube service client --url` (exposes port 30080)
   - Ingress: add `belote.local` and `api.belote.local` to `/etc/hosts` pointing to the Minikube IP, then open `http://belote.local/` (client calls `http://api.belote.local`).
5. Backend services resolve each other via in-cluster DNS (e.g., `nats:4222`, `users-postgres:5432`, `lobbies-postgres:5432`, `server:3000`).

## Structure
- `k8s/base`: shared manifests for services (auth, lobby, game, server, client), infra (nats, postgres), config, and HPA.
- `k8s/overlays/minikube`: uses the base plus a NodePort patch for the client and an Ingress for convenience.
- `k8s/argocd/application-belote.yaml`: example ArgoCD `Application` pointing to the Minikube overlay.
- `infra/terraform`: skeleton for provisioning a managed Kubernetes cluster later (fill in provider/auth details).

## Notes
- Sensitive values (DB password, JWT secret, connection strings) live in `belote-secrets`; non-sensitive in `belote-config`.
- Liveness/readiness probes are present; adjust paths/endpoints if you add explicit `/health` routes in the services.
- Postgres runs as a StatefulSet with a PVC and creates `belote-users` and `belote-lobbies` databases at startup.
- HPA (`autoscaling/v2`) is wired to `lobby-service` (1-5 replicas, CPU target 50%); check with `kubectl get hpa`.
- ArgoCD: point `repoURL` to your Git repo and sync the `k8s/overlays/minikube` path.

## CI/CD (per-service) to Minikube
- Workflows (one per service): `.github/workflows/auth.yaml`, `lobby.yaml`, `game.yaml`, `server.yaml`, `client.yaml`.
  - PRs: lint/test the service on `ubuntu-latest`.
  - Pushes to `main`: lint/test → build & push GHCR image tagged `latest` and `${{ github.sha }}` → deploy only that service via Minikube overlay.
- Overlays (per service): `k8s/overlays/minikube-auth`, `-lobby`, `-game`, `-server`, `-client`. They include shared config/secrets plus just the resources for that service (and required infra like NATS/Postgres where relevant).
  - Deploy step uses `kubectl apply -k k8s/overlays/minikube-<service>` then `kubectl set image deployment/<service> <container>=ghcr.io/<owner>/<service>:${{ github.sha }}` and waits for rollout.
  - Full-stack apply is still available via `k8s/overlays/minikube` if you want to bootstrap everything at once.
- Registry auth: workflows log in to GHCR with `GITHUB_TOKEN`. For another registry, supply `CR_USERNAME`/`CR_PAT` (or equivalent) and adjust the login step.
- Runner requirement: deploy jobs target a self-hosted runner labeled `self-hosted,minikube` with `kubectl` (including kustomize support) pointed at the `minikube` context.