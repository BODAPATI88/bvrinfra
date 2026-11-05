// node --test .github/scripts/test/board-keeper.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const bk = require("../board-keeper.js");

const OWNER = { login: "BODAPATI88" };
const issue = (n, labels, extra = {}) => ({
  number: n, title: `Ticket ${n}`, user: OWNER, labels: labels.map((name) => ({ name })),
  body: "## Why\nx\n\n## Done when\n- [ ] y\n", created_at: "2026-10-01T00:00:00Z", milestone: null, ...extra,
});
const comment = (body, at, login = "BODAPATI88") => ({ body, created_at: at, user: { login } });
const sprint3 = { number: 3, state: "open", title: "Sprint 3 · 26 Oct–1 Nov 2026", due_on: "2026-10-31T00:00:00Z" };

test("IST date and hour", () => {
  assert.deepEqual(bk.istParts(new Date("2026-10-26T12:30:00Z")), { date: "2026-10-26", hour: 18, minute: 0 });
  assert.equal(bk.istParts(new Date("2026-10-26T19:00:00Z")).date, "2026-10-27");
});

test("sprint ranges from milestone titles", () => {
  assert.deepEqual(bk.sprintRange(sprint3), { start: "2026-10-26", end: "2026-11-01" });
  assert.deepEqual(bk.sprintRange({ title: "Sprint 1 · 8–14 Oct 2026" }), { start: "2026-10-08", end: "2026-10-14" });
  assert.deepEqual(bk.sprintRange({ title: "Sprint 9 · 28 Dec–3 Jan 2027" }), { start: "2026-12-28", end: "2027-01-03" });
  assert.deepEqual(bk.sprintRange({ title: "Later", due_on: "2026-11-07T00:00:00Z" }), { start: "2026-11-01", end: "2026-11-07" });
  assert.equal(bk.currentSprint([sprint3], "2026-10-26").number, 3);
  assert.equal(bk.currentSprint([sprint3], "2026-11-02"), null);
});

test("eligibility follows the assignment policy", () => {
  assert.equal(bk.blockReason(issue(1, ["owner:gemini", "P3"])), null);
  assert.equal(bk.blockReason(issue(1, ["owner:gemini"], { user: { login: "someone" } })), "untrusted");
  assert.equal(bk.blockReason(issue(1, ["untrusted"])), "untrusted");
  assert.equal(bk.blockReason(issue(1, ["blocked"])), "blocked");
  assert.equal(bk.blockReason(issue(1, ["P1"])), "needs approval");
  assert.equal(bk.blockReason(issue(1, ["P1", "approved"])), null);
  assert.equal(bk.blockReason(issue(1, ["type:infra", "approved", "needs-approval"])), "needs approval");
  assert.equal(bk.blockReason(issue(1, [], { body: "just text, done when you like" })), "no Done-when list");
  assert.equal(bk.hasDoneWhen("### Done when\n\n- [ ] a"), true);
});

test("PRs link to issues by description or branch", () => {
  assert.deepEqual([...bk.prIssueNumbers({ body: "Closes #89\n", head: { ref: "jules/89-backup" } })], [89]);
  assert.deepEqual([...bk.prIssueNumbers({ body: "Part of BODAPATI88/bvrinfra#116", head: { ref: "x" } })], [116]);
  assert.deepEqual([...bk.prIssueNumbers({ body: "", head: { ref: "main-fix" } })], []);
});

