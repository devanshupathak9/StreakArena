output "app_url" {
  description = "Where the app answers."
  value       = "https://${local.app_domain}"
}

output "cloudfront_distribution_id" {
  description = "Needed by the pipeline to invalidate the edge after a deploy."
  value       = aws_cloudfront_distribution.app.id
}

output "site_bucket" {
  description = "Where the React bundle is published."
  value       = aws_s3_bucket.site.bucket
}

output "uploads_bucket" {
  description = "Where chat attachments live."
  value       = aws_s3_bucket.uploads.bucket
}

output "ecr_repository_url" {
  description = "Image repository for the API."
  value       = aws_ecr_repository.api.repository_url
}

output "ecs_cluster" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service" {
  value = aws_ecs_service.api.name
}

output "task_family" {
  value = aws_ecs_task_definition.api.family
}

output "deploy_role_arn" {
  description = "Set this as AWS_DEPLOY_ROLE in the repository's Actions secrets."
  value       = aws_iam_role.deploy.arn
}

output "api_security_group" {
  description = "Needed when running one-off migration tasks."
  value       = aws_security_group.api.id
}

output "public_subnets" {
  value = aws_subnet.public[*].id
}
