import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { buildLocalPostgresReplay } from '../sql/build-local-postgres-replay.mjs'

test('local replay keeps all16 original sources/history and bounds initialization principals',()=>{
 const p=buildLocalPostgresReplay()
 assert.equal(p.migrations.length,16)
 assert.deepEqual([...p.bootstrap.matchAll(/create role (\w+)/g)].map(m=>m[1]),['postgres','anon','authenticated','service_role'])
 assert.match(p.bootstrap,/Wrong local initialization identity\/version/)
 assert.match(p.bootstrap,/Local initialization target not fresh/)
 assert.doesNotMatch(p.bootstrap,/password|cli_login|drop |truncate /i)
 for(const m of p.migrations){
  const original=readFileSync(new URL(`../../supabase/migrations/${m.name}`,import.meta.url),'utf8')
  assert.ok(m.sql.includes(original))
  assert.match(m.sql,/set local statement_timeout='30s'/)
  assert.ok(m.sql.includes(`values('${m.version}'`))
  assert.match(m.sha256,/^[a-f0-9]{64}$/)
 }
})
