output "app_url" {
  description = "Public URL of the application (open this in a browser)"
  value       = "http://${aws_lb.app.dns_name}"
}

output "alb_dns_name" {
  value = aws_lb.app.dns_name
}

output "ecr_backend_repository_url" {
  description = "Set as the ECR_BACKEND_REPO Actions variable"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_repository_url" {
  description = "Set as the ECR_FRONTEND_REPO Actions variable"
  value       = aws_ecr_repository.frontend.repository_url
}

output "ecs_cluster_name" {
  description = "Set as the ECS_CLUSTER Actions variable"
  value       = aws_ecs_cluster.main.name
}

output "ecs_backend_service" {
  description = "Set as the ECS_BACKEND_SERVICE Actions variable"
  value       = aws_ecs_service.backend.name
}

output "ecs_frontend_service" {
  description = "Set as the ECS_FRONTEND_SERVICE Actions variable"
  value       = aws_ecs_service.frontend.name
}

output "github_deploy_role_arn" {
  description = "Set as the AWS_DEPLOY_ROLE_ARN Actions secret"
  value       = aws_iam_role.github_deploy.arn
}

output "redis_endpoint" {
  value = aws_elasticache_cluster.redis.cache_nodes[0].address
}
