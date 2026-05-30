variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "Name prefix for all resources"
  type        = string
  default     = "rtce"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "image_tag" {
  description = "Container image tag the ECS services run"
  type        = string
  default     = "latest"
}

variable "backend_desired_count" {
  description = "Number of backend Fargate tasks (>=2 demonstrates Redis-backed multi-instance sync)"
  type        = number
  default     = 2
}

variable "frontend_desired_count" {
  description = "Number of frontend Fargate tasks"
  type        = number
  default     = 1
}

variable "backend_cpu" {
  type    = number
  default = 256
}

variable "backend_memory" {
  type    = number
  default = 512
}

variable "frontend_cpu" {
  type    = number
  default = 256
}

variable "frontend_memory" {
  type    = number
  default = 512
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t4g.micro"
}

variable "github_repo" {
  description = "GitHub repo (owner/name) allowed to assume the deploy role via OIDC"
  type        = string
  default     = "your-org/real-time-code-editor"
}
