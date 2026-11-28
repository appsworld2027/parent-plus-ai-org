#!/usr/bin/env node
// Per-product contract directory, distinct from locked acceptance tests and memory.
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_PRODUCT_DOCS_FOLDER = "docs/product";
export function normalizeProductDocsFolder(value = DEFAULT_PRODUCT_DOCS_FOLDER) {
  if (typeof value !== "string") throw new Error("product.docsFolder must be a repository-relative docs directory");
  const folder = value.replace(/\/$/, "");
  if (!/^docs\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(folder) ||
      folder === "docs/ai-memory" || folder.startsWith("docs/ai-memory/")) {
    throw new Error("product.docsFolder must be a distinct directory below docs/ (not docs/ai-memory)");
  }
  return folder;
}
export const resolveProductDocsFolder = (manifest = {}) =>
  normalizeProductDocsFolder(manifest?.product?.docsFolder);
export function readProductDocsFolder(root = ".") {
  const path = join(root, ".ai-org", "manifest.json");
  return resolveProductDocsFolder(existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {});
}
const isMain = () => {
  try { return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); }
  catch { return false; }
};
if (isMain()) console.log(readProductDocsFolder(process.argv[2] || "."));
