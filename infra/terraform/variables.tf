variable "cluster_name" {
  type        = string
  description = "Name of the Kubernetes cluster"
  default     = "belote-cluster"
}

variable "region" {
  type        = string
  description = "Region/zone where the cluster will be created"
  default     = "us-east-1"
}

variable "node_count" {
  type        = number
  description = "Number of nodes for the worker pool"
  default     = 3
}

# Provider-specific variables (fill in as needed)
variable "azure_subscription_id" {
  type        = string
  description = "Azure subscription id"
  default     = ""
}

variable "azure_tenant_id" {
  type        = string
  description = "Azure tenant id"
  default     = ""
}
