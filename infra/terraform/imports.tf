# One-time adoption of records that were created by hand on 2026-10-08.
#
# Each data source finds the existing record by exact name and type, and
# one() makes the plan fail loudly if there are zero or several matches,
# instead of importing the wrong record. Once the first apply succeeds these
# blocks are no-ops; delete this file in a follow-up PR.

data "cloudflare_dns_records" "existing" {
  for_each = local.records

  zone_id = local.zone_id
  type    = each.value.type

  name = {
    exact = each.value.name
  }
}

import {
  for_each = local.records

  to = cloudflare_dns_record.this[each.key]
  id = "${local.zone_id}/${one(data.cloudflare_dns_records.existing[each.key].result).id}"
}
