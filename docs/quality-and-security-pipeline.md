# Quality and Security Pipeline

This repository wires Quality Assurance and Security-by-design checks into the CI/CD flow so production deploys are blocked until risks are addressed (LO4, LO6).

## SonarQube
- Runs static analysis (`sonarqube-analysis` job) against backend and frontend code.
- Flags code smells, duplicated logic, and coverage gaps via `sonar-project.properties`.
- Uses `SONAR_HOST_URL` and `SONAR_TOKEN` secrets to talk to the in-cluster SonarQube service (see `k8s/base/sonarqube`).

## Dependency Security (npm audit)
- `dependency-security-scan` job runs `npm audit --audit-level=high` across auth, lobby, game, and client services.
- Detects vulnerable libraries (OWASP A06 “Vulnerable and Outdated Components”).
- The pipeline fails on high/critical findings, preventing deployment until fixed.

## Container Image Scanning (Trivy)
- `image-vulnerability-scan` job scans newly built images with Trivy for HIGH/CRITICAL CVEs in OS packages and app libraries.
- Aligns with OWASP A06 and “Security vulnerability assessment” expectations.
- Failing scans stop the release, ensuring images are remediated before shipping.

## Dynamic Scanning (OWASP ZAP)
- Optional `dast-owasp-zap` workflow builds a service container, runs ZAP Baseline against HTTP endpoints defined in `security/zap/zap-targets.txt`, and reports high-risk issues.

## Deployment Gates
- `deploy-minikube` jobs require successful `build-and-test`, `dependency-security-scan`, and `image-vulnerability-scan` (plus the image build) before shipping.
- Static analysis and vulnerability scans blocking deploys demonstrate DevSecOps enforcement and LO6 compliance.
