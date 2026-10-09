'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('guarded Apps Script workflow preserves before-backup and rollback',()=>{
 const p=fs.readFileSync(path.join(__dirname,'..','scripts','deploy-apps-script.ps1'),'utf8');
 for(const k of ['TARGET_SCRIPT_ID_MISMATCH','BACKUP_SHA256','STAGING_VALIDATION=PASS','PUSH_VERIFY=PASS','AUTOMATIC_ROLLBACK=START','RELEASE_RESULT=AUDIT_PASS'])assert.ok(p.includes(k),k);
 assert.doesNotMatch(p,/clasp deploy|deployments\.update|ScriptApp\.newDeployment/i);
});