test("stale-check: due after 24 h quiet, once per day, not with a PR or blocked", () => {
  const now = new Date("2026-10-28T05:00:00Z");
  const i = issue(89, ["owner:gemini", "jules", "P3"]);
  const cs = [comment("<!-- dispatched jules -->\nJules: go", "2026-10-26T13:00:00Z", "github-actions[bot]")];
  const body = bk.staleCheck(i, cs, [], [], now, "2026-10-28");
  assert.match(body, /^<!-- stale-check 2026-10-28 -->\nNo update from Jules in 24 h\. Last activity: 2026-10-26 13:00 UTC\./);
  assert.equal(bk.staleCheck(i, [...cs, comment("<!-- stale-check 2026-10-28 -->", "2026-10-28T04:30:00Z")], [], [], now, "2026-10-28"), null);
  assert.equal(bk.staleCheck(i, [...cs, comment("started", "2026-10-27T10:00:00Z", "google-labs-jules[bot]")], [], [], now, "2026-10-28"), null);
  assert.equal(bk.staleCheck(i, cs, [], [{ number: 5 }], now, "2026-10-28"), null);
  assert.match(bk.staleCheck(i, [...cs, comment("<!-- stale-check 2026-10-27 -->", "2026-10-27T04:30:00Z", "github-actions[bot]")], [], [], now, "2026-10-28"), /Last activity: 2026-10-26 13:00 UTC/);
  assert.equal(bk.staleCheck(issue(89, ["owner:gemini", "jules", "blocked"]), cs, [], [], now, "2026-10-28"), null);
});

test("stale-check ignores a Codex hand-off once the ticket left owner:chatgpt", () => {
  const cs = [comment("<!-- dispatched codex -->", "2026-10-08T12:35:00Z")];
  assert.equal(bk.staleCheck(issue(24, ["owner:ravi"]), cs, [], [], new Date("2026-10-26T12:00:00Z"), "2026-10-26"), null);
  assert.match(bk.staleCheck(issue(24, ["owner:chatgpt"]), cs, [], [], new Date("2026-10-26T12:00:00Z"), "2026-10-26"), /from Codex/);
});

test("stale-check ignores marker comments from other accounts", () => {
  const cs = [comment("<!-- dispatched jules -->", "2026-10-20T00:00:00Z", "mallory")];
  assert.equal(bk.staleCheck(issue(9, ["owner:gemini"]), cs, [], [], new Date("2026-10-26T12:00:00Z"), "2026-10-26"), null);
});

// ---- run() against a fake GitHub ----
function fakeGithub({ issues, prs = [], milestones = [sprint3], comments = {} }) {
  const writes = [];
  const rest = {
    issues: {
      listForRepo: "listForRepo", listMilestones: "listMilestones", listComments: "listComments", listEvents: "listEvents",
      addLabels: async (a) => writes.push(["label", a.issue_number, a.labels]),
      createComment: async (a) => writes.push(["comment", a.issue_number, a.body]),
      create: async (a) => { writes.push(["create", a.title]); return { data: { number: 999 } }; },
    },
    pulls: { list: "pulls" },
  };
  const paginate = async (fn, a) => ({
    listForRepo: issues, pulls: prs, listMilestones: milestones,
    listComments: comments[a && a.issue_number] || [], listEvents: [],
  })[fn];
  return { github: { rest, paginate }, writes };
}
const core = { info() {}, summary: { addRaw() { return this; }, addHeading() { return this; }, addList() { return this; }, async write() {} } };
const context = { repo: { owner: "BODAPATI88", repo: "bvrinfra" } };
const brief = { 73: [comment("<!-- agent-brief -->", "2026-10-16T00:00:00Z")], 89: [comment("<!-- agent-brief -->\nAgent: Jules", "2026-10-16T12:39:30Z")], 70: [comment("<!-- agent-brief -->", "2026-10-16T00:00:00Z")] };

test("dispatches the highest-priority gemini ticket with a brief, in the sprint", async () => {
  const issues = [
    issue(89, ["owner:gemini", "P3"], { milestone: sprint3 }),
    issue(70, ["owner:gemini", "P2"], { milestone: sprint3 }),
    issue(71, ["owner:gemini", "P0", "approved"], { milestone: sprint3 }), // no brief
    issue(72, ["owner:gemini", "P1"], { milestone: sprint3 }), // needs approval
    issue(73, ["owner:gemini", "owner:ravi", "P0", "approved"], { milestone: sprint3 }), // Ravi's part first
  ];
  const { github, writes } = fakeGithub({ issues, comments: brief });
  await bk.run({ github, context, core, now: new Date("2026-10-26T06:00:00Z"), dryRun: false });
  assert.deepEqual(writes[0], ["label", 70, ["jules"]]);
  assert.match(writes[1][2], /^<!-- dispatched jules -->/);
  assert.equal(writes.length, 2);
});

