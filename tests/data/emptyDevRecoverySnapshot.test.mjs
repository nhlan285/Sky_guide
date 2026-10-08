import test from 'node:test'
import assert from 'node:assert/strict'
import { buildReleaseValidationBracketProposal } from '../sql/build-release-validation-bracket-proposal.mjs'
import { buildEmptyDevRecoverySnapshot,verifyEmptyDevRecoverySnapshot,buildEmptyDevRecoveryManifest } from '../sql/build-empty-dev-recovery-snapshot.mjs'

test('empty recovery snapshot rejects retained fixtures, missing owners and unexpected fields',()=>{
 const singleton={sync_generation:[{singleton:1,revision:0,current_acceptance_revision:null,last_promoted_at:null}],sync_commit_control:[{singleton:1,active_intent_id:null}],release_validation_clock:[{singleton:1,epoch:0,write_depth:0,writer_xid:null}]}
 const actual={format:'sky-guide-empty-dev-snapshot-v1',tables:buildReleaseValidationBracketProposal().tables.concat(['release_validation_clock','release_validation_witness']).sort().map(name=>({name,rows:singleton[name]??[]}))}
 assert.equal(verifyEmptyDevRecoverySnapshot(actual).rows,3)
 const sql=buildEmptyDevRecoverySnapshot()
 assert.match(sql,/read only/);assert.match(sql,/statement_timeout='30s'/);assert.match(sql,/rollback;/)
 assert.doesNotMatch(sql,/pg_authid|auth\.|rolpassword|grant |delete |insert |update /i)
 for(const mutate of [a=>a.tables.pop(),a=>a.tables[0].rows.push({fixture:true}),a=>a.tables.find(t=>t.name==='sync_generation').rows[0].revision=1,a=>a.secret='unexpected']){
  const bad=JSON.parse(JSON.stringify(actual));mutate(bad);assert.throws(()=>verifyEmptyDevRecoverySnapshot(bad))
 }
 const manifest=buildEmptyDevRecoveryManifest(actual,'source guard',{roles:[]})
 assert.equal(manifest.migrations.length,16);assert.match(manifest.snapshotSha256,/^[a-f0-9]{64}$/)
 assert.match(manifest.restoreStatus,/NOT RUN/);assert.match(manifest.warning,/not pg_dump/)
 assert.throws(()=>buildEmptyDevRecoveryManifest(actual,'source guard',{roles:[{name:'cli_login_postgres'}]}))
})
