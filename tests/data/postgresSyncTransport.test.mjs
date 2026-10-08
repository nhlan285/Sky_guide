import assert from 'node:assert/strict'
import test from 'node:test'
import { Buffer } from 'node:buffer'
import { privateSyncColumns,privateSyncReader } from '../../src/server/postgresSyncRows.ts'
import { preparePrivateReadTransport,decodePrivateReadTransport } from '../../src/server/postgresSyncTransport.ts'

const structuredClone=globalThis.structuredClone

const limits={maxRows:10,maxBytes:4096}
const statement=(table='sync_generation',where='singleton=$1',values=[1,2],lock=true)=>({
 text:`select ${privateSyncColumns[table].join(',')} from sky_private.${table}${where?' where '+where:''} limit $${values.length}${lock?' for update':''}`,values,
})
const head=()=>preparePrivateReadTransport(statement(),limits)
function result(plan,rows,oids=plan.columns.map(()=>25)) {
 return {fields:[...plan.columns.map((name,i)=>({name,dataTypeID:oids[i],format:'text'})),
  ...['__sg_budget_ok','__sg_present'].map(name=>({name,dataTypeID:16,format:'text'}))],rows}
}

test('lowering accepts all79 static owner vocabularies, keeps bind values and original head lock once',()=>{
 for(const table of Object.keys(privateSyncColumns)) {
  const s=statement(table,'',[2],false),p=preparePrivateReadTransport(s,limits)
  assert.ok(p.statement.text.includes(`__sg_rows as materialized (${s.text})`))
  assert.deepEqual(p.statement.values,[2,10,4096]);assert.deepEqual(p.columns,privateSyncColumns[table])
 }
 const p=head();assert.equal(p.statement.text.match(/for update/g).length,1)
 assert.ok(p.statement.text.includes('left join'));assert.ok(p.statement.text.includes('case when b.ok then r.revision else null'))
 const list=preparePrivateReadTransport(statement('sync_acceptance','revision in($1,$2)',[1,2,3],false),limits)
 assert.deepEqual(list.statement.values,[1,2,3,10,4096])
})

test('rejects arbitrary/multiple SQL, columns, binds, identifiers, non-scalars and unbounded limits',()=>{
 const s=statement()
 for(const text of [s.text+';select 1',s.text.replace('sky_private','public'),s.text.replace('singleton,revision','revision,singleton'),
  s.text.replace('singleton=$1','singleton=$1 or true'),s.text.replace('singleton=$1','missing=$1'),s.text.replace('$2','$1'),
  s.text.replace('limit $2','limit 100'),s.text.replace('sync_generation','not_a_table'),'select sky_private.apply_sync_metadata_cas($1) as applied'])
  assert.throws(()=>preparePrivateReadTransport({...s,text},limits),/private SQL transport/)
 for(const values of [[1,11],[1,0],[1,2,3],[{},2],[Infinity,2],[undefined,2]])
  assert.throws(()=>preparePrivateReadTransport({...s,values},limits))
 for(const patch of [{maxRows:0},{maxRows:1.5},{maxRows:Number.MAX_SAFE_INTEGER},{maxBytes:0},{maxBytes:NaN}])
  assert.throws(()=>preparePrivateReadTransport(s,{...limits,...patch}))
})

test('scalar decode preserves nullable head, exact safe bigint, Unicode/text spelling and float8',()=>{
 const p=head(),r=result(p,[['1','9007199254740991',null,'2026-10-07T00:01:00.000500Z','t','t']],[23,20,20,25])
 assert.deepEqual(decodePrivateReadTransport(p,r),[{singleton:1,revision:9007199254740991,current_acceptance_revision:null,last_promoted_at:'2026-10-07T00:01:00.000500Z'}])
 const t=preparePrivateReadTransport(statement('acquisition_source_offer','',[1],false),limits)
 const raw=['á 🎶 " \\ \n','o','0','offer','f','t','14.99',null,'t','t']
 const rows=decodePrivateReadTransport(t,result(t,[raw],[25,25,23,25,16,16,701,25]))
 assert.equal(rows[0].item_id,raw[0]);assert.equal(rows[0].raw_money,14.99);assert.equal(rows[0].source_url,null)
 raw[6]='1e+100';assert.equal(decodePrivateReadTransport(t,result(t,[raw],[25,25,23,25,16,16,701,25]))[0].raw_money,1e100)
})

