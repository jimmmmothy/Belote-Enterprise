# OWASP ZAP Baseline Scan

This folder keeps lightweight configuration for running the OWASP ZAP Baseline scan in CI.

- `zap-targets.txt`: list of HTTP endpoints to probe (one per line).
- `zap-baseline.conf`: baseline parameters to keep scans consistent in automation.

The GitHub Actions workflow spins up the target service in a disposable container, runs the ZAP Baseline Docker image with these inputs, and fails on high-risk findings to demonstrate DevSecOps (LO6).
