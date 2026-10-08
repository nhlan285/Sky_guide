import assert from 'node:assert/strict'
import { readFileSync,writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import process from 'node:process'
import { localEnvironment,localSql } from './local-postgres-environment.mjs'
import { nativeJson } from './run-local-postgres-rehearsal.mjs'
import { buildLocalDurableSnapshot,verifyLocalDurableSnapshot } from './local-durable-snapshot.mjs'

// Cache witnesses contain cluster-local transaction IDs. Force the full original
// current-canonical predicate after restore. Archived releases pin older identity
// revisions: their immutable projection bytes remain independently authoritative.
const sql=`begin isolation level read committed read write;
set local statement_timeout='30s';
delete from sky_private.release_validation_witness;
do $full$ declare version text; rejected boolean:=false;begin
 select a.catalog_version into strict version from sky_private.sync_generation g
 join sky_private.sync_acceptance a on a.revision=g.current_acceptance_revision;
 perform sky_private.validate_release_epoch(version);
 begin
  perform sky_private.validate_release_epoch('fixture-release');
 exception when raise_exception then
  if sqlerrm<>'Invalid release membership/order' then raise;end if;
  rejected:=true;
 end;
 if not rejected or (select count(*) from sky_private.public_release)<>2
 or (select count(*) from sky_private.release_validation_witness)<>1
 or exists(select 1 from sky_private.release_validation_witness w cross join sky_private.release_validation_clock c where w.transaction_id<>pg_current_xact_id() or w.epoch<>c.epoch)
 then raise exception 'Fresh full-validation witnesses differ';end if;
end;$full$;
select jsonb_build_object('releases',2,'currentFullPredicate',true,'archivedRevisionDriftRejected',true,'pid',pg_backend_pid());
rollback;`

function verifyImmutableProjections(snapshot){
 const rows=name=>snapshot.tables.find(t=>t.name===name).rows
 const sha=text=>createHash('sha256').update(text).digest('hex')
 const files=rows('release_projection_file')
 assert.equal(rows('release_projection').length,2)
 assert.equal(files.length,10)
 for(const p of rows('release_projection')){
  assert.equal(sha(p.manifest_text),p.manifest_sha256)
  const manifest=JSON.parse(p.manifest_text)
  assert.equal(manifest.catalogVersion,p.catalog_version)
  for(const f of files.filter(f=>f.catalog_version===p.catalog_version)){
   assert.equal(sha(f.content),f.sha256)
   const entry=f.dataset==='provenance'?manifest.provenance:manifest.datasets[f.dataset]
   assert.equal(entry.path,f.path);assert.equal(entry.sha256,f.sha256)
   assert.equal(JSON.parse(f.content).dataVersion,p.catalog_version)
  }
 }
}

export async function runLocalRestoredValidation(){
const proof=[]
for(const [n,name]of localEnvironment.names.entries()){
 const expected=JSON.parse(readFileSync(join(localEnvironment.root,n===0?'after-cas-snapshot.json':'restored-snapshot.json'),'utf8'))
 const snapshotSql=buildLocalDurableSnapshot()
 const before=nativeJson(await localSql(name,snapshotSql,{log:`${name}-full-validation-before.log`}),'ROLLBACK')
 verifyLocalDurableSnapshot(before,expected)
 verifyImmutableProjections(before)
 const receipt=nativeJson(await localSql(name,sql,{log:`${name}-full-validation.log`}),'ROLLBACK')
 assert.equal(receipt.releases,2);assert.equal(receipt.currentFullPredicate,true)
 assert.equal(receipt.archivedRevisionDriftRejected,true)
 const after=nativeJson(await localSql(name,snapshotSql,{log:`${name}-full-validation-after.log`}),'ROLLBACK')
 verifyLocalDurableSnapshot(after,before)
 proof.push({name,...receipt,immutableManifests:2,immutableFiles:10,all85AfterRollbackExact:true})
}
writeFileSync(join(localEnvironment.root,'local-full-restored-validation-PASS.json'),JSON.stringify(proof,null,2)+'\n',{flag:'wx'})
return proof
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 process.stdout.write(JSON.stringify(await runLocalRestoredValidation())+'\n')
}
