// The rack on the home page reads from this list.
// Update a unit's status in the same PR that ships it, so the site never claims more than is running.
// Order: index 0 is U1, the bottom of the rack.
// `evidence` is where a visitor can check the claim for themselves. Only add it once the unit is live.

export type Status = "live" | "building" | "planned";

export interface Unit {
  name: string;
  detail: string;
  status: Status;
  evidence?: { href: string; label: string };
}

export const stack: Unit[] = [
  {
    name: "Site",
    detail: "Static Astro on Cloudflare Pages",
    status: "live",
    evidence: { href: "https://github.com/BODAPATI88/bvrinfra/tree/main/site", label: "Source" },
  },
  {
    name: "CI",
    detail: "Build check on every pull request",
    status: "live",
    evidence: { href: "https://github.com/BODAPATI88/bvrinfra/actions", label: "Runs" },
  },
  {
    name: "DNS as code",
    detail: "Terraform, Cloudflare provider",
    status: "live",
    evidence: { href: "https://github.com/BODAPATI88/bvrinfra/tree/main/infra/terraform", label: "Code" },
  },
  {
    name: "Monitoring",
    detail: "Upptime on GitHub Actions",
    status: "live",
    evidence: { href: "https://status.bvrinfra.in", label: "Status" },
  },
  {
    name: "Backups",
    detail: "restic, with a tested restore",
    status: "planned",
  },
];

export const statusLabel: Record<Status, string> = {
  live: "Live",
  building: "Building",
  planned: "Planned",
};