test('wire byte accounting uses UTF-8 and row/field/guard overhead with exact local boundaries',()=>{
 const s=statement('source_registry','',[1],false),p=preparePrivateReadTransport(s,{maxRows:1,maxBytes:26})
 const r=result(p,[['á🎶','t','t']]) //7 +3*4 +6 UTF-8 bytes +2 bool bytes =27.
 assert.throws(()=>decodePrivateReadTransport(p,r))
 const q=preparePrivateReadTransport(s,{maxRows:1,maxBytes:27})
 assert.deepEqual(decodePrivateReadTransport(q,r),[{id:'á🎶'}])
 assert.equal(Buffer.byteLength('á🎶'),6)
})

test('budget/empty guards reject malformed/truncated/mixed frames and never return partial success',()=>{
 const p=head(),nulls=p.columns.map(()=>null),oids=[23,20,20,25]
 assert.deepEqual(decodePrivateReadTransport(p,result(p,[[...nulls,'t','f']],oids)),[])
 for(const rows of [[],[[...nulls,'f','f']],[[...nulls,'t','f'],[...nulls,'t','t']],[[1,'0',null,null,'t','t']],
  [[...nulls,'t',null]],[[...nulls,'t','f','extra']],[[...nulls.slice(0,3),'secret','t','f']]])
  assert.throws(()=>decodePrivateReadTransport(p,result(p,rows,oids)))
 const r=result(p,[['1','0',null,null,'t','t']],oids)
 for(const patch of [{name:'forged'},{format:'binary'},{dataTypeID:1700}]) {
  const bad=structuredClone(r);Object.assign(bad.fields[0],patch)
  assert.throws(()=>decodePrivateReadTransport(p,bad))
 }
 const bad=structuredClone(r);bad.fields.at(-1).dataTypeID=25;assert.throws(()=>decodePrivateReadTransport(p,bad))
 const small=preparePrivateReadTransport(statement('source_registry','',[1],false),{maxRows:1,maxBytes:4096})
 assert.throws(()=>decodePrivateReadTransport(small,result(small,[['K01','t','t'],['K15','t','t']])))
})

test('unsupported NULL types, unsafe or fractional integers and nonfinite float values fail closed',()=>{
 const p=head(),oids=[23,20,20,25]
 for(const revision of ['9007199254740992','-9007199254740992','1.5','1e2',' 1','NaN'])
  assert.throws(()=>decodePrivateReadTransport(p,result(p,[['1',revision,null,null,'t','t']],oids)))
 for(const singleton of ['2147483648','-2147483649'])
  assert.throws(()=>decodePrivateReadTransport(p,result(p,[[singleton,'0',null,null,'t','t']],oids)))
 const bad=result(p,[[null,null,null,null,'t','f']],oids);bad.fields[1].dataTypeID=114
 assert.throws(()=>decodePrivateReadTransport(p,bad))
 const f=preparePrivateReadTransport(statement('acquisition_source_offer','',[1],false),limits)
 for(const money of ['NaN','Infinity','-Infinity','1e999','1e-999','0x10',''])
  assert.throws(()=>decodePrivateReadTransport(f,result(f,[['i','o','0','offer','f','t',money,null,'t','t']],[25,25,23,25,16,16,701,25])))
})

test('original reader LIMIT+1 overflow probe still rejects after bounded lowering; inputs are snapshotted',async()=>{
 const seen=[],connection={query:async(s,l)=>{
  const p=preparePrivateReadTransport(s,l);seen.push(p)
  return decodePrivateReadTransport(p,result(p,[['K01','t','t'],['K15','t','t']]))
 }}
 const reader=privateSyncReader(connection,{maxRows:1,maxBytes:4096})
 await assert.rejects(()=>reader.select('source_registry'))
 assert.deepEqual(seen[0].statement.values,[2,2,4096])
 const s=statement(),l={...limits},p=preparePrivateReadTransport(s,l)
 s.values[0]=100;l.maxBytes=1
 assert.equal(p.statement.values[0],1);assert.equal(p.limits.maxBytes,4096)
 assert.ok(Object.isFrozen(p.statement.values));assert.ok(Object.isFrozen(p.columns))
})
