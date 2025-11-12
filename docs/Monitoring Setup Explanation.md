### Overview

I integrated a Prometheus + Grafana monitoring stack.
This setup continuously collects metrics from the NATS service and visualizes them through real-time dashboards.
Monitoring allows me to evaluate system behavior during development, load testing, and production-like environments, providing measurable evidence for system scalability and reliability.

### Pipeline

NATS data is collected within the container running NATS itself. It requires a 'NATS-Exporter' to expose these metrics beneath a `/metrics` endpoint. Prometheus can then scrape the metrics from that endpoint and acts as a data source for Grafana, my dashboard and monitoring tool.

Metrics collected include:
- Message throughput (published and delivered).
- Number of connected subscribers and publishers.
- Queue depth and message backlog.
- Connection stability and dropped messages.
- HTTP request latency and throughput for each service.
- CPU and memory usage of containers.
- Network I/O statistics (requests per second, error rates).
- NATS broker metrics through the NATS Exporter (queue depth, publish/subscribe rate, dropped messages).

### Integration with Load Testing

During my load testing sessions with k6, I monitored the metrics collected by Prometheus in real time through Grafana.
This allowed me to observe how latency, throughput, and resource usage evolved as virtual users increased from 100 to 1000.
The monitoring setup helped spot issues with crashing services by exposing the unexpected removal of connections to NATS. In the end, with its help I confirmed that the system scaled predictably up to its performance boundary, and fixed the service that crashed or experienced message loss during peak load.

### Future Upgrades

I plan to add `/metrics` endpoints to all other services and link them to Prometheus. This way, I can have custom domain metrics such as lobby creation rate, active games, and player joins. 