// The build log: what happened, what's next, and what's further out.
// Past entries are facts with dates. Future entries are plans and say so.
// Move an item from `next` to `done` in the same PR that ships it.

export interface Entry {
  date?: string;
  title: string;
  body: string;
  link?: { href: string; label: string };
}

export const done: Entry[] = [
  {
    date: "Sep 2026",
    title: "The old site is lost",
    body: "The Azure VM that ran bvrinfra.in is deleted with no backup. The site goes offline.",
    link: { href: "/writing/september-2026-outage/", label: "Read the post-mortem" },
  },
  {
    date: "8 Oct 2026",
    title: "Audit and a written plan",
    body: "Every infrastructure repository reviewed for leaked secrets, dead config and risky exposure. The findings became ADR 0001, the decision record the rebuild follows.",
    link: { href: "https://github.com/BODAPATI88/bvrinfra/blob/main/docs/adr/0001-bvrinfra-architecture.md", label: "ADR 0001" },
  },
  {
    date: "8 Oct 2026",
    title: "DNS cleaned up",
    body: "22 stale records removed from the zone, including 17 pointing at a deleted tunnel and one exposing a private home-network address.",
  },
  {
    date: "8 Oct 2026",
    title: "Site back online",
    body: "Rebuilt as a static Astro site on Cloudflare Pages, with a protected main branch and a build check on every pull request.",
  },
  {
    date: "8 Oct 2026",
    title: "DNS becomes code",
    body: "The remaining records imported into Terraform, with state in HCP Terraform, a plan on every PR and a manual apply. Nothing changed in DNS during the import.",
  },
  {
    date: "8 Oct 2026",
    title: "Monitoring from outside",
    body: "Upptime on GitHub Actions checks the site every five minutes and publishes a public status page.",
    link: { href: "https://status.bvrinfra.in", label: "status.bvrinfra.in" },
  },
];

export const next: Entry[] = [
  {
    title: "Backups with a tested restore",
    body: "restic from the homelab to a home drive and one cloud copy, on a systemd timer deployed with Ansible. Done when a full restore has worked, not when the first backup runs.",
  },
  {
    title: "Harden the homelab",
    body: "Put every admin interface behind Cloudflare Access and keep cluster APIs off the public internet. Fix these before any homelab service is exposed again.",
  },
  {
    title: "Rotate launch-day credentials",
    body: "Roll the API tokens created during the rebuild and retire the old container-registry token.",
  },
];

export const later: Entry[] = [
  {
    title: "Homelab as code",
    body: "Describe the Proxmox homelab in Terraform and Ansible, so losing the host costs an evening, not the setup.",
  },
  {
    title: "Internal monitoring",
    body: "Uptime Kuma inside the homelab for internal services, alongside the external checks that already watch the public site.",
  },
  {
    title: "More write-ups",
    body: "Short pieces on decisions that shaped this site: why static, why manual apply, and why the monitor runs off my hardware.",
  },
];
