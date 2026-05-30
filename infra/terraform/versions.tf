terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # For real use, configure a remote backend (S3 + DynamoDB lock). Left local
  # here so the config can be `init`/`validate`d without provisioning anything.
  # backend "s3" {
  #   bucket         = "your-tfstate-bucket"
  #   key            = "rtce/terraform.tfstate"
  #   region         = "ap-south-1"
  #   dynamodb_table = "terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "terraform"
    }
  }
}
