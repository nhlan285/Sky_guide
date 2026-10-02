import ts from 'typescript'
import { createHash } from 'node:crypto'
import { validateItems, validateSpirits, validateSeasonEvents } from '../../src/data/catalog/index.ts'
import { validateSourceRecords } from '../../src/data/core/index.ts'
import { validateLookupEntry } from '../../src/data/itemLookup/model.ts'
import { blobUrl, constructors, generatedAt, identityTable, offers, parseSource, property, reference, translations, unwrap } from './source.mjs'

export function classify(identifier, commonKeys = []) {
  const commonMap = { Hair: 'hair', Mask: 'mask', FaceAccessory: 'face-accessory', Cape: 'cape', MantaCape: 'cape', Outfit: 'outfit', Shoes: 'shoes', HeadAccessory: 'head-accessory', HairAccessory: 'head-accessory', NeckAccessory: 'neck-accessory', Pendant: 'neck-accessory', Prop: 'prop', Umbrella: 'prop' }
  const values = new Set(commonKeys.map(key => commonMap[key?.replace(/^Ultimate/, '').replace(/Multiple$/, '')]).filter(Boolean))
  if (values.size === 1) return { category: [...values][0], evidence: `CosmeticCommon.${commonKeys.join(', ')}` }
  if (values.size > 1) return { category: 'unknown', evidence: null }
  const suffixes = [['FaceAccessory', 'face-accessory'], ['HeadAccessory', 'head-accessory'], ['HairAccessory', 'head-accessory'], ['NeckAccessory', 'neck-accessory'], ['MusicSheet', 'music-sheet'], ['Hair', 'hair'], ['Mask', 'mask'], ['Cape', 'cape'], ['Outfit', 'outfit'], ['Shoes', 'shoes'], ['Prop', 'prop']]
  for (const [suffix, category] of suffixes) if (new RegExp(`${suffix}\\d*$`).test(identifier)) return { category, evidence: `Explicit enum suffix: ${suffix}` }
  if (/^(Emote|Stance|Call)/.test(identifier) || /(?:Stance|Call)$/.test(identifier)) return { category: 'expression', evidence: 'Explicit enum Emote/Stance/Call' }
  return { category: 'unknown', evidence: null }
}
export function normalizeCost(costs) {
  if (costs === null) return { costs: [], costStatus: 'unknown' }
  const amounts = []
  let unknown = false
  for (const [label, amount] of Object.entries(costs)) {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) throw new Error(`Invalid source cost ${label}`)
    if (label === 'money') { unknown = true; continue } // Monetary currency/market is not declared by this field.
    if (!Number.isSafeInteger(amount)) throw new Error(`Invalid integer source currency ${label}`)
    const currency = label === 'candles' ? 'candle' : label === 'hearts' ? 'heart' : 'other'
    amounts.push({ currency, sourceCurrencyLabel: label, amount })
  }
  return { costs: amounts, costStatus: unknown || !amounts.length ? 'unknown' : 'known' }
}
export function normalizeRecord(raw, context) {
  const id = `tsa-cosmetic-${raw.upstreamId}`
  const { category, evidence } = classify(raw.identifier, raw.offers.map(o => o.commonKey))
  const slot = ({ hair: 'hair', mask: 'mask', cape: 'cape', 'face-accessory': 'accessory', 'head-accessory': 'accessory', 'neck-accessory': 'accessory' })[category] ?? 'unknown'
  // Outfit/shoes cover bodies/feet; the split top/bottom contract cannot represent them safely.
  const provenanceIds = [...new Set(raw.provenanceIds)].sort()
  const optionEvidence = []
  const acquisitionOptions = raw.offers.map(offer => {
    const optionId = `${id}-offer-${createHash('sha256').update(`${offer.path}:${offer.acquisition}:${offer.key}`).digest('hex').slice(0, 16)}`
    const cost = normalizeCost(offer.costs)
    optionEvidence.push({ id: optionId, acquisition: offer.acquisition, seasonPass: offer.seasonPass, bundle: offer.pack, money: offer.costs?.money ?? null, sourceUrl: `${blobUrl(offer.path)}#L${offer.line}` })
    return { id: optionId, kind: offer.spiritId !== null ? 'spirit_tree' : offer.costs?.money !== undefined ? 'iap' : 'other', ...cost,
      friendshipNodeId: null, iapProductId: null, validFrom: null, validTo: null, provenanceIds: [offer.provenanceId] }
  })
  if (raw.defaultUnlocked) {
    const optionId = `${id}-default`
    acquisitionOptions.push({ id: optionId, kind: 'other', costs: [], costStatus: 'free', friendshipNodeId: null, iapProductId: null, validFrom: null, validTo: null, provenanceIds: [raw.enumProvenanceId] })
    optionEvidence.push({ id: optionId, acquisition: 'default', seasonPass: false, bundle: false, money: null, sourceUrl: blobUrl('packages/utility/source/cosmetics.ts') })
  }
  const item = { id, sourceKeys: { K15: String(raw.upstreamId), tsaIdentifier: raw.identifier }, name: { default: raw.name, translations: {} }, slot, rawSlot: category === 'unknown' ? null : category,
    accessoryAnchor: null, seasonIds: [...new Set(raw.offers.map(o => o.seasonId).filter(x => x !== null))].sort(), spiritIds: [...new Set(raw.offers.map(o => o.spiritId).filter(x => x !== null))].sort(),
    acquisitionOptions, assetIds: [], dyeRegions: [], dyeStatus: 'unknown', ruleIds: [], compatibility: null,
    provenanceIds, updatedAt: generatedAt, recordStatus: 'published', fixture: false,
    fieldProvenance: { name: raw.nameProvenanceIds, slot: provenanceIds, acquisitionOptions: [...new Set(raw.offers.map(o => o.provenanceId).concat(raw.defaultUnlocked ? [raw.enumProvenanceId] : []))] },
  }
  if (!item.fieldProvenance.acquisitionOptions.length) delete item.fieldProvenance.acquisitionOptions
  const metadata = { id, upstreamId: raw.upstreamId, identifier: raw.identifier, category, categoryEvidence: evidence, offers: optionEvidence }
  const result = validateLookupEntry(item, metadata, context)
  return result.valid ? { valid: true, item: result.value.item, metadata } : result
}