test("no dispatch when Jules has an open PR, an unfinished ticket, or when dry run", async () => {
  const issues = [issue(89, ["owner:gemini", "P3"], { milestone: sprint3 })];
  let f = fakeGithub({ issues, comments: brief, prs: [{ number: 1, title: "x", body: "Closes #50", head: { ref: "jules/50-x" } }] });
  await bk.run({ github: f.github, context, core, now: new Date("2026-10-26T06:00:00Z"), dryRun: false });
  assert.equal(f.writes.length, 0);
  f = fakeGithub({ issues: [...issues, issue(60, ["owner:gemini", "jules", "P3"], { milestone: sprint3 })], comments: brief });
  await bk.run({ github: f.github, context, core, now: new Date("2026-10-26T06:00:00Z"), dryRun: false });
  assert.ok(!f.writes.some((w) => w[0] === "label"));
  f = fakeGithub({ issues, comments: brief });
  const planned = await bk.run({ github: f.github, context, core, now: new Date("2026-10-26T06:00:00Z"), dryRun: true });
  assert.equal(f.writes.length, 0);
  assert.equal(planned.length, 2);
});

test("daily status posts once, after 18:00 IST on weekdays, with every owned issue in one column", async () => {
  const status = issue(43, ["owner:claude", "type:ops"], { title: "Daily status", body: "" });
  const issues = [
    status,
    issue(86, ["owner:claude", "P2", "type:infra", "approved"], { milestone: sprint3 }),
    issue(27, ["owner:claude", "owner:ravi", "P0", "approved"], { milestone: sprint3 }),
    issue(85, ["owner:ravi", "P2", "blocked"], { milestone: sprint3 }),
    issue(88, ["owner:gemini", "owner:ravi", "P2"]),
    issue(13, ["owner:gemini"], { user: { login: "mallory" } }),
  ];
  const prs = [{ number: 120, title: "Board keeper", body: "Closes #86", head: { ref: "claude/86-board-keeper" } }];
  let f = fakeGithub({ issues, prs, comments: {} });
  await bk.run({ github: f.github, context, core, now: new Date("2026-10-26T11:00:00Z"), dryRun: false }); // 16:30 IST
  assert.ok(!f.writes.some((w) => w[1] === 43));
  await bk.run({ github: f.github, context, core, now: new Date("2026-10-26T12:35:00Z"), dryRun: false }); // 18:05 IST
  const post = f.writes.find((w) => w[0] === "comment" && w[1] === 43)[2];
  assert.match(post, /\| Claude \| #86 \(PR #120\) \| #27 P0 \| — \| — \|/);
  assert.match(post, /\| Ravi \| — \| #27 P0 \| #85 P2, blocked \| #88 P2, no sprint \|/);
  assert.match(post, /\| Gemini \/ Jules \| — \| — \| — \| #88 P2, no sprint \|/);
  assert.match(post, /Shared tickets: #27, #88\./);
  assert.match(post, /Ignored untrusted issues:\*\* #13\./);
  assert.doesNotMatch(post, /mallory|Ticket 13/);
  f = fakeGithub({ issues, prs, comments: { 43: [comment("<!-- board-keeper status 2026-10-26 -->", "2026-10-26T12:31:00Z", "github-actions[bot]")] } });
  await bk.run({ github: f.github, context, core, now: new Date("2026-10-26T12:40:00Z"), dryRun: false });
  assert.ok(!f.writes.some((w) => w[1] === 43));
  f = fakeGithub({ issues, prs, comments: {} });
  await bk.run({ github: f.github, context, core, now: new Date("2026-10-24T13:00:00Z"), dryRun: false }); // Saturday
  assert.ok(!f.writes.some((w) => w[1] === 43));
});
