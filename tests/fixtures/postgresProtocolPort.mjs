import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { emptyTables } from './postgresSyncStore.mjs'

// Protocol/control model, NOT a SQL engine, socket, SDK, role or concurrent-session
// proof. Expected table frames are supplied independently by SourceSync fixtures.
export function protocolPool(initial=emptyTables(),settings={}) {
 let committed=globalThis.structuredClone(initial)
 const leases=[],pool={leases,settings,get tables(){return globalThis.structuredClone(committed)},async acquire(signal){
  const lease={key:{},queries:[],released:false,discarded:false,aborts:[],state:'I',local:globalThis.structuredClone(committed),
   release(){lease.released=true;if(settings.releaseError)throw new Error('PRIVATE secret release')},
   discard(){lease.discarded=true;if(settings.discardError)throw new Error('PRIVATE secret discard')},
   async query(s,signal) {
    assert.ok(!lease.discarded);lease.queries.push(globalThis.structuredClone(s))
    signal.addEventListener('abort',()=>lease.aborts.push(s.text),{once:true})
    const empty=(command,status=lease.state)=>({command,status,fields:[],rows:[]})
    if(settings.beforeQuery) await settings.beforeQuery(s,signal,lease)
    let result
    if(s.text.startsWith('begin ')) {lease.state='T';result=empty('BEGIN')}
    else if(s.text==='rollback') {lease.state='I';lease.local=globalThis.structuredClone(committed);result=empty('ROLLBACK')}
    else if(s.text==='commit') {
     if(settings.commitRollback){lease.state='I';result=empty('ROLLBACK')}
     else {committed=globalThis.structuredClone(lease.local);lease.state='I';result=empty('COMMIT')}
    }else if(s.text.startsWith('set ')) result=empty('SET')
    else if(s.text.startsWith('with __sg_rows as materialized (')) {
     const start='with __sg_rows as materialized ('.length,end=s.text.indexOf('),\n__sg_budget'),original=s.text.slice(start,end)
     const parsed=/^select (.+) from sky_private\.([a-z_0-9]+)(?: where (.+?))? limit \$\d+(?: for update)?$/.exec(original)
     assert.ok(parsed);const [,cols,table,where]=parsed,columns=cols.split(','),values=s.values.slice(0,-2)
     let rows=lease.local[table]
     if(where) {
      const eq=/^([a-z_0-9]+)=\$1$/.exec(where),list=/^revision in\(.+\)$/.exec(where)
      assert.ok(eq||list)
      rows=rows.filter(r=>eq?r[eq[1]]===values[0]:values.slice(0,-1).includes(r.revision))
     }
     rows=rows.slice(0,values.at(-1))
     const oids=columns.map(c=>{const v=rows.find(r=>r[c]!==null)?.[c];return typeof v==='boolean'?16:typeof v==='number'?c==='raw_money'||!Number.isInteger(v)?701:20:25})
     const bytes=rows.reduce((sum,r)=>sum+17+4*columns.length+columns.reduce((n,c)=>n+(r[c]===null?0:Buffer.byteLength(String(r[c]))),0),0)
     const ok=rows.length<=s.values.at(-2)&&bytes<=s.values.at(-1)
     const wire=v=>v===null?null:typeof v==='boolean'?v?'t':'f':String(v)
     result={command:'SELECT',status:lease.state,
      fields:[...columns.map((name,i)=>({name,dataTypeID:oids[i],format:'text'})),...['__sg_budget_ok','__sg_present'].map(name=>({name,dataTypeID:16,format:'text'}))],
      rows:ok&&rows.length?rows.map(r=>[...columns.map(c=>wire(r[c])),'t','t']):[[...columns.map(()=>null),ok?'t':'f','f']]}
    }else if(s.text.startsWith('select sky_private.apply_sync_metadata_cas(')) {
     const next=settings.nextTables?.(s.values[1]+1,s.values[0])
     if(next)lease.local=globalThis.structuredClone(next)
     result={command:'SELECT',status:lease.state,fields:[{name:'applied',dataTypeID:16,format:'text'}],rows:[[settings.casFalse?'f':'t']]}
    }else if(s.text.startsWith('insert into ')) result=empty('INSERT')
    else if(s.text.startsWith('delete from ')) result=empty('DELETE')
    else if(s.text.startsWith('update ')) result=empty('UPDATE')
    else throw new Error('Unexpected synthetic protocol SQL')
    return settings.afterQuery?await settings.afterQuery(s,signal,lease,result):result
   },
  };leases.push(lease)
  return settings.afterAcquire?await settings.afterAcquire(lease,signal):lease
 }}
 return pool
}

export const kernelLimits={connectMs:5000,statementMs:5000,lockMs:2000,idleMs:10000,transactionMs:20000,cleanupMs:1000,maxInputBytes:4000000}
