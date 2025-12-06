# Belote Kubernetes (Minikube)

This directory contains a Kustomize-based layout ready for Minikube now and GitOps/ArgoCD later.

## Quickstart (Minikube)
1. Clean old runs if needed: `minikube delete`
2. Start Minikube and ingress:
   - `minikube start`
   - `minikube addons enable ingress`
2.1. Apply metrics-server and configure listening port:
   - `kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml`
   - `kubectl -n kube-system patch deploy metrics-server --type='json' -p='[{"op":"replace","path":"/spec/template/spec/containers/0/args","value":["--cert-dir=/tmp","--secure-port=10250","--kubelet-insecure-tls" "--kubelet-preferred-address-types=InternalIP,Hostname,InternalDNS,ExternalDNS,ExternalIP","--kubelet-use-node-status-port"]}]'`
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

## Notes
- Sensitive values (DB password, JWT secret, connection strings) live in `belote-secrets`; non-sensitive in `belote-config`.
- Liveness/readiness probes are present; must adjust paths/endpoints if I ever add `/health` routes in the services.
- Postgres runs as a StatefulSet with a PVC and creates `belote-users` and `belote-lobbies` databases at startup.
- HPA (`autoscaling/v2`) is wired to `lobby-service` (1-5 replicas, CPU target 50%); check with `kubectl get hpa`.
- Azure CosmosDB is hooked to the cluster via `COSMOS_KEY` secret.