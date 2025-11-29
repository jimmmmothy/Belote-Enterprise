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

## Self-hosted runner + Minikube on a VM (example: Ubuntu on cloud)
1. Provision a VM (2–4 vCPU, 8GB+ RAM recommended) with Docker installed.
   ```bash
   sudo apt-get update
   sudo apt-get install -y ca-certificates curl gnupg lsb-release apt-transport-https conntrack
   sudo mkdir -p /etc/apt/keyrings
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
   echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list
   sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
   sudo usermod -aG docker $USER && newgrp docker
   ```
2. Install kubectl + Minikube (docker driver works well on cloud VMs):
   ```bash
   curl -Lo kubectl https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl
   sudo install kubectl /usr/local/bin/kubectl
   curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
   sudo install minikube-linux-amd64 /usr/local/bin/minikube
   minikube start --driver=docker
   minikube addons enable ingress
   kubectl get nodes
   ```
3. Install a GitHub self-hosted runner on the VM (run as a dedicated user, e.g., `runner`):
   ```bash
   sudo useradd -m -s /bin/bash runner
   sudo usermod -aG docker runner
   sudo -i -u runner
   cd /home/runner
   curl -o actions-runner.tar.gz -L https://github.com/actions/runner/releases/latest/download/actions-runner-linux-x64-$(uname -m | sed 's/x86_64/64/;s/aarch64/arm64/').tar.gz
   tar xzf actions-runner.tar.gz
   # In GitHub repo: Settings → Actions → Runners → New self-hosted runner → copy the config token command:
   ./config.sh --url https://github.com/<owner>/<repo> --token <TOKEN> --labels "self-hosted,minikube"
   sudo ./svc.sh install
   sudo ./svc.sh start
   ```
   Make sure the service user’s kubecontext is Minikube:
   ```bash
   sudo -i -u runner
   minikube update-context  # sets kubectl context for current user
   kubectl config use-context minikube
   kubectl get pods -A
   ```
4. Validate deployment manually (optional): `kubectl apply -k k8s/overlays/minikube` then `kubectl get pods -A`.
5. Open network access to the VM (HTTP/HTTPS or specific NodePort/Ingress) only as needed; add `/etc/hosts` entries on your machine pointing to the VM IP if you use the provided ingress hosts.
