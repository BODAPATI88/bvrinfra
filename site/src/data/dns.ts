// Counted from the Terraform file at build time, so the site can never show a stale number (#101).
// One `type = "…"` line per record in infra/terraform/main.tf.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function dnsRecordCount(): number | null {
  try {
    const tf = readFileSync(resolve(process.cwd(), "../infra/terraform/main.tf"), "utf8");
    return (tf.match(/^\s+type\s+=\s+"[A-Z]+"/gm) ?? []).length || null;
  } catch {
    return null;
  }
}