export function normalizeSources(sources, revision) {
  const parsed = new Map([...sources].filter(([path]) => path.endsWith('.ts')).sort(([a], [b]) => a.localeCompare(b, 'en')).map(([path, text]) => [path, parseSource(path, text)]))
  const at = path => {
    const source = parsed.get(`packages/utility/source/${path}`)
    if (!source) throw new Error(`Missing required public source ${path}`)
    return source
  }
  const tables = { cosmetics: identityTable(at('cosmetics.ts'), 'Cosmetic'), seasons: identityTable(at('season.ts'), 'SeasonId'), spirits: identityTable(at('utility/spirits.ts'), 'SpiritId'), common: identityTable(at('cosmetics.ts'), 'CosmeticCommon') }
  const locale = at('locales/en-gb.ts')
  const names = translations(locale, 'cosmetic-names', 'Cosmetic', tables.cosmetics)
  const seasonNames = translations(locale, 'seasons', 'SeasonId', tables.seasons)
  const spiritNames = translations(locale, 'spirits', 'SpiritId', tables.spirits)
  const commonNames = translations(locale, 'cosmetic-common-names', 'CosmeticCommon', tables.common)
  const provenance = new Map()
  const sourceRecord = path => {
    const id = `tsa-source-${createHash('sha256').update(path).digest('hex').slice(0, 16)}`
    if (!provenance.has(id)) provenance.set(id, { id, sourceId: 'K15', sourceUrl: blobUrl(path), sourceRecordKey: path, sourceRevision: revision, retrievedAt: generatedAt, observedAt: null,
      attribution: 'ThatSkyApplication contributors / Jiralite', licenseNote: 'MIT; Copyright (c) 2025 Jiralite. See /licenses/thatskyapplication-utility.txt',
      transformNote: 'Static literal adapter tsa-v1; community dataset snapshot, not official/live Sky data.', verificationStatus: 'verified' })
    return id
  }
  const enumProvenanceId = sourceRecord('packages/utility/source/cosmetics.ts')
  const localeProvenanceId = sourceRecord('packages/utility/source/locales/en-gb.ts')
  const metadata = path => ({ provenanceIds: [sourceRecord(path), localeProvenanceId], updatedAt: generatedAt, recordStatus: 'published', fixture: false })
  const seasons = [], spirits = [], allOffers = []
  for (const [path, source] of parsed) for (const definition of constructors(source)) {
    const { data, kind } = definition
    const provenanceId = sourceRecord(path)
    if (kind === 'Season') {
      const number = reference(property(data, 'id'), 'SeasonId', tables.seasons)
      if (!seasonNames[number]) throw new Error(`Missing season name ${number}`)
      const id = `tsa-season-${number}`
      seasons.push({ id, kind: 'season', name: { default: seasonNames[number], translations: {} }, startsAt: null, endsAt: null, timeStatus: 'unknown', summary: null,
        spiritIds: [], itemIds: [], realmIds: [], mapIds: [], officialArticleIds: [], ...metadata(path), fieldProvenance: { name: [localeProvenanceId] } })
      offers(property(data, 'items'), tables, { path, provenanceId, spiritId: null, seasonId: id, acquisition: 'season-items' }, allOffers)
    } else {
      const number = reference(property(data, 'id'), 'SpiritId', tables.spirits)
      if (!spiritNames[number]) throw new Error(`Missing spirit name ${number}`)
      const id = `tsa-spirit-${number}`
      const seasonId = property(data, 'seasonId') ? `tsa-season-${reference(property(data, 'seasonId'), 'SeasonId', tables.seasons)}` : null
      spirits.push({ id, name: { default: spiritNames[number], translations: {} }, category: kind === 'SeasonalSpirit' || kind === 'GuideSpirit' ? 'seasonal' : 'regular', realmId: null,
        seasonIds: seasonId ? [seasonId] : [], treeIds: [], ...metadata(path), fieldProvenance: { name: [localeProvenanceId] } })
      const offer = property(data, 'offer')
      for (const variant of ['current', 'seasonal']) offers(property(offer, variant), tables, { path, provenanceId, spiritId: id, seasonId, acquisition: `spirit-${variant}` }, allOffers)
    }
  }
  // Only the four explicit shop arrays; never execute upstream catalogue helpers.
  const catalogue = at('catalogue.ts')
  for (const statement of catalogue.statements) if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
    const name = declaration.name.getText()
    if (!['starterPackItems', 'secretAreaItems', 'clothingShopItems', 'nestingWorkshopItems'].includes(name)) continue
    const call = unwrap(declaration.initializer)
    if (!ts.isCallExpression(call) || call.expression.getText() !== 'resolveOfferFromItems') throw new Error(`Unknown shop declaration ${name}`)
    offers(call.arguments[0], tables, { path: catalogue.fileName, provenanceId: sourceRecord(catalogue.fileName), spiritId: null, seasonId: null, acquisition: 'shop' }, allOffers, [name])
  }
  if (!spirits.length || !seasons.length || !allOffers.length) throw new Error('Parser produced an empty catalogue domain')
  const offersById = new Map()
  for (const offer of allOffers) {
    const values = offersById.get(offer.upstreamId) ?? []
    values.push(offer)
    offersById.set(offer.upstreamId, values)
  }
  const context = { provenanceIds: new Set(provenance.keys()), itemIds: new Set(Object.values(tables.cosmetics).map(id => `tsa-cosmetic-${id}`)), spiritIds: new Set(spirits.map(s => s.id)), seasonIds: new Set(seasons.map(s => s.id)), ...Object.fromEntries(['treeIds', 'nodeIds', 'realmIds', 'mapIds', 'articleIds', 'assetIds', 'ruleIds', 'iapProductIds', 'visitIds'].map(key => [key, new Set()])) }
  const result = { items: [], lookup: [], spirits, seasons, provenance: [], report: { accepted: 0, rejected: [], excluded: 0, unknownCategory: 0, unknownCost: 0 } }
  const enumDeclaration = at('cosmetics.ts').statements.find(s => ts.isEnumDeclaration(s) && s.name.text === 'Cosmetic')
  for (const [identifier, upstreamId] of Object.entries(tables.cosmetics)) {
    // Explicit non-collectible currencies, progression nodes and consumable rewards are outside V1.
    if (/(?:Blessing|Heart|WingBuff|Quest|Dye|TrailSpell|SharedMemorySpell|SharedSpaceSpell)\d*$/.test(identifier)) { result.report.excluded++; continue }
    const itemOffers = offersById.get(upstreamId) ?? []
    const first = itemOffers.find(o => o.commonKey && o.spiritId)
    const commonName = first ? commonNames[tables.common[first.commonKey]] : null
    const derivedName = first && commonName && !commonName.includes('{{') ? `${spirits.find(s => s.id === first.spiritId).name.default} · ${commonName}` : identifier
    const member = enumDeclaration.members.find(m => m.name.getText() === identifier)
    const raw = { upstreamId, identifier, name: names[upstreamId] ?? derivedName, offers: itemOffers, defaultUnlocked: ts.getJSDocCommentsAndTags(member).some(tag => tag.getText().includes('Unlocked by default.')),
      enumProvenanceId, nameProvenanceIds: names[upstreamId] ? [localeProvenanceId] : first && commonName ? [localeProvenanceId, first.provenanceId] : [enumProvenanceId], provenanceIds: [enumProvenanceId, localeProvenanceId, ...itemOffers.map(o => o.provenanceId)] }
    try {
      const normalized = normalizeRecord(raw, context)
      if (!normalized.valid) { result.report.rejected.push({ upstreamId, reasons: normalized.errors }); continue }
      result.items.push(normalized.item); result.lookup.push(normalized.metadata)
    } catch (error) { result.report.rejected.push({ upstreamId, reasons: [error.message] }) }
  }
  const acceptedIds = new Set(result.items.map(item => item.id))
  for (const season of seasons) {
    season.spiritIds = spirits.filter(spirit => spirit.seasonIds.includes(season.id)).map(spirit => spirit.id).sort()
    season.itemIds = result.items.filter(item => item.seasonIds.includes(season.id)).map(item => item.id).sort()
  }
  context.itemIds = acceptedIds
  result.provenance = [...provenance.values()].sort((a, b) => a.id.localeCompare(b.id, 'en'))
  for (const validation of [validateItems(result.items, context), validateSpirits(spirits, context), validateSeasonEvents(seasons, context), validateSourceRecords(result.provenance, new Set(['K15']))]) {
    if (!validation.valid) throw new Error(`Catalogue validation failed: ${JSON.stringify(validation.errors.slice(0, 6))}`)
  }
  if (!result.items.length || result.report.rejected.length) throw new Error(`Import rejected records: ${JSON.stringify(result.report)}`)
  result.report.accepted = result.items.length
  result.report.unknownCategory = result.lookup.filter(entry => entry.category === 'unknown').length
  result.report.unknownCost = result.items.filter(item => !item.acquisitionOptions.length || item.acquisitionOptions.every(o => o.costStatus === 'unknown')).length
  return result
}
