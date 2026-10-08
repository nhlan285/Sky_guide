import assert from 'node:assert/strict'
import { buildSyncCommitAdapterRehearsal } from './build-sync-commit-adapter-rehearsal.mjs'

// Reuse the complete original adapter assertions, but reproduce each callback's
// transaction isolation and terminal boundary in a separate native invocation.
// This prepares engine durability evidence, not a real kernel wire driver/ACK-loss.
export async function buildLocalDurableAdapter(){
 const p=await buildSyncCommitAdapterRehearsal()
 const markers=[...p.sql.matchAll(/^-- Adapter callback (\d+); original (begin isolation level (?:read committed read write|repeatable read read only))\. Original COMMIT boundaries are NOT reproduced\.$/gm)]
 assert.equal(markers.length,p.callbacks)
 const first=p.sql.slice(0,markers[0].index)
 assert.ok(first.startsWith('begin isolation level read committed read write;'))
 const seed=first+'commit;\n'
 const callbacks=[]
 let final
 for(const [i,m] of markers.entries()){
  assert.equal(Number(m[1]),i+1)
  let body=p.sql.slice(m.index+m[0].length,markers[i+1]?.index??p.sql.length).trim()
  if(i===markers.length-1){
   const boundary="select jsonb_build_object('phases',5"
   const pos=body.lastIndexOf(boundary)
   assert.ok(pos>0);assert.ok(body.endsWith('rollback;'))
   final="begin isolation level repeatable read read only;\nset local statement_timeout='30s';\n"+body.slice(pos).replace(/rollback;$/,'commit;')+'\n'
   body=body.slice(0,pos).trim()
  }
  const negative=body.startsWith('do $negative$')
  assert.ok(body.endsWith(negative?'end;$negative$;':'end;$adapter$;'))
  const readonly=m[2].endsWith('read only')
  const isolation=readonly?'repeatable read':'read committed'
  const sql=`${m[2]};\nset local statement_timeout='30s';\nset local standard_conforming_strings=on;\n${body}\nselect jsonb_build_object('index',${i+1},'negative',${negative},'pid',pg_backend_pid(),'isolation',current_setting('transaction_isolation'),'readonly',current_setting('transaction_read_only')) as durable_callback;\n${negative?'rollback':'commit'};\n`
  callbacks.push({index:i+1,negative,readonly,isolation,sql})
 }
 assert.equal(callbacks.filter(c=>c.negative).length,p.negativeChecks)
 return {seed,callbacks,final,rows:p.rows,queryChecks:p.queryChecks,negativeChecks:p.negativeChecks,
  scope:'Local complete adapter assertions with separate native transactions; real wire driver/ACK-loss and CAS race not inferred'}
}

export function verifyLocalDurableBoundary(stdout,expected){
 const lines=stdout.trim().split(/\r?\n/).filter(Boolean)
 assert.equal(lines.at(-1),expected.negative?'ROLLBACK':'COMMIT','Native terminal acknowledgement differs')
 const json=lines.filter(l=>l.startsWith('{')).map(l=>JSON.parse(l))
 assert.equal(json.length,1)
 const r=json[0]
 assert.deepEqual(Object.keys(r).sort(),['index','negative','pid','isolation','readonly'].sort())
 assert.equal(r.index,expected.index);assert.equal(r.negative,expected.negative)
 assert.equal(r.isolation,expected.isolation);assert.equal(r.readonly,expected.readonly?'on':'off')
 assert.ok(Number.isInteger(r.pid)&&r.pid>0)
 return r
}
