import test from 'node:test'
import assert from 'node:assert/strict'
import { encodeText, decodeText, packFullK15Rehearsal } from '../sql/pack-full-k15-rehearsal.mjs'
import { buildFullK15ValidationRehearsal } from '../sql/build-full-k15-validation-rehearsal.mjs'

test('bounded transport dictionary preserves Unicode, SQL literals and special next-code sequences',()=>{
 for(const text of ['', 'A', 'ABABABA', "Sky 🌌 tiếng Việt 'quote' \\ path\n", 'repeat/'.repeat(2000)])assert.equal(decodeText(encodeText(text)),text)
 assert.throws(()=>decodeText({alphabet:['A'],codes:[12]}))
})

test('packed full K15 retains exact original statements/timing/deferred checks and transaction budget',async()=>{
 const original=await buildFullK15ValidationRehearsal(),packed=packFullK15Rehearsal(original.sql)
 assert.equal(packed.originalSha256,'24eb64bb37b73b958dfdcf83161fbc5daaa91685ae0c3474dbe4c295cde5911c')
 const start=original.sql.indexOf('do $cost$'),end=original.sql.indexOf('end;$cost$;',start)+'end;$cost$;'.length
 assert.equal(packed.body,original.sql.slice(start,end))
 assert.ok(packed.sql.startsWith(original.sql.slice(0,start)))
 assert.ok(packed.sql.endsWith(original.sql.slice(end)))
 assert.ok(packed.sql.indexOf(packed.bodySha256)<packed.sql.indexOf('execute native_sql;'))
 assert.ok(packed.wireBytes<1_500_000)
 assert.throws(()=>packFullK15Rehearsal(original.sql.replace('rollback;','commit;')))
 assert.throws(()=>packFullK15Rehearsal(original.sql.replace("statement_timeout='30s'","statement_timeout='60s'")))
})
