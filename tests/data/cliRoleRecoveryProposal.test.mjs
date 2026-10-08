import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCliRoleRecoveryProposal,verifyCliRoleRecoveryGuard } from '../sql/build-cli-role-recovery-proposal.mjs'

test('CLI role recovery is review-only, fixed to dev, guarded against active/changed/dependent roles',()=>{
 const {guard,request}=buildCliRoleRecoveryProposal()
 assert.ok(guard.startsWith('begin isolation level read committed read only;'))
 assert.ok(guard.endsWith('rollback;\n'));assert.ok(guard.includes("statement_timeout='30s'"))
 assert.doesNotMatch(guard,/\b(?:create|alter|drop|grant|revoke|commit|password)\b/i)
 for(const marker of ['Managed CLI role set changed','attributes/expiry changed','Observed CLI memberships changed','CLI backend still active','CLI role settings exist','CLI role owns/depends on shared objects'])assert.ok(guard.includes(marker))
 assert.ok(guard.includes("g.oid=10 and g.rolsuper and not a.admin_option and not a.inherit_option and a.set_option"))
 assert.equal(request.method,'DELETE')
 assert.equal(request.url,'https://api.supabase.com/v1/projects/tpbydviuknovimroeodm/cli/login-role')
 assert.deepEqual(request.allowedPresentRoles,['cli_login_postgres'])
 assert.equal(request.status,'PROPOSED / NOT APPROVED / NOT RUN')
 assert.match(request.rollback,/irreversible/);assert.match(request.rollback,/No automatic remint/)
 const receipt={guard:'PASS',role:'cli_login_postgres',expired:true,sessions:0,dependencies:0}
 assert.equal(verifyCliRoleRecoveryGuard(receipt).cleanupRun,false)
 for(const mutate of [r=>r.expired=false,r=>r.sessions=1,r=>r.dependencies=1,r=>r.role='postgres',r=>r.extra='unknown']){
  const bad=globalThis.structuredClone(receipt);mutate(bad);assert.throws(()=>verifyCliRoleRecoveryGuard(bad))
 }
 // Synthetic receipts do not authorize cleanup or prove native guard execution.
})
