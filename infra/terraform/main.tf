data "cloudflare_zone" "this" {
  filter = {
    name = "bvrinfra.in"
  }
}

locals {
  zone_id = data.cloudflare_zone.this.id

  # Every record in the zone. Adding a record = adding an entry here, in a PR.
  # Names are fully qualified so they match what the Cloudflare API returns.
  records = {
    apex = {
      name    = "bvrinfra.in"
      type    = "CNAME"
      content = "bvrinfra-5l8.pages.dev"
      proxied = true
      comment = "Site: Cloudflare Pages custom domain"
    }
    www = {
      name    = "www.bvrinfra.in"
      type    = "CNAME"
      content = "bvrinfra-5l8.pages.dev"
      proxied = true
      comment = "Site: Cloudflare Pages custom domain"
    }
    dmarc = {
      name    = "_dmarc.bvrinfra.in"
      type    = "TXT"
      content = "v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;"
      proxied = false
      comment = "Email: DMARC policy"
    }
  }
}

resource "cloudflare_dns_record" "this" {
  for_each = local.records

  zone_id = local.zone_id
  name    = each.value.name
  type    = each.value.type
  content = each.value.content
  proxied = each.value.proxied
  ttl     = 1 # 1 = automatic
  comment = each.value.comment

  lifecycle {
    # Deleting the apex or www takes the site down. Terraform refuses to plan
    # a destroy of any record here until this line is removed in a reviewed PR.
    prevent_destroy = true
  }
}
