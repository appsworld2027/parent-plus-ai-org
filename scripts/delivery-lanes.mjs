// Conservative, deterministic scheduling. Scope declarations are read from the product's main checkout.
const SLUG = /^[a-z0-9-]+$/;
const KINDS = ["files", "migrations", "apis", "rules"];
const token = /^[-a-zA-Z0-9_./:]+$/;
export function validScope(scope) {
  return !!scope && Array.isArray(scope.dependsOn) &&
    scope.dependsOn.every(s => typeof s === "string" && SLUG.test(s)) &&
    KINDS.every(k => Array.isArray(scope[k]) && scope[k].every(v =>
      typeof v === "string" && token.test(v) && !v.startsWith("/") &&
      !v.split("/").some(p => p === "." || p === ".." || p === ""))) &&
    scope.files.length > 0;
}
function overlaps(a, b) {
  const x = a.toLowerCase(), y = b.toLowerCase();
  return x === y || x.startsWith(y + "/") || y.startsWith(x + "/");
}
export function scopesConflict(a, b) {
  if (!validScope(a) || !validScope(b)) return true;
  return KINDS.some(k => a[k].some(x => b[k].some(y => overlaps(x, y))));
}
export function activeFeatureSlug(item) {
  const values = [];
  const title = String(item.title || "").match(/^Discovery: .+ \[([a-z0-9-]+)\]$/);
  if (title) values.push(title[1]);
  const branch = String(item.headRefName || "").match(/^ai\/contract-([a-z0-9-]+)$/);
  if (branch) values.push(branch[1]);
  const base = String(item.baseRefName || "").match(/^ai\/contract-([a-z0-9-]+)$/);
  if (base) values.push(base[1]);
  for (const match of String(item.body || "").matchAll(/(?:ai\/contract-|docs\/product\/)([a-z0-9-]+)(?=[\s\x60/.,;)]|$)/g)) values.push(match[1]);
  const unique = [...new Set(values)];
  return unique.length === 1 ? unique[0] : null;
}
export function selectDeliveryItems({ items = [], active = [], scopes = {}, completed = [], maxLanes = 1 }) {
  const cap = Math.max(1, Math.min(2, Number.isInteger(maxLanes) ? maxLanes : 1));
  const occupied = new Set(active.map(activeFeatureSlug));
  if (occupied.has(null) || occupied.size >= cap) return [];
  const selected = [];
  for (const item of items) {
    const slug = item.slug;
    if (!SLUG.test(slug) || occupied.has(slug)) continue;
    const scope = Object.hasOwn(scopes, slug) ? scopes[slug] : undefined;
    // Legacy work is allowed alone; malformed declared scope never launches.
    if (scope !== undefined && !validScope(scope)) continue;
    if (scope && !scope.dependsOn.every(d => d !== slug && completed.includes(d))) continue;
    if (occupied.size && (!scope || [...occupied].some(s =>
      !Object.hasOwn(scopes, s) || scopesConflict(scope, scopes[s])))) continue;
    selected.push(item);
    occupied.add(slug);
    if (occupied.size >= cap || !scope) break;
  }
  return selected;
}
