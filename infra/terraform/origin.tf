# The homelab origin (#101): the front-door Worker on bvrinfra.in sends requests here
# first and falls back to Pages. Created only once origin_tunnel_id is set.
# Kept out of main.tf until it is live, so the site's record count (counted from main.tf)
# only includes records that exist. The PR that proves the origin works moves it there.
locals {
  origin_record = {
    for k, v in {
      origin = {
        name    = "origin.bvrinfra.in"
        type    = "CNAME"
        content = "${var.origin_tunnel_id}.cfargotunnel.com"
        proxied = true
        comment = "Site: homelab origin on k3s-apps through Cloudflare Tunnel (#101)"
      }
    } : k => v if var.origin_tunnel_id != ""
  }
}
