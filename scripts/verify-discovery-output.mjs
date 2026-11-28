import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { normalizeProductDocsFolder } from "./product-docs.mjs";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MARK = /(?:^|\n)<!-- ai-org:contract-candidate ([a-z0-9]+(?:-[a-z0-9]+)*) -->\s*$/;
const DOCS = ["SUMMARY.md", "ACCEPTANCE.md", "PRODUCT_THINKING.md"];
const fail = reason => ({ok:false, reason});

export function verifyDiscoveryOutput({before, after, expectedSlug="", resolveContract}) {
  if (!Array.isArray(before) || !Array.isArray(after)) return fail("comment evidence unavailable");
  if (expectedSlug && !SLUG.test(expectedSlug)) return fail("invalid expected feature slug");
  const ids = new Set(before.map(c => String(c.id)));
  if (after.some(c => c?.id != null && !ids.has(String(c.id)) && typeof c.body === "string" && /<!-- ai-org:contract-ready [a-z0-9-]+ -->/.test(c.body))) return fail("premature contract-ready marker; only the workflow may publish it");
  const fresh = after.filter(c => c?.id != null && !ids.has(String(c.id)) && c.user?.login === "github-actions[bot]" && typeof c.body === "string" && MARK.test(c.body));
  if (fresh.length !== 1) return fail("expected exactly one new bot contract-candidate report");
  const report = fresh[0];
  const marker = report.body.match(MARK);
  const slug = marker[1];
  if (expectedSlug && slug !== expectedSlug) return fail("report slug does not match the assigned feature");
  if (!report.body.slice(0, marker.index).trim()) return fail("contract report has no substantive body");
  let contract;
  try { contract = resolveContract(slug); } catch { return fail("remote contract branch or artifacts unavailable"); }
  if (!contract || !/^[0-9a-f]{40}$/.test(contract.head)) return fail("remote contract head unavailable");
  for (const doc of DOCS) {
    if (typeof contract.files?.[doc] !== "string" || !contract.files[doc].trim()) return fail("missing or empty " + doc);
  }
  return {ok:true, slug, head:contract.head, commentId:String(report.id)};
}

export function renderVerifiedReport(result, after) {
  if (!result.ok) throw new Error("cannot publish an unverified contract");
  const report=after.find(c=>String(c.id)===result.commentId);
  const marker=report?.body?.match(MARK);
  if (!marker || marker[1]!==result.slug) throw new Error("report evidence changed");
  return report.body.slice(0,marker.index).trim()+"\n\nVerified remote contract commit: `"+result.head+"` (candidate comment "+result.commentId+").\n\n<!-- ai-org:contract-ready "+result.slug+" -->\n";
}

export function resolveRemoteContract(slug, cwd = process.cwd(), docsFolder = "docs/product") {
  if (!SLUG.test(slug)) throw new Error("invalid slug");
  const docs = normalizeProductDocsFolder(docsFolder);
  const git = args => execFileSync("git",args,{cwd,encoding:"utf8",stdio:["ignore","pipe","pipe"],maxBuffer:1024*1024}).trim();
  git(["fetch","--no-tags","origin","refs/heads/ai/contract-"+slug]);
  const head=git(["rev-parse","--verify","FETCH_HEAD^{commit}"]);
  const files=Object.fromEntries(DOCS.map(doc => [doc,git(["show",head+":"+docs+"/"+slug+"/"+doc])]));
  return {head,files};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , beforePath, afterPath, expectedSlug="", reportPath, docsFolder="docs/product"] = process.argv;
  let result;
  try {
    const after=JSON.parse(readFileSync(afterPath,"utf8"));
    result=verifyDiscoveryOutput({before:JSON.parse(readFileSync(beforePath,"utf8")),after,expectedSlug,resolveContract:slug=>resolveRemoteContract(slug,process.cwd(),docsFolder)});
    if (result.ok && reportPath) writeFileSync(reportPath,renderVerifiedReport(result,after));
  } catch { result=fail("could not read authoritative comment evidence"); }
  console.log(JSON.stringify(result));
  process.exitCode=result.ok?0:1;
}
