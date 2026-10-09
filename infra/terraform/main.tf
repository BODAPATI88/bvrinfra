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
    status = {
      name    = "status.bvrinfra.in"
      type    = "CNAME"
      content = "bodapati88.github.io"
      proxied = false # GitHub Pages must see real traffic to issue the HTTPS certificate
      comment = "Monitoring: Upptime status page on GitHub Pages"
    }
    dmarc = {
      name    = "_dmarc.bvrinfra.in"
      type    = "TXT"
      content = "v=DMARC1; p=quarantine; adkim=r; aspf=r;"
      proxied = false
      comment = "Email: DMARC policy"
    }

    # Cloudflare Email Routing: hello@bvrinfra.in forwards to Ravi's inbox.
    # Values are exactly what the Email Routing dashboard asked for (#19).
    mx_route1 = {
      name     = "bvrinfra.in"
      type     = "MX"
      content  = "route1.mx.cloudflare.net"
      priority = 91
      proxied  = false
      comment  = "Email: Cloudflare Email Routing"
    }
    mx_route2 = {
      name     = "bvrinfra.in"
      type     = "MX"
      content  = "route2.mx.cloudflare.net"
      priority = 90
      proxied  = false
      comment  = "Email: Cloudflare Email Routing"
    }
    mx_route3 = {
      name     = "bvrinfra.in"
      type     = "MX"
      content  = "route3.mx.cloudflare.net"
      priority = 12
      proxied  = false
      comment  = "Email: Cloudflare Email Routing"
    }
    spf = {
      name    = "bvrinfra.in"
      type    = "TXT"
      content = "v=spf1 include:_spf.mx.cloudflare.net ~all"
      proxied = false
      comment = "Email: Cloudflare Email Routing"
    }
    dkim_cf2024 = {
      name    = "cf2024-1._domainkey.bvrinfra.in"
      type    = "TXT"
      content = "v=DKIM1; h=sha256; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAiweykoi+o48IOGuP7GR3X0MOExCUDY/BCRHoWBnh3rChl7WhdyCxW3jgq1daEjPPqoi7sJvdg5hEQVsgVRQP4DcnQDVjGMbASQtrY4WmB1VebF+RPJB2ECPsEDTpeiI5ZyUAwJaVX7r6bznU67g7LvFq35yIo4sdlmtZGV+i0H4cpYH9+3JJ78km4KXwaf9xUJCWF6nxeD+qG6Fyruw1Qlbds2r85U9dkNDVAS3gioCvELryh1TxKGiVTkg4wqHTyHfWsp7KD3WQHYJn0RyfJJu6YEmL77zonn7p2SRMvTMP3ZEXibnC9gz3nnhR6wcYL8Q7zXypKTMD58bTixDSJwIDAQAB"
      proxied = false
      comment = "Email: Cloudflare Email Routing"
    }
  }
}

resource "cloudflare_dns_record" "this" {
  for_each = local.records

  zone_id  = local.zone_id
  name     = each.value.name
  type     = each.value.type
  content  = each.value.content
  priority = try(each.value.priority, null)
  proxied  = each.value.proxied
  ttl      = 1 # 1 = automatic
  comment  = each.value.comment

  lifecycle {
    # Deleting the apex or www takes the site down. Terraform refuses to plan
    # a destroy of any record here until this line is removed in a reviewed PR.
    prevent_destroy = true
  }
}
