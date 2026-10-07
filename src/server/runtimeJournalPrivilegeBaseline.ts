import { createHash } from 'node:crypto'
import { runtimePrivilegeBaseline } from './runtimePrivilegeBaseline.ts'

// PROPOSED83-owner catalog, NOT native-verified. Old79-owner baseline stays intact.
// Function bodies pinned to the reviewed proposal with qualified receipt columns;
// trigger strings predict
// pg_get_triggerdef formatting from the earlier native snapshot. Any difference
// fails preflight; never auto-adopt a newly fetched catalog to make it pass.
export const journalSchemaSha256='4ad16e6200129114098936f1b0408fd78050e6a3413f299d0b857ec6ee5eeb7e'
const functions=[
 {name:'lock_sync_commit_control',args:'',result:'void',bodyMd5:'5be330824b6d0433ebfc0ebffc546535'},
 {name:'activate_sync_commit_intent',args:'p_id uuid',result:'boolean',bodyMd5:'8ac9042beccb2a375fea981894f16858'},
 {name:'require_sync_commit_intent',args:'p_id uuid, p_digest text',result:'boolean',bodyMd5:'9c29849ec4863db7d7c7008a9f4adae1'},
 {name:'validate_sync_commit_applied',args:'',result:'trigger',bodyMd5:'b713a6b3c837b058e785dae849bf879a'},
 {name:'apply_sync_commit_cas',args:'p_id uuid, p_digest text',result:'boolean',bodyMd5:'56f86ce4cb9ae19086a03262cdebd818'},
 {name:'validate_sync_commit_receipt',args:'',result:'trigger',bodyMd5:'0d307e56ac221702db5a8a215639be93'},
 {name:'settle_sync_commit_intent',args:'p_id uuid, p_resolution text',result:'boolean',bodyMd5:'623932212a2f94c44b63f6bedba02df9'},
 {name:'guard_sync_commit_control',args:'',result:'trigger',bodyMd5:'4b374f597a8529a1d7d0fe5330df68ee'},
 {name:'validate_sync_commit_intent_owner',args:'',result:'trigger',bodyMd5:'10a52a867434028190942015df89e94f'},
 {name:'validate_sync_commit_generation',args:'',result:'trigger',bodyMd5:'aa45537bb18167877f669e40feea3814'},
] as const
const triggers=[
 ['sync_commit_applied','sync_commit_applied_validate','validate_sync_commit_applied','CREATE TRIGGER','BEFORE INSERT','FOR EACH ROW'],
 ['sync_commit_receipt','sync_commit_receipt_validate','validate_sync_commit_receipt','CREATE TRIGGER','BEFORE INSERT','FOR EACH ROW'],
 ['sync_commit_control','sync_commit_control_permanent','guard_sync_commit_control','CREATE TRIGGER','BEFORE DELETE OR UPDATE','FOR EACH ROW'],
 ['sync_commit_intent','sync_commit_intent_owner','validate_sync_commit_intent_owner','CREATE CONSTRAINT TRIGGER','AFTER INSERT','DEFERRABLE INITIALLY DEFERRED FOR EACH ROW'],
 ['sync_generation','sync_commit_generation','validate_sync_commit_generation','CREATE CONSTRAINT TRIGGER','AFTER UPDATE','DEFERRABLE INITIALLY DEFERRED FOR EACH ROW'],
 ...['sync_commit_intent','sync_commit_control','sync_commit_applied','sync_commit_receipt'].map(t=>[t,'commit_no_truncate','guard_sync_history','CREATE TRIGGER','BEFORE TRUNCATE','FOR EACH STATEMENT']),
 ...['sync_commit_intent','sync_commit_applied','sync_commit_receipt'].map(t=>[t,'commit_immutable','guard_sync_history','CREATE TRIGGER','BEFORE DELETE OR UPDATE','FOR EACH ROW']),
]
export const journalTriggerDefinitions=triggers.map(([table,name,fn,create,event,mode])=>({table,name,function:fn,
 definition:`${create} ${name} ${event} ON sky_private.${table} ${mode} EXECUTE FUNCTION sky_private.${fn}()`}))
export const runtimeJournalPrivilegeBaseline={
 tables:[...runtimePrivilegeBaseline.tables,
  {name:'sync_commit_intent',rls:true,columns:['id','format_version','source_id','expected_revision','target_revision','state_digest','outcome','attempt_completed_at',
   'next_failures','next_retry_at','next_health','next_success_at','next_valid_until','global_source_id','global_catalog_version','global_content_hash','global_source_hash',
   'global_candidate_hash','global_normalization_version','global_base_revision','global_fetched_at','global_staged_at','global_reviewer_ref','global_reviewed_at','global_promoted_at','global_valid_until']},
  {name:'sync_commit_control',rls:true,columns:['singleton','active_intent_id']},
  {name:'sync_commit_applied',rls:true,columns:['intent_id','revision','state_digest']},
  {name:'sync_commit_receipt',rls:true,columns:['intent_id','resolution']},
 ],
 functions:[...runtimePrivilegeBaseline.functions,...functions],
 triggers:[...runtimePrivilegeBaseline.triggers,...journalTriggerDefinitions.map(({definition,...t})=>({...t,definitionMd5:createHash('md5').update(definition).digest('hex')}))],
} as const
// Additional proposed physical-column guard; names alone cannot attest generated
// target, UUID/text transport types or nullability. pg_get_expr spelling is still
// predicted until native verification and must never be silently auto-adopted.
const required:Record<string,readonly string[]>={sync_commit_intent:['id','format_version','source_id','expected_revision','state_digest','outcome','attempt_completed_at','next_failures'],
 sync_commit_control:['singleton'],sync_commit_applied:['intent_id','revision','state_digest'],sync_commit_receipt:['intent_id','resolution']}
export const runtimeJournalColumnBaseline=runtimeJournalPrivilegeBaseline.tables.filter(t=>Object.hasOwn(required,t.name)).flatMap(t=>t.columns.map((name,i)=>({
 table:t.name,position:i+1,name,type:['id','intent_id','active_intent_id'].includes(name)?'uuid':['format_version','singleton'].includes(name)?'integer':
  ['expected_revision','target_revision','next_failures','global_base_revision','revision'].includes(name)?'bigint':'text',
 notNull:required[t.name].includes(name),generated:name==='target_revision'?'s':'',defaultExpression:name==='target_revision'?'(expected_revision + 1)':null,
}))).sort((a,b)=>a.table<b.table?-1:a.table>b.table?1:a.position-b.position)
