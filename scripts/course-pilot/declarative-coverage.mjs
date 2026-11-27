// Course declarative author coverage gate. No model or reference-test generation.
// It rejects omitted or temporally misplaced assertions; executable clean/mutant
// grading and separate reviewer provenance remain mandatory.
export const COURSE_IDS=Object.freeze(Array.from({length:6},(_,i)=>'CRS-01-SC-00'+(i+1)).concat('GUARD-CRS-FLAG-OFF'));
const tabs=['Today','Schedule','Feedback','Students','Fees'];
const initial=['Course title','Stage 1 title','Stage 1 objective 1'],full=[...initial,'Stage 1 objective 2','Stage 2 title','Stage 2 objective 1'];
const pilot='Course pilot — not synced',leave='Leave your unsaved changes?';
const eq=(op,k,v,w)=>Array.isArray(op)&&op[0]===k&&(v===undefined||op[1]===v)&&(w===undefined||op[2]===w);
const at=(ops,k,v,w,start=-1)=>ops.findIndex((op,i)=>i>start&&eq(op,k,v,w));
const after=(ops,start,...p)=>{let i=start;for(const [k,v,w] of p){i=at(ops,k,v,w,i);if(i<0)return -1;}return i};
const value=(ops,label,end)=>{let v;for(let i=0;i<end;i++)if(eq(ops[i],'F',label))v=ops[i][2];return v};
const nonblank=v=>typeof v==='string'&&v.trim().length>0;
const exactList=(a,b)=>Array.isArray(a)&&a.length===b.length&&a.every((x,i)=>x===b[i]);
export function coverageIssues(a){
 const issues=[];
 if(!a||typeof a!=='object'||Array.isArray(a)||!a.cases||Object.keys(a.cases).sort().join()!==[...COURSE_IDS].sort().join())return [{id:'ALL',reason:'Exactly six locked cases and one guard required'}];
 const run=(id,fn)=>{const ops=a.cases[id];if(!Array.isArray(ops)||ops.some(o=>!Array.isArray(o))){issues.push({id,reason:'Invalid operation list'});return;}const need=(ok,reason)=>{if(!ok)issues.push({id,reason})};fn(ops,need)};
 run(COURSE_IDS[0],(o,n)=>{
  const entry=at(o,'B','Courses');n(entry>=0,'Open Courses');
  n(entry>=0&&[['H','Courses'],['X',pilot],['X','No courses yet'],['VB','Create course'],...tabs.map(t=>['VT',t])].every(([k,v])=>at(o,k,v,undefined,entry)>=0),'After entry prove heading, honest pilot label, empty state, Create course and all five original tabs');
 });
 run(COURSE_IDS[1],(o,n)=>{
  const form=after(o,-1,['B','Courses'],['B','Create course']),save=at(o,'B','Save draft',undefined,form);
  n(form>=0&&save>form&&initial.every(l=>at(o,'I',l,undefined,form)>=0&&at(o,'I',l,undefined,form)<save),'Prove all three accessible inputs before invalid save');
  n(save>=0&&!nonblank(value(o,'Course title',save))&&initial.slice(1).every(l=>nonblank(value(o,l,save))),'Attempt blank title with valid nonblank stage and objective');
  const error=at(o,'X','Course title is required',undefined,save);
  n(save>=0&&error>save&&initial.slice(1).every(l=>at(o,'V',l,value(o,l,save),error)>=0),'Visible validation error followed by preservation of both entered fields');
  const discard=after(o,error,['T','Today'],['X',leave],['B','Discard and leave'],['B','Courses'],['X','No courses yet']);
  n(error>=0&&discard>error,'Discard invalid draft and reopen list to prove no course was created');
 });
 run(COURSE_IDS[2],(o,n)=>{
  const form=after(o,-1,['B','Courses'],['B','Create course']),save=at(o,'B','Save draft',undefined,form),stage=at(o,'B','Add stage',undefined,form);
  const objective=o.findIndex((op,i)=>i>form&&(eq(op,'B','Add objective to stage 1')||eq(op,'B','Add objective',0)));
  n(form>=0&&save>form&&stage>form&&stage<save&&objective>form&&objective<save,'Add stage and exact stage-one objective before saving');
  n(stage>=0&&objective>=0&&at(o,'F','Stage 2 title',undefined,stage)>=0&&at(o,'F','Stage 2 objective 1',undefined,stage)>=0&&at(o,'F','Stage 1 objective 2',undefined,objective)>=0,'Fill the newly added stage and objective after their creation');
  const values=Object.fromEntries(full.map(l=>[l,value(o,l,save)]));
  n(save>=0&&full.every(l=>nonblank(values[l])),'Save all six nonblank field values');
  const edit=after(o,save,['X',values['Course title']],['X','Draft'],['B','Edit course']);
  n(save>=0&&edit>save&&full.every(l=>at(o,'V',l,values[l],edit)>=0),'After save prove exact draft title and state, reopen and verify every restored field');
  n(edit>=0&&o.some((op,i)=>i>edit&&eq(op,'O')&&exactList(op[1],full)),'Prove complete restored stage/objective field order after reopening');
 });
 run(COURSE_IDS[3],(o,n)=>{
  const form=after(o,-1,['B','Courses'],['B','Create course']),s1=at(o,'B','Save draft',undefined,form),p1=after(o,s1,['B','Publish version'],['VB','Confirm publish'],['B','Confirm publish'],['X','Version 1']);
  const edit=at(o,'B','Edit course',undefined,p1),s2=at(o,'B','Save draft',undefined,edit),p2=after(o,s2,['B','Publish version'],['VB','Confirm publish'],['B','Confirm publish'],['X','Version 2']);
  const first=value(o,'Course title',s1),second=value(o,'Course title',s2);
  n(form>=0&&s1>form&&p1>s1&&edit>p1&&s2>edit&&p2>s2,'Two save-before-publish flows, each with visible confirmation and version evidence');
  n(nonblank(first)&&nonblank(second)&&first!==second&&at(o,'F','Course title',second,edit)>=0&&at(o,'F','Course title',second,edit)<s2,'Use two different titles with second title edited and saved before publishing');
  const h=at(o,'B','View history',undefined,p2);
  n(p2>=0&&h>p2&&['Version 1','Version 2',first,second].every(v=>nonblank(v)&&at(o,'X',v,undefined,h)>=0&&at(o,'N',v,1,h)>=0),'History must show each exact version and distinct original title exactly once');
 });
 run(COURSE_IDS[4],(o,n)=>{
  const form=after(o,-1,['B','Courses'],['B','Create course']),t=at(o,'T','Today',undefined,form),k=after(o,t,['X',leave],['B','Keep editing']);
  const vals=initial.map(l=>[l,value(o,l,t)]).filter(([,v])=>nonblank(v));
  n(form>=0&&t>form&&k>t&&vals.length>=2&&vals.some(([l])=>l==='Course title'),'Dirty form with title and another field, Today, actual confirmation, Keep editing');
  const t2=at(o,'T','Today',undefined,k);
  n(k>=0&&t2>k&&vals.every(([l,v])=>{const i=at(o,'V',l,v,k);return i>=0&&i<t2}),'Keep editing preserves all populated fields before leaving again');
  n(t2>=0&&after(o,t2,['X',leave],['B','Discard and leave'],['B','Courses'],['X','No courses yet'])>t2,'Second confirmation, discard, reopen Courses and prove unsaved draft absent');
 });
 run(COURSE_IDS[5],(o,n)=>{
  const form=after(o,-1,['B','Courses'],['B','Create course']),save=at(o,'B','Save draft',undefined,form),title=value(o,'Course title',save),visible=at(o,'X',title,undefined,save),again=after(o,visible,['T','Today'],['B','Courses'],['X',title]);
  n(form>=0&&save>form&&initial.every(l=>nonblank(value(o,l,save)))&&visible>save&&again>visible,'Save valid draft, prove title before navigating and again after returning from Today');
  n(again>=0&&at(o,'X',pilot,undefined,again)>=0&&at(o,'NET',undefined,undefined,again)>=0,'After returning prove honest local-only label and zero observed course/curriculum traffic');
 });
 run(COURSE_IDS[6],(o,n)=>{
  n(after(o,-1,['VT','Today'],['NB','Courses'],['NET'])>=0,'Flag-off requires authenticated Today, absent Courses entry, and NET');
 });
 return issues;
}
export function assertCourseCoverage(a){const issues=coverageIssues(a);if(issues.length)throw Error('Incomplete locked acceptance coverage: '+JSON.stringify(issues));return true;}
