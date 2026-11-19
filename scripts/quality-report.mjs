#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {parse} from 'node:path';
function csv(p){const lines=readFileSync(p,'utf8').trim().split(/\r?\n/);return lines.slice(1).filter(Boolean);}
const features=csv('qa/feature-registry.csv'); const scenarios=csv('qa/test-scenario-registry.csv'); const trace=csv('qa/traceability.csv');
const report={generatedAt:new Date().toISOString(),featuresIndexed:features.length,scenariosIndexed:scenarios.length,traceabilityRows:trace.length,qualityStatus:features.length&&features[0].includes('PENDING_CLARIFICATION')?'NEEDS_REVIEW':'READY'};
mkdirSync('evidence',{recursive:true});writeFileSync('evidence/quality-report.json',JSON.stringify(report,null,2)+'\n');writeFileSync('evidence/QUALITY-REPORT.md',`# Parent Plus Quality Report\n\n- Features indexed: ${report.featuresIndexed}\n- Scenarios indexed: ${report.scenariosIndexed}\n- Traceability rows: ${report.traceabilityRows}\n- Status: **${report.qualityStatus}**\n\nThis report separates registry coverage from executed test pass rate. Template rows are not passed tests.\n`);console.log(JSON.stringify(report));
