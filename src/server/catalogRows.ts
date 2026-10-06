import { SOURCE_IDS, validateDateTime, validateSourceRecords } from '../data/core/index.ts'
import type { PartialTime, SourceRecord } from '../data/core/index.ts'
import { validateItems, validateSeasonEvents, validateSpirits } from '../data/catalog/index.ts'
import type { CatalogContext, DomainMetadata, FieldProvenance, Item, SeasonEvent, Spirit } from '../data/catalog/types.ts'
import { validateLookupEntry, validateLookupMetadataList } from '../data/itemLookup/model.ts'
import type { LookupMetadata } from '../data/itemLookup/model.ts'
import type { Identity } from '../data/domain/identity.ts'
import { rangeErrors } from '../data/catalog/shared.ts'

// Explicit column vocabulary, also used by the future SQL driver. Never SELECT *
// or store an arbitrary record/document as the canonical payload.
const timeColumns = (prefix: string) => [`${prefix}_present`, `${prefix}_value`, `${prefix}_precision`, `${prefix}_timezone`, `${prefix}_raw_label`] as const
export const catalogColumns = {
  source_registry: ['id'],
  provenance: ['id','source_id','source_url','source_record_key','source_revision','retrieved_at','observed_at','attribution','license_note','transform_note','verification_status'],
  provenance_order: ['provenance_id','position'],
  domain_identity: ['kind','id','revision','schema_version','updated_at','retired_at','fixture'],
  identity_provenance: ['kind','id','provenance_id','position'],
  item: ['id','position','record_status','name_default','slot','raw_slot','accessory_anchor','dye_status','field_provenance_present'],
  spirit: ['id','position','record_status','name_default','category','realm_id','field_provenance_present'],
  season: ['id','position','record_status','name_default','kind',...timeColumns('starts_at'),...timeColumns('ends_at'),'time_status','summary'],
  item_translation: ['item_id','locale','text'], spirit_translation: ['spirit_id','locale','text'], season_translation: ['season_id','locale','text'],
  item_source_key: ['item_id','label','value'],
  item_season: ['item_id','season_id','position'], item_spirit: ['item_id','spirit_id','position'],
  spirit_season: ['spirit_id','season_id','position'], season_spirit: ['season_id','spirit_id','position'], season_item: ['season_id','item_id','position'],
  item_asset: ['item_id','asset_id','position'], item_rule: ['item_id','rule_id','position'], spirit_tree: ['spirit_id','tree_id','position'],
  season_realm: ['season_id','realm_id','position'], season_map: ['season_id','map_id','position'], season_article: ['season_id','article_id','position'],
  field_provenance_field: ['kind','id','field'], field_provenance: ['kind','id','field','provenance_id','position'],
  acquisition_option: ['item_id','option_id','position','kind','cost_status','friendship_node_id','iap_product_id',...timeColumns('valid_from'),...timeColumns('valid_to')],
  acquisition_cost: ['item_id','option_id','position','currency','source_currency_label','amount'],
  acquisition_provenance: ['item_id','option_id','provenance_id','position'],
  item_k15: ['id','position','upstream_id','identifier','category','category_evidence','image_present','images_present'],
  acquisition_source_offer: ['item_id','option_id','position','acquisition','season_pass','bundle','raw_money','source_url'],
} as const
export type CatalogTable = keyof typeof catalogColumns
export type SqlScalar = string | number | boolean | null
export type CatalogRow = Record<string, SqlScalar>
export type CatalogRows = Record<CatalogTable, CatalogRow[]>
export interface CatalogPayloads { items: Item[]; lookup: LookupMetadata[]; spirits: Spirit[]; seasons: SeasonEvent[]; provenance: SourceRecord[] }
export interface CatalogRowContext {
  deferred?: Partial<Pick<CatalogContext,'treeIds'|'nodeIds'|'realmIds'|'mapIds'|'articleIds'|'assetIds'|'ruleIds'|'iapProductIds'|'visitIds'>>
  identities?: readonly Identity[]
}
const invalid = (): never => { throw new Error('Invalid typed catalog rows') }
const str = (value: SqlScalar): string => typeof value === 'string' ? value : invalid()
const nullableString = (value: SqlScalar): string | null => value === null ? null : str(value)
const num = (value: SqlScalar): number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : invalid()
const flag = (value: SqlScalar): boolean => typeof value === 'boolean' ? value : invalid()
const refKey = (kind: string,id: string) => JSON.stringify([kind,id])
const tables = Object.keys(catalogColumns) as CatalogTable[]

