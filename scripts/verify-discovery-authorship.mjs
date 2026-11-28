import { readFileSync, realpathSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

export function authoredDiscovery({rows,root,folder,slug}) {
 const documents=["SUMMARY.md","ACCEPTANCE.md","PRODUCT_THINKING.md"];
 if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw Error("Invalid assigned slug");
 const base=resolve(root,folder,slug);
 const expected=new Set(documents.map(doc=>join(base,doc)));
 const results=new Map();
 for(const r of rows.filter(r=>r.type==="user")) for(const t of r.message?.content??[]) if(t.type==="tool_result") results.set(t.tool_use_id,t);
 const authored=new Map();
 for(const r of rows.filter(r=>r.type==="assistant")) for(const t of r.message?.content??[]) {
   if(t.type!=="tool_use") continue;
   if(t.name!=="Write"||typeof t.input?.file_path!=="string"||typeof t.input?.content!=="string") throw Error("Unexpected tool invocation");
   const path=resolve(root,t.input.file_path);
   if(!expected.has(path)) throw Error("Write outside assigned documents");
   const receipt=results.get(t.id);
   if(receipt&&!receipt.is_error) authored.set(path,t.input.content);
 }
 for(const path of expected) {
   const text=authored.get(path);
   if(!text?.trim()||realpathSync(path)!==path||readFileSync(path,"utf8")!==text) throw Error("Missing or mismatched actual agent Write evidence: "+path);
 }
 const result=rows.filter(r=>r.type==="result").at(-1);
 const report=result?.result;
 if(result?.is_error||typeof report!=="string"||!report.trim()||/<!--\s*ai-org:/i.test(report)) throw Error("Missing substantive final agent report or forbidden marker");
 return report.trim()+"\n\n<!-- ai-org:contract-candidate "+slug+" -->\n";
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
 const [log,root,folder,slug]=process.argv.slice(2);
 const rows=readFileSync(log,"utf8").trim().split("\n").filter(Boolean).map(s=>JSON.parse(s));
 process.stdout.write(authoredDiscovery({rows,root,folder,slug}));
}
