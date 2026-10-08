// The rack on the home page reads from this list.
// Update a unit's status in the same PR that ships it, so the site never claims more than is running.
// Order: index 0 is U1, the bottom of the rack.

export type Status = "live" | "building" | "planned";

export interface Unit {
  name: string;
  detail: string;
  status: Status;
}

export const stack: Unit[] = [
  { name: "Site", detail: "Static Astro on Cloudflare Pages", status: "live" },
  { name: "CI", detail: "Build check on every pull request", status: "live" },
  { name: "DNS as code", detail: "Terraform, Cloudflare provider", status: "live" },
  { name: "Monitoring", detail: "Uptime Kuma, public status page", status: "planned" },
  { name: "Backups", detail: "restic, with a tested restore", status: "planned" },
];

export const statusLabel: Record<Status, string> = {
  live: "Live",
  building: "Building",
  planned: "Planned",
};
