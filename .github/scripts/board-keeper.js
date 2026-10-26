// Board keeper (bvrinfra#86). Rule-based, no AI. Run by .github/workflows/board-keeper.yml.
//
// Does three things, all described in AGENTS.md "Schedule and checks":
//   1. stale-check: one comment per issue per day on a dispatched ticket with no PR
//      and no comment of any kind in the last 24 hours;
//   2. Jules dispatch: adds the `jules` label to the highest-priority eligible
//      ticket owned by owner:gemini alone, in the current sprint, that has a brief by the repo owner;
//   3. daily status: posts the "By agent" table on the `Daily status` issue, once a day,
//      on the run at or after 18:00 IST.
// PR reviews and briefs still need Claude (docs/working-agreement.md).
//
// With dryRun the script reads only and prints what it would do.

"use strict";

const OWNER_LOGIN = "BODAPATI88";
const BOT_LOGINS = new Set([OWNER_LOGIN, "github-actions[bot]"]);
const HIGH_STAKES = ["P0", "P1", "size:L", "type:infra", "type:security"];
const PRIORITIES = ["P0", "P1", "P2", "P3"];
const STATUS_TITLE = "Daily status";
const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

const AGENTS = [
  { key: "claude", name: "Claude", label: "owner:claude", branches: ["claude/"] },
  { key: "chatgpt", name: "ChatGPT / Codex", label: "owner:chatgpt", branches: ["codex/", "chatgpt/"] },
  { key: "gemini", name: "Gemini / Jules", label: "owner:gemini", branches: ["jules/", "gemini/"] },
  { key: "ravi", name: "Ravi", label: "owner:ravi", branches: [] },
];

// ---------- pure helpers (unit-tested) ----------

/** IST calendar date (YYYY-MM-DD) and hour for a UTC Date. */
function istParts(now) {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  return { date: ist.toISOString().slice(0, 10), hour: ist.getUTCHours(), minute: ist.getUTCMinutes() };
}

/**
 * Date range of a sprint milestone from its title, e.g. "Sprint 3 · 26 Oct–1 Nov 2026"
 * or "Sprint 1 · 8–14 Oct 2026". Returns { start, end } as YYYY-MM-DD, or null.
 * Falls back to the milestone's due date and the six days before it.
 */
