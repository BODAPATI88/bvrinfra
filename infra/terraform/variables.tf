# Set in the HCP Terraform workspace, not in this repository.

variable "origin_tunnel_id" {
  description = "Cloudflare Tunnel ID for the homelab origin (#101). Empty until the tunnel exists; then origin.bvrinfra.in is created. Not a secret: it appears in DNS."
  type        = string
  default     = ""

  validation {
    condition     = var.origin_tunnel_id == "" || can(regex("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", var.origin_tunnel_id))
    error_message = "origin_tunnel_id must be empty or a tunnel UUID."
  }
}
