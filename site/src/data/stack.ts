// The rack on the home page reads from this list.
// Update a unit's status in the same PR that ships it, so the site never claims more than is running.
// Order: index 0 is U1, the bottom of the rack.
// Each unit expands on the page, so a visitor can understand it without leaving the site.
// `source` is the optional last step: where to check the claim on GitHub.

export type Status = "live" | "building" | "planned";

export interface Unit {
  name: string;
  detail: string;
  status: Status;
  how: string;
  flow: string[];
  facts: { label: string; value: string }[];
  proves: string;
  source?: { href: string; label: string };
}

export const stack: Unit[] = [
  {
    name: "Site",
    detail: "Static Astro on Cloudflare Pages",
    status: "live",
    how: "Every page is plain HTML generated at build time. When a change lands on main, Cloudflare Pages builds the site and serves it from its edge network. There is no server of mine in the path, so there is nothing to patch and nothing to keep powered on.",
    flow: ["Merge to main", "Pages build", "Edge network", "Visitor"],
    facts: [
      { label: "Hosting", value: "Cloudflare Pages, free tier" },
      { label: "Third-party requests", value: "None (fonts self-hosted)" },
      { label: "Themes", value: "Auto, light, dark" },
      { label: "Back online", value: "8 October 2026" },
    ],
    proves: "The public site can't go down with my homelab. That dependency is what took the last version offline.",
    source: { href: "https://github.com/BODAPATI88/bvrinfra/tree/main/site", label: "Site source on GitHub" },
  },
  {
    name: "CI",
    detail: "Build check on every pull request",
    status: "live",
    how: "Nothing is pushed straight to main; a branch ruleset blocks it. Every change arrives as a pull request, and GitHub Actions does a clean install and full build, then checks every page exists. Changes to the Terraform code get a format and validate check as well.",
    flow: ["Branch", "Pull request", "Build + checks", "Review", "Merge"],
    facts: [
      { label: "Direct pushes to main", value: "Blocked" },
      { label: "Site check", value: "npm ci, build, page check" },
      { label: "Terraform check", value: "fmt, init, validate" },
      { label: "Required to merge", value: "A passing build" },
    ],
    proves: "Every change on the live site has passed a build and a review, including the ones drafted with AI tools.",
    source: { href: "https://github.com/BODAPATI88/bvrinfra/actions", label: "CI runs on GitHub" },
  },
  {
    name: "DNS as code",
    detail: "Terraform, Cloudflare provider",
    status: "live",
    how: "All DNS records for bvrinfra.in are defined in Terraform. A pull request gets a plan from HCP Terraform showing the exact change. After merge, the apply waits for a person to confirm it. Every record is protected against accidental deletion.",
    flow: ["Edit records", "Plan on PR", "Merge", "Manual apply", "Cloudflare DNS"],
    facts: [
      { label: "Records managed", value: "4" },
      { label: "Dead records removed", value: "22, on 8 October 2026" },
      { label: "Apply", value: "Manual, never automatic" },
      { label: "API token scope", value: "DNS edit on this one zone" },
    ],
    proves: "DNS changes are reviewed, reversible and recorded. The 22 stale records from the old setup were the cost of not doing this before.",
    source: { href: "https://github.com/BODAPATI88/bvrinfra/tree/main/infra/terraform", label: "Terraform on GitHub" },
  },
  {
    name: "Monitoring",
    detail: "Upptime on GitHub Actions",
    status: "live",
    how: "Every five minutes a scheduled GitHub Actions job requests three pages of this site and records the result. If a check fails, it opens an issue, which emails me; when the site recovers, the issue closes. The results publish to a public status page.",
    flow: ["Every 5 min", "Check 3 URLs", "Record result", "Issue if down", "Status page"],
    facts: [
      { label: "URLs checked", value: "Home, www, Projects" },
      { label: "Interval", value: "5 minutes (GitHub may delay)" },
      { label: "Runs on", value: "GitHub, not my hardware" },
      { label: "Status page", value: "status.bvrinfra.in" },
    ],
    proves: "Outages get noticed and recorded even when my homelab is switched off. A monitor on the machine it watches can't do that.",
    source: { href: "https://status.bvrinfra.in", label: "Open the status page" },
  },
  {
    name: "Backups",
    detail: "Daily backups, first restore tested",
    status: "building",
    how: "Every night at 02:00 Proxmox backs up the machine that runs the homelab's services to a second disk in the same host. It keeps 7 daily and 4 weekly copies and deletes older ones on its own. On 10 October 2026 I restored one of those backups as a separate machine with its network cut, and it booted. Two things are still missing: a copy outside the house, and a restore test with the services running.",
    flow: ["Homelab", "Nightly backup", "Second disk", "Restore test", "Off-site copy (next)"],
    facts: [
      { label: "Schedule", value: "Daily at 02:00" },
      { label: "Kept", value: "7 daily, 4 weekly" },
      { label: "First restore test", value: "10 October 2026, booted" },
      { label: "Off-site copy", value: "Not yet (Cloudflare R2 planned)" },
      { label: "Counts as done when", value: "An off-site copy exists and a restore brings the services back" },
    ],
    proves: "This is the unit that would have prevented the September outage. A backup on a second disk in the same host does not survive losing the host, so it stays amber until a copy lives somewhere else.",
  },
];

export const statusLabel: Record<Status, string> = {
  live: "Live",
  building: "Building",
  planned: "Planned",
};