function validate(payload: CatalogPayloads, options: CatalogRowContext): CatalogPayloads {
  const proof = validateSourceRecords(payload.provenance,new Set(SOURCE_IDS))
  if (!proof.valid) return invalid()
  const context: CatalogContext = {
    provenanceIds: new Set(proof.value.map(p => p.id)), itemIds: new Set(payload.items.map(p => p.id)),
    spiritIds: new Set(payload.spirits.map(p => p.id)),seasonIds: new Set(payload.seasons.map(p => p.id)),
    treeIds: new Set(),nodeIds: new Set(),realmIds: new Set(),mapIds: new Set(),articleIds: new Set(),assetIds: new Set(),ruleIds: new Set(),iapProductIds: new Set(),visitIds: new Set(),...options.deferred,
  }
  const items=validateItems(payload.items,context), spirits=validateSpirits(payload.spirits,context), seasons=validateSeasonEvents(payload.seasons,context), lookup=validateLookupMetadataList(payload.lookup)
  if (!items.valid || !spirits.valid || !seasons.valid || !lookup.valid) return invalid()
  const metadata=new Map(lookup.value.map(p => [p.id,p]))
  if (metadata.size!==lookup.value.length || metadata.size!==items.value.length || items.value.some(item => !validateLookupEntry(item,metadata.get(item.id),context).valid)) return invalid()
  // These typed modules are explicitly future-gated by R1; never silently drop.
  if (lookup.value.some(p => p.image!=null || p.images!=null)) throw new Error('Catalog media requires its reviewed typed module')
  const projectedLookup=lookup.value.map(({image,images,...entry}) => ({...entry,...(image===undefined?{}:{image}),...(images===undefined?{}:{images})}))
  return {items:items.value,lookup:projectedLookup,spirits:spirits.value,seasons:seasons.value,provenance:proof.value}
}
function timeRow(prefix: string,time: PartialTime | null): CatalogRow {
  return {[`${prefix}_present`]:time!==null,[`${prefix}_value`]:time?.value??null,[`${prefix}_precision`]:time?.precision??null,[`${prefix}_timezone`]:time?.timezone??null,[`${prefix}_raw_label`]:time?.rawLabel??null}
}

