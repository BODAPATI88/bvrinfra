// Skills shown on /skills. Work history is shared on request, not published.

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
