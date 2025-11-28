### CI/CD Explanation

This repo uses GitHub Actions to test, build, publish, and then deploy the individual services that make up Belote. Each service has its own workflow that runs on path-based triggers, pushes a Docker image to GHCR, and then notifies a deploy orchestrator that promotes the change to the Azure VM.

#### Triggers and Flow
- `client.yaml`, `auth.yaml`, `lobby.yaml`, `game.yaml`, and `server.yaml` run on pushes that touch their respective folders (or their workflow file). Successful runs on `main` then fan into `deploy.yml` via `workflow_run`.
- The deploy workflow gates on two conditions: the upstream workflow concluded successfully and the branch was `main`. It checks out the commit that triggered the run to keep deploys aligned with the exact build artifacts.
- A git diff (`HEAD^..HEAD`) is used to detect which service changed. If nothing relevant changed, deployment is skipped.

#### Service Workflows (build/publish stage)
- All images are built on `ubuntu-latest`, logged into GHCR with `${{ secrets.GITHUB_TOKEN }}`, tagged `ghcr.io/${{ github.repository_owner }}/<service>:latest`, and pushed.
- Client build: includes a `VITE_SERVER_URL` build arg pointing to `http://server:3000` (`client.yaml`).
- Auth, Lobby, Game builds: simple Docker builds in their respective folders. (Auth/Lobby also include a test job described below.)
- Server build: builds/pushes `server` image; no tests defined in this workflow.
- Kubernetes apply steps are present but commented out, keeping current delivery focused on container publication plus remote VM deploy.

#### Testing Stage (where present)
- `auth.yaml`, `lobby.yaml`, and `game.yaml` include a `test` job that runs Node 20, installs deps, and runs `npm test`.
- Client and Server workflows currently skip automated tests.

#### Deployment to Azure VM (`deploy.yml`)
- Trigger: `workflow_run` on the five service workflows above; continues only when the upstream run succeeded and targeted `main`.
- Steps:
  - Checkout at `github.event.workflow_run.head_sha` with depth 2.
  - Determine the changed service via `git diff --name-only HEAD^ HEAD` and a simple path match.
  - If a service changed, connect to the Azure VM using `appleboy/ssh-action@v0.1.10` with `VM_HOST`, `VM_USER`, and `VM_SSH_KEY` (Secrets/Vars). On the VM it runs `cd belote && ./deploy.sh <service>`, which is expected to pull the fresh image and restart the corresponding container(s).
- Secrets/vars in use: `GITHUB_TOKEN` (GHCR auth), `VM_HOST`, `VM_USER`, `VM_SSH_KEY`; optional `KUBECONFIG` commented out for future k8s deploys.

#### Screenshot Placeholders
- Pipeline summary/run graph: _paste screenshot here_
- GHCR image list showing pushed tags: _paste screenshot here_
- Deploy workflow run showing VM step output: _paste screenshot here_
- Test job output (for services with tests): _paste screenshot here_