// Initial import/payload codec only. Trusted promotion owns identity history,
// revision allocation and transaction CAS; this function does not promote.
export function encodeCatalogRows(input: CatalogPayloads,options: CatalogRowContext={}): CatalogRows {
  const payload=validate(input,options)
  const rows=Object.fromEntries(tables.map(table => [table,[]])) as unknown as CatalogRows
  const add=(table: CatalogTable,row: CatalogRow) => { rows[table].push(row) }
  const identities=new Map((options.identities??[]).map(node => [refKey(node.kind,node.id),node]))
  if (identities.size!==options.identities?.length && options.identities) return invalid()
  const metadata=(kind: 'item'|'spirit'|'season',entry: DomainMetadata & {id:string;fieldProvenance?:FieldProvenance}) => {
    const old=identities.get(refKey(kind,entry.id))
    if (options.identities && !old) return invalid()
    if (old && (old.updatedAt!==entry.updatedAt || old.fixture!==entry.fixture || JSON.stringify(old.provenanceIds)!==JSON.stringify(entry.provenanceIds)
      || !Number.isSafeInteger(old.revision) || old.revision<1 || old.schemaVersion!==1)) return invalid()
    if (old?.retiredAt && (entry.recordStatus!=='retired' || !validateDateTime(old.retiredAt).valid
      || rangeErrors({value:old.retiredAt,precision:'instant',timezone:null,rawLabel:null},{value:entry.updatedAt,precision:'instant',timezone:null,rawLabel:null},[]).length)) return invalid()
    if (entry.recordStatus==='retired' && !old?.retiredAt) throw new Error('Retired payload requires its authoritative identity history')
    add('domain_identity',{kind,id:entry.id,revision:old?.revision??1,schema_version:1,updated_at:entry.updatedAt,retired_at:old?.retiredAt??null,fixture:entry.fixture})
    entry.provenanceIds.forEach((id,position) => add('identity_provenance',{kind,id:entry.id,provenance_id:id,position}))
    for (const [field,ids] of Object.entries(entry.fieldProvenance??{})) {
      add('field_provenance_field',{kind,id:entry.id,field})
      ids.forEach((id,position) => add('field_provenance',{kind,id:entry.id,field,provenance_id:id,position}))
    }
  }
  const translations=(kind:'item'|'spirit'|'season',id:string,texts:Record<string,string>) => {
    for (const [locale,text] of Object.entries(texts)) add(`${kind}_translation`,{[`${kind}_id`]:id,locale,text})
  }
  const joins=(table:CatalogTable,owner:string,id:string,target:string,ids:readonly string[]) => ids.forEach((to,position) => add(table,{[owner]:id,[target]:to,position}))
  for (const id of new Set(payload.provenance.map(p => p.sourceId))) add('source_registry',{id})
  payload.provenance.forEach((p,position) => {
    add('provenance',{id:p.id,source_id:p.sourceId,source_url:p.sourceUrl,source_record_key:p.sourceRecordKey,source_revision:p.sourceRevision,retrieved_at:p.retrievedAt,observed_at:p.observedAt,attribution:p.attribution,license_note:p.licenseNote,transform_note:p.transformNote,verification_status:p.verificationStatus})
    add('provenance_order',{provenance_id:p.id,position})
  })
  payload.items.forEach((p,position) => {
    metadata('item',p); translations('item',p.id,p.name.translations)
    add('item',{id:p.id,position,record_status:p.recordStatus,name_default:p.name.default,slot:p.slot,raw_slot:p.rawSlot,accessory_anchor:p.accessoryAnchor,dye_status:p.dyeStatus,field_provenance_present:Object.hasOwn(p,'fieldProvenance')})
    for (const [label,value] of Object.entries(p.sourceKeys)) add('item_source_key',{item_id:p.id,label,value})
    joins('item_season','item_id',p.id,'season_id',p.seasonIds);joins('item_spirit','item_id',p.id,'spirit_id',p.spiritIds)
    joins('item_asset','item_id',p.id,'asset_id',p.assetIds);joins('item_rule','item_id',p.id,'rule_id',p.ruleIds)
    p.acquisitionOptions.forEach((o,position) => {
      add('acquisition_option',{item_id:p.id,option_id:o.id,position,kind:o.kind,cost_status:o.costStatus,friendship_node_id:o.friendshipNodeId,iap_product_id:o.iapProductId,...timeRow('valid_from',o.validFrom),...timeRow('valid_to',o.validTo)})
      o.costs.forEach((c,position) => add('acquisition_cost',{item_id:p.id,option_id:o.id,position,currency:c.currency,source_currency_label:c.sourceCurrencyLabel,amount:c.amount}))
      o.provenanceIds.forEach((id,position) => add('acquisition_provenance',{item_id:p.id,option_id:o.id,provenance_id:id,position}))
    })
  })
  payload.spirits.forEach((p,position) => {
    metadata('spirit',p);translations('spirit',p.id,p.name.translations)
    add('spirit',{id:p.id,position,record_status:p.recordStatus,name_default:p.name.default,category:p.category,realm_id:p.realmId,field_provenance_present:Object.hasOwn(p,'fieldProvenance')})
    joins('spirit_season','spirit_id',p.id,'season_id',p.seasonIds);joins('spirit_tree','spirit_id',p.id,'tree_id',p.treeIds)
  })
  payload.seasons.forEach((p,position) => {
    metadata('season',p);translations('season',p.id,p.name.translations)
    add('season',{id:p.id,position,record_status:p.recordStatus,name_default:p.name.default,kind:p.kind,...timeRow('starts_at',p.startsAt),...timeRow('ends_at',p.endsAt),time_status:p.timeStatus,summary:p.summary})
    joins('season_spirit','season_id',p.id,'spirit_id',p.spiritIds);joins('season_item','season_id',p.id,'item_id',p.itemIds)
    joins('season_realm','season_id',p.id,'realm_id',p.realmIds);joins('season_map','season_id',p.id,'map_id',p.mapIds);joins('season_article','season_id',p.id,'article_id',p.officialArticleIds)
  })
  payload.lookup.forEach((p,position) => {
    add('item_k15',{id:p.id,position,upstream_id:p.upstreamId,identifier:p.identifier,category:p.category,category_evidence:p.categoryEvidence,image_present:Object.hasOwn(p,'image'),images_present:Object.hasOwn(p,'images')})
    p.offers.forEach((o,position) => add('acquisition_source_offer',{item_id:p.id,option_id:o.id,position,acquisition:o.acquisition,season_pass:o.seasonPass,bundle:o.bundle,raw_money:o.money,source_url:o.sourceUrl}))
  })
  return rows
}

