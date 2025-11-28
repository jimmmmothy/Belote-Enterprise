# Belote Kubernetes (Minikube)

This directory contains a Kustomize-based layout ready for Minikube now and GitOps/ArgoCD later.

## Local dev (npm run dev)
1. Ensure Docker is running for Postgres/NATS (Compose).
2. Start infra + services: `docker-compose up -d nats users-postgres lobbies-postgres server auth-service lobby-service game-service`
3. Run client locally with Vite env for localhost API:
   - `cd client`
   - `cp .env.local.example .env.local` (or ensure `.env.local` has `VITE_SERVER_URL=http://localhost:3000`)
   - `npm install` (first time) then `npm run dev -- --host`
4. API base during local dev is taken from `VITE_SERVER_URL`; the runtime `config.json` is only used in-cluster.

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
