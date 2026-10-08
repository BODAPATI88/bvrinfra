// Employment on an employer-of-record basis, matching the CV, LinkedIn and relieving letters.
// Employers are named; clients are described, not named.
// Only add duties that are true and that you can talk about in an interview.

export interface Role {
  employer: string;
  note?: string;
  title?: string;
  start: string; // "Mon YYYY"
  end: string; // "Mon YYYY" or "Present"
  context?: string;
  duties?: string[];
  kind?: "role" | "break";
}

export const roles: Role[] = [
  {
    employer: "Astreya Partners",
    note: "now part of Cognizant",
    title: "System Administrator III (L3)",
    start: "Jun 2025",
    end: "Present",
    context: "Infrastructure operations for a client's data-centre estate: eight sites across the US and Japan, run by a rotation of five engineers.",
    duties: [
      "Provision virtual machines across the estate",
      "Run release cycles and qualify releases before rollout",
      "Own incidents and tickets through to resolution",
      "Coordinate remote hands with on-site data-centre operations teams",
      "Keep the team's operational playbooks current",
    ],
  },
  { employer: "Artha Data Solutions", start: "Jul 2023", end: "May 2025" },
  { employer: "Tata Consultancy Services", start: "Mar 2023", end: "Apr 2023" },
  {
    employer: "DataCore Technologies",
    start: "Apr 2022",
    end: "Mar 2023",
    context: "Deployed to a large IT services company.",
  },
  { employer: "Gati Intellect Systems", start: "Mar 2022", end: "Jun 2022" },
  {
    employer: "Kanthwal Services",
    start: "Jul 2021",
    end: "Feb 2022",
    context: "Deployed to a logistics automation company.",
  },
  {
    employer: "Quess Corp",
    start: "Sep 2020",
    end: "Jun 2021",
    context: "Deployed to a logistics automation company.",
  },
  { employer: "Career break", start: "2017", end: "2020", kind: "break" },
  {
    employer: "Magna InfoTech",
    note: "a Quess company",
    start: "Jul 2013",
    end: "Feb 2017",
  },
];

export interface SkillGroup {
  area: string;
  tools: string[];
  depth: string;
}

export const skills: SkillGroup[] = [
  {
    area: "Windows Server and identity",
    tools: ["Windows Server", "Active Directory", "Microsoft 365"],
    depth: "The core of my enterprise work. Certified Windows Server Hybrid Administrator (AZ-800 and AZ-801).",
  },
  {
    area: "Virtualisation",
    tools: ["VMware vSphere", "Proxmox VE"],
    depth: "vSphere in enterprise roles; VM provisioning across an eight-site estate today. Proxmox runs my homelab.",
  },
  {
    area: "Hybrid cloud",
    tools: ["Microsoft Azure", "Cloudflare"],
    depth: "Hybrid Windows administration is the scope of my certification. Cloudflare runs this site's DNS, hosting and edge.",
  },
  {
    area: "Infrastructure as code",
    tools: ["Terraform", "HCP Terraform"],
    depth: "This site's DNS is Terraform with plan-on-PR and manual apply. I'm extending the same approach to my Proxmox homelab.",
  },
  {
    area: "CI and change control",
    tools: ["GitHub Actions", "Branch rulesets", "Pull-request reviews"],
    depth: "Every change to this site goes through a protected branch, a build check and a review.",
  },
  {
    area: "Containers",
    tools: ["Docker Compose", "K3s", "ArgoCD", "Traefik"],
    depth: "Homelab scale, not production. Docker Compose runs my homelab services; I ran K3s with ArgoCD and Traefik there until September 2026.",
  },
  {
    area: "Monitoring",
    tools: ["Upptime", "Prometheus", "Grafana", "Loki"],
    depth: "Upptime watches this site from outside my network. The Prometheus stack is from the homelab.",
  },
  {
    area: "Operations",
    tools: ["Incident management", "Release qualification", "Runbooks", "Shift rotation"],
    depth: "Day-to-day work across a multi-site data-centre estate, on a five-engineer rotation.",
  },
  {
    area: "Scripting",
    tools: ["PowerShell", "Bash", "Python"],
    depth: "Automation for Windows administration, homelab operations and tooling.",
  },
];
