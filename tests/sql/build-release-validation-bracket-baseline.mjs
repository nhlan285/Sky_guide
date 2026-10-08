import assert from 'node:assert/strict'
import { readFileSync,writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import { Buffer } from 'node:buffer'
import { buildReleaseValidationBracketProposal,verifyReleaseValidationBracketHooks } from './build-release-validation-bracket-proposal.mjs'

// Separate executable85 baseline. Historical79/83 profiles stay unchanged.
// Initial installation acceptance requires the source-pinned SQL guard, not an
// adopted catalog hash. Later whole receipts must match exactly after ROLLBACK.
export function buildReleaseValidationBracketBaseline(originalAuditQuery){
 const p=buildReleaseValidationBracketProposal()
 assert.match(originalAuditQuery,/as preflight from/)
 const names=p.tables.concat(['release_validation_clock','release_validation_witness'])
 const counts=names.map(t=>`'${t}',(select count(*) from sky_private.${t})`)
 const groups=[counts.slice(0,50),counts.slice(50)].filter(g=>g.length)
 const allCounts=groups.map(g=>`jsonb_build_object(${g.join(',')})`).join('||')
 const hooks=`(select jsonb_agg(jsonb_build_object('table',c.relname,'name',t.tgname,'function',f.proname,'functionSchema',fn.nspname,'type',t.tgtype,'enabled',t.tgenabled,'deferrable',t.tgdeferrable,'deferred',t.tginitdeferred,'args',t.tgnargs,'argBytes',encode(t.tgargs,'hex'),'columns',t.tgattr::text,'condition',pg_get_expr(t.tgqual,t.tgrelid),'oldTransition',t.tgoldtable,'newTransition',t.tgnewtable,'constraint',t.tgconstraint<>0) order by c.relname collate pg_catalog."C",t.tgname collate pg_catalog."C") from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc f on f.oid=t.tgfoid join pg_namespace fn on fn.oid=f.pronamespace where n.nspname='sky_private' and not t.tgisinternal and t.tgname in('release_validation_write_enter','release_validation_write_leave','validation_cache_no_truncate'))`
 const query=p.files['release-validation-bracket-after-check.sql']+p.emptyAfterGuard+`
select jsonb_build_object('preflight',old.preflight,'privateCounts',${allCounts},
 'clock',(select to_jsonb(r) from sky_private.release_validation_clock r),
 'witness',coalesce((select jsonb_agg(to_jsonb(r) order by catalog_version) from sky_private.release_validation_witness r),'[]'::jsonb),
 'hooks',${hooks}) as bracket_baseline from (${originalAuditQuery.trim().replace(/;$/,'')}) old;\n`
 return {query,counts:p.counts}
}
export function verifyReleaseValidationBracketBaseline(actual,expected){
 const p=buildReleaseValidationBracketProposal()
 verifyReleaseValidationBracketHooks(actual.hooks,p)
 assert.deepEqual(Object.keys(actual.privateCounts).sort(),p.tables.concat(['release_validation_clock','release_validation_witness']).sort())
 for(const [table,count]of Object.entries(actual.privateCounts))assert.equal(count,['sync_generation','sync_commit_control','release_validation_clock'].includes(table)?1:0,table)
 assert.deepEqual(actual.clock,{singleton:1,epoch:0,write_depth:0,writer_xid:null})
 assert.deepEqual(actual.witness,[])
 if(expected)assert.deepEqual(actual,expected,'Whole85 baseline drift: STOP')
 return {tables:85,hooks:p.hooks.length,empty:true,exactRollback:!!expected}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!process.argv[2]||!process.argv[3])throw new Error('Provide original audit receipt and E-drive query output')
 const previous=JSON.parse(readFileSync(process.argv[2],'utf8'))
 const p=buildReleaseValidationBracketBaseline(previous.query)
 writeFileSync(process.argv[3],p.query)
 process.stdout.write(JSON.stringify({status:'SOURCE PINNED85 GUARD',counts:p.counts,bytes:Buffer.byteLength(p.query)})+'\n')
}