function sprintRange(milestone) {
  const m = /(\d{1,2})(?:\s+([A-Za-z]{3})[a-z]*)?\s*[–-]\s*(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/.exec(milestone.title || "");
  const iso = (y, mo, d) => new Date(Date.UTC(y, mo, d)).toISOString().slice(0, 10);
  if (m) {
    const endMonth = MONTHS[m[4].toLowerCase()];
    const startMonth = m[2] ? MONTHS[m[2].toLowerCase()] : endMonth;
    const endYear = Number(m[5]);
    const startYear = startMonth > endMonth ? endYear - 1 : endYear;
    if (startMonth !== undefined && endMonth !== undefined) {
      return { start: iso(startYear, startMonth, Number(m[1])), end: iso(endYear, endMonth, Number(m[3])) };
    }
  }
  if (milestone.due_on) {
    const due = new Date(milestone.due_on);
    return { start: new Date(due.getTime() - 6 * DAY_MS).toISOString().slice(0, 10), end: milestone.due_on.slice(0, 10) };
  }
  return null;
}

/** The open milestone whose date range includes the IST date `today`, or null. */
function currentSprint(milestones, today) {
  return milestones.find((ms) => {
    if (ms.state && ms.state !== "open") return false;
    const r = sprintRange(ms);
    return r && r.start <= today && today <= r.end;
  }) || null;
}

const labelNames = (issue) => new Set((issue.labels || []).map((l) => (typeof l === "string" ? l : l.name)));
const hasDoneWhen = (body) => /^\s*(#{1,6}\s*)?\**done when\**\s*:?\s*$/im.test(body || "");
const priorityOf = (labels) => {
  const i = PRIORITIES.findIndex((p) => labels.has(p));
  return i === -1 ? PRIORITIES.length : i;
};
const priorityName = (labels) => PRIORITIES.find((p) => labels.has(p)) || "no priority";

/** Why an issue can't be started, or null if it is eligible. */
function blockReason(issue) {
  const labels = labelNames(issue);
  if (issue.user.login !== OWNER_LOGIN || labels.has("untrusted")) return "untrusted";
  if (labels.has("blocked")) return "blocked";
  if (labels.has("needs-approval")) return "needs approval";
  if (HIGH_STAKES.some((l) => labels.has(l)) && !labels.has("approved")) return "needs approval";
  if (!hasDoneWhen(issue.body)) return "no Done-when list";
  return null;
}

/** Issue numbers an open PR points at: "Closes/Fixes/Refs/Part of #N" anywhere, or a branch like agent/N-name. */
function prIssueNumbers(pr) {
  const nums = new Set();
  const re = /\b(?:closes|fixes|resolves|refs|part of)\s+(?:BODAPATI88\/bvrinfra)?#(\d+)/gi;
  let m;
  while ((m = re.exec(pr.body || ""))) nums.add(Number(m[1]));
  const b = /^[a-z]+\/(\d+)-/.exec((pr.head && pr.head.ref) || "");
  if (b) nums.add(Number(b[1]));
  return nums;
}

const ownersOf = (issue) => AGENTS.filter((a) => labelNames(issue).has(a.label));
const agentOfBranch = (ref) => AGENTS.find((a) => a.branches.some((p) => ref.startsWith(p))) || null;
const trusted = (c) => BOT_LOGINS.has(c.user && c.user.login);
const hasBrief = (comments) => comments.some((c) => c.user && c.user.login === OWNER_LOGIN && (c.body || "").trimStart().startsWith("<!-- agent-brief -->"));

/**
 * When an issue was handed to Jules or Codex, by trusted marker comment or label event.
 * Returns [{ agent: "Jules" | "Codex", at: Date }], earliest first. Only counts the hand-off
 * if the issue still carries that agent's owner label.
 */
function dispatches(issue, comments, labelEvents) {
  const labels = labelNames(issue);
  const out = [];
  const first = (pred) => comments.filter((c) => trusted(c) && pred(c.body || "")).map((c) => new Date(c.created_at)).sort((a, b) => a - b)[0];
  if (labels.has("owner:gemini")) {
    const viaComment = first((b) => b.includes("<!-- dispatched jules -->"));
    const viaLabel = labels.has("jules") ? labelEvents.filter((e) => e.event === "labeled" && e.label && e.label.name === "jules").map((e) => new Date(e.created_at)).sort((a, b) => a - b)[0] : undefined;
    const at = [viaComment, viaLabel].filter(Boolean).sort((a, b) => a - b)[0] || (labels.has("jules") ? new Date(issue.created_at) : undefined);
    if (at) out.push({ agent: "Jules", at });
  }
  if (labels.has("owner:chatgpt")) {
    const at = first((b) => b.includes("<!-- dispatched codex -->"));
    if (at) out.push({ agent: "Codex", at });
  }
  return out;
}

/** Stale-check comment body if one is due, else null. */
function staleCheck(issue, comments, labelEvents, linkedPRs, now, today) {
  if (blockReason(issue) === "untrusted" || labelNames(issue).has("blocked") || linkedPRs.length) return null;
  const ds = dispatches(issue, comments, labelEvents);
  if (!ds.length) return null;
  const d = ds[0];
  if (now - d.at < DAY_MS) return null;
  if (comments.some((c) => (c.body || "").includes(`<!-- stale-check ${today} -->`))) return null;
  const times = [d.at, ...comments.map((c) => new Date(c.created_at))].sort((a, b) => b - a);
  const last = times[0];
  if (now - last < DAY_MS) return null;
  // Show the last real activity, not an earlier stale-check.
  const real = [d.at, ...comments.filter((c) => !(c.body || "").includes("<!-- stale-check ")).map((c) => new Date(c.created_at))].sort((a, b) => b - a)[0];
  const fmt = real.toISOString().slice(0, 16).replace("T", " ") + " UTC";
  return `<!-- stale-check ${today} -->\nNo update from ${d.agent} in 24 h. Last activity: ${fmt}.\n\n_Posted by the board-keeper workflow (no AI)._`;
}

// ---------- status table ----------

function buildStatus({ issues, prs, linked, sprint, today, istTime, staleToday }) {
  const work = issues.filter((i) => i.title !== STATUS_TITLE);
  const untrustedNums = work.filter((i) => blockReason(i) === "untrusted").map((i) => i.number);
  const trustedIssues = work.filter((i) => blockReason(i) !== "untrusted");
  const cell = (xs) => (xs.length ? xs.join("; ") : "—");
  const note = (i) => {
    const l = labelNames(i);
    return `#${i.number} ${priorityName(l)}`;
  };

  const rows = AGENTS.map((a) => {
    const mine = trustedIssues
      .filter((i) => labelNames(i).has(a.label))
      .sort((x, y) => priorityOf(labelNames(x)) - priorityOf(labelNames(y)) || x.number - y.number);
    const cols = { pr: [], now: [], wait: [], later: [] };
    for (const i of mine) {
      const prsFor = linked.get(i.number) || [];
      const reason = blockReason(i);
      if (prsFor.length) cols.pr.push(`#${i.number} (PR ${prsFor.map((p) => "#" + p.number).join(", ")})`);
      else if (reason) cols.wait.push(`${note(i)}, ${reason}`);
      else if (sprint && i.milestone && i.milestone.number === sprint.number) cols.now.push(note(i));
      else cols.later.push(`${note(i)}${i.milestone ? ", " + i.milestone.title : ", no sprint"}`);
    }
    for (const p of prs) {
      const ag = agentOfBranch(p.head.ref);
      if (ag && ag.key === a.key && ![...prIssueNumbers(p)].some((n) => mine.some((i) => i.number === n))) cols.pr.push(`PR #${p.number}`);
    }
    return `| ${a.name} | ${cell(cols.pr)} | ${cell(cols.now)} | ${cell(cols.wait)} | ${cell(cols.later)} |`;
  });

  const shared = trustedIssues.filter((i) => ownersOf(i).length > 1);
  const bullet = (xs) => (xs.length ? xs.map((x) => `- ${x}`).join("\n") : "- None.");
  const approval = trustedIssues.filter((i) => blockReason(i) === "needs approval").map((i) => `#${i.number} ${i.title}`);
  const waitingRavi = trustedIssues
    .filter((i) => labelNames(i).has("blocked") || (labelNames(i).has("owner:ravi") && ownersOf(i).length === 1))
    .map((i) => `#${i.number} ${i.title}${labelNames(i).has("blocked") ? " (blocked)" : ""}`);

  return [
    `**Status, ${today} ${istTime} IST${sprint ? ` (${sprint.title})` : " (no current sprint)"}**`,
    "",
    "**By agent**",
    "",
    "| Agent | Open PR | Can start now (current sprint) | Waiting on approval / blocked | Later sprint |",
    "|---|---|---|---|---|",
    ...rows,
    "",
    `Shared tickets: ${shared.length ? shared.map((i) => "#" + i.number).join(", ") : "none"}.`,
    "",
    "**Open PRs (Claude reviews these; the workflow does not)**",
    bullet(prs.map((p) => `#${p.number} ${p.title} (${p.head.ref})`)),
    "",
    "**Needs your approval**",
    bullet(approval),
    "",
    "**Waiting on Ravi**",
    bullet(waitingRavi),
    "",
    "**No update in 24 h**",
    bullet(staleToday.map((n) => `#${n}`)),
    "",
    `**Ignored untrusted issues:** ${untrustedNums.length ? untrustedNums.map((n) => "#" + n).join(", ") : "none"}.`,
    "",
    `<!-- board-keeper status ${today} -->`,
    "_Posted by the board-keeper workflow (no AI)._",
  ].join("\n");
}

// ---------- main ----------

async function run({ github, context, core, now = new Date(), dryRun = true, forceStatus = false }) {
  const { owner, repo } = context.repo;
  const { date: today, hour, minute } = istParts(now);
  const istTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const actions = [];
  const act = async (what, fn) => {
    actions.push(what);
    core.info(`${dryRun ? "[dry run] would " : ""}${what}`);
    if (!dryRun) await fn();
  };

  const all = await github.paginate(github.rest.issues.listForRepo, { owner, repo, state: "open", per_page: 100 });
  const issues = all.filter((i) => !i.pull_request);
  const prs = await github.paginate(github.rest.pulls.list, { owner, repo, state: "open", per_page: 100 });
  const milestones = await github.paginate(github.rest.issues.listMilestones, { owner, repo, state: "open", per_page: 100 });
  const sprint = currentSprint(milestones, today);
  core.info(`IST ${today} ${istTime}; current sprint: ${sprint ? sprint.title : "none"}`);

  const linked = new Map();
  for (const p of prs) for (const n of prIssueNumbers(p)) linked.set(n, [...(linked.get(n) || []), p]);

  const comments = new Map();
  const labelEvents = new Map();
  for (const i of issues) {
    comments.set(i.number, await github.paginate(github.rest.issues.listComments, { owner, repo, issue_number: i.number, per_page: 100 }));
    labelEvents.set(i.number, labelNames(i).has("jules") ? await github.paginate(github.rest.issues.listEvents, { owner, repo, issue_number: i.number, per_page: 100 }) : []);
  }

  // 1. Stale checks
  const staleToday = [];
  for (const i of issues) {
    const cs = comments.get(i.number);
    if (cs.some((c) => (c.body || "").includes(`<!-- stale-check ${today} -->`))) { staleToday.push(i.number); continue; }
    const body = staleCheck(i, cs, labelEvents.get(i.number), linked.get(i.number) || [], now, today);
    if (body) {
      staleToday.push(i.number);
      await act(`post stale-check on #${i.number}`, () => github.rest.issues.createComment({ owner, repo, issue_number: i.number, body }));
    }
  }

  // 2. Jules dispatch: one open PR and one dispatched-but-unfinished ticket per agent
  const julesPR = prs.some((p) => (agentOfBranch(p.head.ref) || {}).key === "gemini");
  const julesBusy = issues.some((i) => blockReason(i) !== "untrusted" && dispatches(i, comments.get(i.number), labelEvents.get(i.number)).some((d) => d.agent === "Jules"));
  if (!sprint) core.info("No current sprint: nothing is dispatched.");
  else if (julesPR || julesBusy) core.info(`Jules already has ${julesPR ? "an open PR" : "a dispatched ticket"}: no new dispatch.`);
  else {
    const pick = issues
      // Only tickets whose single owner is Gemini: a second owner label is a hand-off
      // (for example Ravi supplies the facts first), which only a brief explains.
      .filter((i) => ownersOf(i).length === 1 && labelNames(i).has("owner:gemini") && !blockReason(i) && i.milestone && i.milestone.number === sprint.number)
      .filter((i) => hasBrief(comments.get(i.number)) && !(linked.get(i.number) || []).length)
      .sort((a, b) => priorityOf(labelNames(a)) - priorityOf(labelNames(b)) || a.number - b.number)[0];
    if (pick) {
      await act(`add the jules label to #${pick.number}`, () => github.rest.issues.addLabels({ owner, repo, issue_number: pick.number, labels: ["jules"] }));
      const body = [
        "<!-- dispatched jules -->",
        "Jules: follow the agent-brief above and AGENTS.md.",
        "",
        "<!-- agent-update -->",
        "**Update: board-keeper workflow, dispatched**",
        `- Did: added the \`jules\` label (${priorityName(labelNames(pick))}, ${sprint.title}).`,
        "- Next: Jules posts a started update, then a PR or a blocked update within 24 h.",
        "- Needs from Ravi: nothing",
        "- PR: none",
        "",
        "_Posted by the board-keeper workflow (no AI)._",
      ].join("\n");
      await act(`post the dispatch comment on #${pick.number}`, () => github.rest.issues.createComment({ owner, repo, issue_number: pick.number, body }));
    } else core.info("No eligible owner:gemini ticket with a brief in the current sprint.");
  }

  // 3. Daily status, once a day at or after 18:00 IST on weekdays (or when forced)
  const weekday = new Date(now.getTime() + IST_OFFSET_MS).getUTCDay();
  if (forceStatus || (hour >= 18 && weekday >= 1 && weekday <= 5)) {
    let statusIssue = issues.find((i) => i.title === STATUS_TITLE && i.user.login === OWNER_LOGIN);
    const already = statusIssue && comments.get(statusIssue.number).some((c) => (c.body || "").includes(`<!-- board-keeper status ${today} -->`));
    if (already) core.info(`Daily status for ${today} is already posted.`);
    else {
      const body = buildStatus({ issues, prs, linked, sprint, today, istTime, staleToday });
      if (!statusIssue && !dryRun) {
        statusIssue = (await github.rest.issues.create({ owner, repo, title: STATUS_TITLE, labels: ["type:ops"] })).data;
      }
      await act(`post the daily status on #${statusIssue ? statusIssue.number : "(new Daily status issue)"}`, () => github.rest.issues.createComment({ owner, repo, issue_number: statusIssue.number, body }));
      if (dryRun) core.summary.addRaw(body + "\n");
    }
  }

  core.summary.addHeading(dryRun ? "Board keeper (dry run): planned actions" : "Board keeper: actions", 3);
  core.summary.addList(actions.length ? actions : ["none"]);
  await core.summary.write();
  return actions;
}

module.exports = { run, istParts, sprintRange, currentSprint, blockReason, hasDoneWhen, prIssueNumbers, dispatches, staleCheck, buildStatus };
