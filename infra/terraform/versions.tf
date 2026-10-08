terraform {
  required_version = ">= 1.7.0"

  # State lives in HCP Terraform (ADR 0001, D2). Runs are VCS-driven:
  # pull requests get a speculative plan, merges to main queue a plan
  # that waits for manual apply.
  cloud {
    organization = "bvrinfra"

    workspaces {
      name = "bvrinfra-dns"
    }
  }

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

# Authenticates with the CLOUDFLARE_API_TOKEN environment variable, set as a
# sensitive variable in the HCP Terraform workspace. Never put it in this repo.
provider "cloudflare" {}
