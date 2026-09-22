terraform {
  required_version = ">= 1.6"

  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 5.60" }
    random = { source = "hashicorp/random", version = "~> 3.6" }
  }

  # Filled in by `terraform init -backend-config=...`; see infra/README.md. State is
  # remote from the first apply so the pipeline and a laptop can't diverge.
  backend "s3" {}
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = "StreakArena"
      ManagedBy = "terraform"
    }
  }
}

# CloudFront certificates must live in us-east-1 no matter where the app runs.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project   = "StreakArena"
      ManagedBy = "terraform"
    }
  }
}
