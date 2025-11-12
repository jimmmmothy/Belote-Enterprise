### CI/CD Pipeline: Build and Push Docker Images

To automate containerization across all core services, I created a GitHub Actions pipeline named Build and Push Docker Images.
This workflow is triggered automatically on every push or pull request to the main branch. It runs on an Ubuntu environment and handles authentication, building, and publishing of Docker images to GitHub Container Registry (GHCR).

The pipeline begins by checking out the repository and logging in to GHCR using a secure GitHub token. It then sequentially builds and pushes four images — one for each major component of the system:

- Client (React web interface)
- Server (API gateway / WebSocket server)
- Game Service (core game logic)
- Lobby Service (matchmaking and lobby management)

Each image is tagged with latest and pushed to a private GHCR namespace under my repository owner. This ensures all services have consistent, versioned builds available for deployment and testing.

This setup supports continuous integration and delivery by eliminating manual build steps, keeping environments reproducible, and enabling rapid updates across all microservices with a single push.

### Future Improvements

To extend this pipeline toward a full DevOps lifecycle, I plan to:

- Add automated testing stages before the build phase to ensure code quality and prevent regressions.
- Introduce environment-based workflows (e.g., staging and production) to support gradual rollouts.
- Automate deployment to a Kubernetes cluster or cloud platform directly from the CI/CD pipeline.
- Integrate monitoring hooks, so Prometheus metrics and alerts can verify deployment health in real time.

These enhancements will make the workflow more robust and fully continuous, aligning with cloud-native and DevOps best practices.