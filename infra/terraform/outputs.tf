output "cluster_name" {
  value       = var.cluster_name
  description = "Name of the Kubernetes cluster"
}

# Uncomment when hooked to a real module/provider
# output "kubeconfig" {
#   value       = module.kubernetes_cluster.kubeconfig
#   description = "Kubeconfig content for the provisioned cluster"
#   sensitive   = true
# }

# output "cluster_endpoint" {
#   value       = module.kubernetes_cluster.host
#   description = "API server endpoint"
# }
