locals {
  name = "${var.name}-${var.environment}"

  # Two AZs is the minimum an ALB and an RDS subnet group will accept.
  azs = slice(data.aws_availability_zones.available.names, 0, 2)

  use_custom_domain = var.domain_name != "" && var.acm_certificate_arn != ""
  app_domain        = local.use_custom_domain ? var.domain_name : aws_cloudfront_distribution.app.domain_name
}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}
