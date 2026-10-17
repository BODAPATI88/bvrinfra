// Status shown at the top of the home page and on /status-report/.
// Update `sprint` at each Monday sprint review, and `availability` whenever it changes.
// Facts only: anything Ravi has not confirmed carries the open-fact marker the guard looks for, which blocks the merge.

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
  location: "Hyderabad, India",
  workMode: "[CHECK] on-site, hybrid or remote",
  // Notice period and start date are discussed on a call, not published (Ravi, 17 Oct).
  timing: "Notice and start date on a call",
};

export const ragLabel: Record<Rag, string> = { green: "Green", amber: "Amber", red: "Red" };
