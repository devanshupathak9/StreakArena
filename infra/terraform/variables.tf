variable "region" {
  description = "Region for everything except the CloudFront certificate."
  type        = string
  default     = "ap-south-1"
}

variable "name" {
  description = "Prefix for resource names."
  type        = string
  default     = "streakarena"
}

variable "environment" {
  description = "Environment suffix, so two stacks can coexist in one account."
  type        = string
  default     = "prod"
}

variable "domain_name" {
  description = <<-TEXT
    Optional custom domain, e.g. streakarena.app. Leave empty to use the CloudFront
    domain CloudFront hands out. A custom domain also needs acm_certificate_arn.
  TEXT
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ACM certificate in us-east-1 for domain_name. Required only with a custom domain."
  type        = string
  default     = ""
}

variable "github_repository" {
  description = "owner/repo allowed to assume the deploy role via OIDC."
  type        = string
  default     = "devanshupathak9/StreakArena"
}

variable "github_token" {
  description = <<-TEXT
    GitHub personal access token with no scopes. Without it, GitHub sync falls back to
    the public events API: ~90 days of history and 60 requests an hour per IP, shared
    by every user on the server.
  TEXT
  type        = string
  default     = ""
  sensitive   = true
}

variable "task_cpu" {
  description = "Fargate CPU units. 256 = 0.25 vCPU."
  type        = number
  default     = 256
}

variable "task_memory" {
  description = "Fargate memory in MiB."
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "How many API tasks to run."
  type        = number
  default     = 1
}

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDS storage in GiB."
  type        = number
  default     = 20
}

variable "log_retention_days" {
  description = "CloudWatch log retention."
  type        = number
  default     = 14
}
