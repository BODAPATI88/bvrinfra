// Status shown at the top of the home page and on /status-report/.
// Update `sprint` at each Monday sprint review, and `availability` whenever it changes.
// Facts only: anything not confirmed by Ravi stays marked [CHECK], which blocks the merge.

export type Rag = "green" | "amber" | "red";

export const project = {
  sprint: "Sprint 2",
  dates: "15–21 Oct 2026",
  overall: "amber" as Rag,
  overallWhy: "Backups run every night but are not yet proven by a restore with the services running.",
};

export const availability = {
  open: true,
  roles: "Platform engineering · SRE",
  notice: "[CHECK] notice period",
  location: "Hyderabad, India",
  workMode: "[CHECK] on-site, hybrid or remote",
  available: "[CHECK] available from",
};

export const ragLabel: Record<Rag, string> = { green: "Green", amber: "Amber", red: "Red" };
