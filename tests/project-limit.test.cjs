'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
function harness(rows){
 const context=vm.createContext({
   Date,AG24_CONFIG:{MAX_TOTAL_PROJECTS_PER_DAY:250,MAX_PROJECTS_PER_EMAIL_PER_DAY:3},
   cleanEmail_:v=>String(v||'').trim().toLowerCase(),
   getProjectsSheet_:()=>({getDataRange:()=>({getValues:()=>[['id','email',...Array(9).fill('')],...rows]})})
 });
 vm.runInContext(read('Security.js'),context);
 return context;
}
const row=(email)=>{const result=Array(11).fill('');result[1]=email;result[10]=new Date().toISOString();return result;};
test('total project creation cap holds for rotating email addresses',()=>{
 const ctx=harness(Array.from({length:250},(_,i)=>row('u'+i+'@example.test')));
 assert.throws(()=>ctx.enforceCreationLimit_('another@example.test'),/Capacité quotidienne atteinte/);
});
test('per-email cap still holds for free projects',()=>{
 const ctx=harness([row('user@example.test'),row('user@example.test'),row('user@example.test')]);
 assert.throws(()=>ctx.enforceCreationLimit_('user@example.test'),/limite quotidienne/);
 assert.doesNotThrow(()=>ctx.enforceCreationLimit_('other@example.test'));
});