export function decodeCatalogRows(rows: CatalogRows,options: CatalogRowContext={}): CatalogPayloads {
  if (Object.keys(rows).length!==tables.length || Object.keys(rows).some(table => !tables.includes(table as CatalogTable))) return invalid()
  const used=new Set<CatalogRow>(), indexes=new Map<string,Map<string,CatalogRow[]>>()
  for (const table of tables) {
    if (!Array.isArray(rows[table])) return invalid()
    for (const row of rows[table]) {
      const columns:readonly string[]=catalogColumns[table]
      if (!row || Object.keys(row).length!==columns.length || Object.keys(row).some(column => !columns.includes(column))
        || Object.values(row).some(value => value!==null && !['string','number','boolean'].includes(typeof value))) return invalid()
    }
  }
  const select=(table:CatalogTable,where:CatalogRow={}) => {
    const fields=Object.keys(where),indexKey=JSON.stringify([table,fields])
    let index=indexes.get(indexKey)
    if (!index) {
      index=new Map();indexes.set(indexKey,index)
      for (const row of rows[table]) { const key=JSON.stringify(fields.map(field => row[field]));const group=index.get(key)??[];group.push(row);index.set(key,group) }
    }
    const values=index.get(JSON.stringify(fields.map(field => where[field])))??[]
    values.forEach(row => used.add(row));return values
  }
  const one=(table:CatalogTable,where:CatalogRow) => { const found=select(table,where);return found.length===1?found[0]:invalid() }
  const ordered=(values:CatalogRow[]) => { const sorted=[...values].sort((a,b) => num(a.position)-num(b.position));if (sorted.some((row,index) => num(row.position)!==index)) return invalid();return sorted }
  const ids=(table:CatalogTable,where:CatalogRow,column:string) => ordered(select(table,where)).map(row => str(row[column]))
  const dictionary=(values:CatalogRow[],key:string,value:string) => {
    const entries=values.map(row => [str(row[key]),str(row[value])] as const)
    if (new Set(entries.map(([key]) => key)).size!==entries.length) return invalid()
    return Object.fromEntries(entries)
  }
  const name=(kind:'item'|'spirit'|'season',row:CatalogRow) => ({default:str(row.name_default),translations:dictionary(select(`${kind}_translation`,{[`${kind}_id`]:row.id}),'locale','text')})
  const metadata=(kind:'item'|'spirit'|'season',row:CatalogRow) => {
    const identity=one('domain_identity',{kind,id:row.id})
    if (!num(identity.revision) || num(identity.schema_version)!==1) return invalid()
    const retirement=nullableString(identity.retired_at)
    if ((row.record_status==='retired')!==(retirement!==null) || retirement!==null && (!validateDateTime(retirement).valid
      || rangeErrors({value:retirement,precision:'instant',timezone:null,rawLabel:null},{value:str(identity.updated_at),precision:'instant',timezone:null,rawLabel:null},[]).length)) return invalid()
    const fields=select('field_provenance_field',{kind,id:row.id})
    if (new Set(fields.map(p => p.field)).size!==fields.length) return invalid()
    if (kind!=='season' && !flag(row.field_provenance_present) && fields.length) return invalid()
    const fieldProvenance=Object.fromEntries(fields.map(p => [str(p.field),ids('field_provenance',{kind,id:row.id,field:p.field},'provenance_id')]))
    return {updatedAt:str(identity.updated_at),fixture:flag(identity.fixture),recordStatus:row.record_status,
      provenanceIds:ids('identity_provenance',{kind,id:row.id},'provenance_id'),
      ...(kind==='season'||flag(row.field_provenance_present)?{fieldProvenance}:{}),}
  }
  const time=(prefix:string,row:CatalogRow):PartialTime|null => {
    const present=flag(row[`${prefix}_present`]),value=row[`${prefix}_value`],precision=row[`${prefix}_precision`],timezone=row[`${prefix}_timezone`],rawLabel=row[`${prefix}_raw_label`]
    if (!present) { if ([value,precision,timezone,rawLabel].some(value => value!==null)) return invalid();return null }
    if (!['date','instant','unknown'].includes(str(precision))) return invalid()
    return {value:str(value),precision:precision as PartialTime['precision'],timezone:nullableString(timezone),rawLabel:nullableString(rawLabel)}
  }
  const items=ordered(select('item')).map(p => ({...metadata('item',p),id:p.id,name:name('item',p),sourceKeys:dictionary(select('item_source_key',{item_id:p.id}),'label','value'),
    slot:p.slot,rawSlot:p.raw_slot,accessoryAnchor:p.accessory_anchor,dyeStatus:p.dye_status,
    seasonIds:ids('item_season',{item_id:p.id},'season_id'),spiritIds:ids('item_spirit',{item_id:p.id},'spirit_id'),
    assetIds:ids('item_asset',{item_id:p.id},'asset_id'),ruleIds:ids('item_rule',{item_id:p.id},'rule_id'),dyeRegions:[],compatibility:null,
    acquisitionOptions:ordered(select('acquisition_option',{item_id:p.id})).map(o => ({id:o.option_id,kind:o.kind,costStatus:o.cost_status,friendshipNodeId:o.friendship_node_id,iapProductId:o.iap_product_id,
      validFrom:time('valid_from',o),validTo:time('valid_to',o),provenanceIds:ids('acquisition_provenance',{item_id:p.id,option_id:o.option_id},'provenance_id'),
      costs:ordered(select('acquisition_cost',{item_id:p.id,option_id:o.option_id})).map(c => ({currency:c.currency,sourceCurrencyLabel:c.source_currency_label,amount:c.amount}))}))}))
  const spirits=ordered(select('spirit')).map(p => ({...metadata('spirit',p),id:p.id,name:name('spirit',p),category:p.category,realmId:p.realm_id,
    seasonIds:ids('spirit_season',{spirit_id:p.id},'season_id'),treeIds:ids('spirit_tree',{spirit_id:p.id},'tree_id')}))
  const seasons=ordered(select('season')).map(p => ({...metadata('season',p),id:p.id,name:name('season',p),kind:p.kind,startsAt:time('starts_at',p),endsAt:time('ends_at',p),timeStatus:p.time_status,summary:p.summary,
    itemIds:ids('season_item',{season_id:p.id},'item_id'),spiritIds:ids('season_spirit',{season_id:p.id},'spirit_id'),realmIds:ids('season_realm',{season_id:p.id},'realm_id'),mapIds:ids('season_map',{season_id:p.id},'map_id'),officialArticleIds:ids('season_article',{season_id:p.id},'article_id')}))
  const lookup=ordered(select('item_k15')).map(p => ({id:p.id,upstreamId:num(p.upstream_id),identifier:p.identifier,category:p.category,categoryEvidence:p.category_evidence,
    ...(flag(p.image_present)?{image:null}:{}),...(flag(p.images_present)?{images:null}:{}),
    offers:ordered(select('acquisition_source_offer',{item_id:p.id})).map(o => ({id:o.option_id,acquisition:o.acquisition,seasonPass:o.season_pass,bundle:o.bundle,money:o.raw_money,sourceUrl:o.source_url}))}))
  const registry=select('source_registry').map(p => str(p.id))
  if (new Set(registry).size!==registry.length || registry.some(id => !SOURCE_IDS.some(source => source===id))) return invalid()
  const provenance=ordered(select('provenance_order')).map(order => {
    const p=one('provenance',{id:order.provenance_id})
    if (!registry.includes(str(p.source_id))) return invalid()
    return {id:p.id,sourceId:p.source_id,sourceUrl:p.source_url,sourceRecordKey:p.source_record_key,sourceRevision:p.source_revision,retrievedAt:p.retrieved_at,observedAt:p.observed_at,attribution:p.attribution,licenseNote:p.license_note,transformNote:p.transform_note,verificationStatus:p.verification_status}
  })
  if (tables.some(table => rows[table].some(row => !used.has(row)))) return invalid()
  // Validate reconstructed structures again; casts only bridge SQL scalar fields.
  // No malformed/missing/wrong-type row becomes a successful public payload.
  return validate({items,spirits,seasons,lookup,provenance} as CatalogPayloads,options)
}
