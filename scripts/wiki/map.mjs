import { canonicalTitle, titleKey, wikiUrl } from './api.mjs'

export const normalizeName = value => String(value ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
const compact = value => normalizeName(value).replaceAll(' ', '')
const fieldCategories = { hair: 'hair', mask: 'mask', cape: 'cape', outfit: 'outfit', headpiece: 'head-accessory', hairpiece: 'head-accessory', facepiece: 'face-accessory', neckpiece: 'neck-accessory', necklace: 'neck-accessory', footwear: 'shoes', shoes: 'shoes', instrument: 'instrument', prop: 'prop', music: 'music-sheet', icon: 'expression' }
const categoryWords = { hair: ['hair'], mask: ['mask'], cape: ['cape'], outfit: ['outfit', 'pants'], headpiece: ['hair accessory', 'head accessory'], hairpiece: ['hair accessory', 'head accessory'], facepiece: ['face accessory'], neckpiece: ['neck accessory', 'necklace'], necklace: ['pendant', 'necklace'], footwear: ['shoes', 'boots'], shoes: ['shoes', 'boots'], instrument: ['instrument'], prop: ['prop', 'umbrella'], music: ['music sheet'], icon: ['emote', 'call', 'stance'] }
const rootCategories = { Masks: 'mask', Capes: 'cape', Hair: 'hair', Outfits: 'outfit', 'Hair Accessories': 'head-accessory', 'Head Accessories': 'head-accessory', 'Face Accessories': 'face-accessory', Necklaces: 'neck-accessory', Shoes: 'shoes', Instruments: 'instrument', Props: 'prop', 'Held Props': 'prop', 'Small Props': 'prop', 'Large Props': 'prop', 'Music Sheets': 'music-sheet' }
const strings = value => typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).filter(v => typeof v === 'string') : []

export function classifyMedia(field, fileTitle) {
  const text = normalizeName(fileTitle)
  if (/(?:^|_)(back|side|interior|exterior)$/.test(field) || /\b(back|side|interior|exterior)\b/.test(text)) return 'alternate-view'
  if (/(?:^|_)(front|held|using)$/.test(field) || /\b(worn|wearing|gameplay|screenshot|on back|playing|in game)\b/.test(text)) return 'worn-preview'
  if (/(?:^| )(icon|inventory)(?: |$)/.test(text) || field === 'icon' || !/_(real)$/.test(field) && !['real', 'gallery'].includes(field)) return 'icon'
  return field === 'gallery' ? 'gallery' : 'primary'
}
export function rankMedia(media) {
  // No inference of transparency from PNG alone. Explicit isolated/cutout names
  // rank first, then source-declared real/reference views, inventory icons, previews.
  const isolated = /\b(isolated|cutout|render)\b/.test(normalizeName(media.fileTitle))
  return (isolated ? 110 : ({ primary: 100, icon: 85, 'worn-preview': 50, 'alternate-view': 40, gallery: 30, reference: 10 })[media.mediaKind]) + Math.min(8, Math.min(media.width, media.height) / 200)
}
export function choosePrimary(media) {
  return media.filter(m => m.thumbnailUrl && (m.itemIds?.length ?? 1) <= 1 && /^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(m.mime)).sort((a, b) => rankMedia(b) - rankMedia(a) || a.mediaId.localeCompare(b.mediaId, 'en'))[0] ?? null
}
export function extractBindings(discovery) {
  const bindings = []
  const eventCategories = new Map()
  const categorySources = new Map()
  const eventCategory = name => {
    const values = new Set(eventCategories.get(normalizeName(name)) ?? [])
    if (values.has('instrument')) values.delete('prop')
    return values.size === 1 ? [...values][0] : undefined
  }
  for (const page of discovery.pages) if (rootCategories[page.title]) {
    const text = page.revisions?.[0]?.slots?.main?.content ?? ''
    for (const match of text.matchAll(/\{\{(Days Item|Instrument)\s*\|\s*([^|}]+)/gi)) {
      const key = normalizeName(match[2]), category = match[1].toLowerCase() === 'instrument' ? 'instrument' : rootCategories[page.title]
      if (!eventCategories.has(key)) eventCategories.set(key, new Set())
      eventCategories.get(key).add(category)
      if (!categorySources.has(key)) categorySources.set(key, [])
      categorySources.get(key).push({ sourcePage: page.title, sourceRevision: page.revisions[0].revid, template: match[1], category })
    }
  }
  const days = discovery.modules.find(m => m.title === 'Module:Days/data').data
  const seasons = discovery.modules.find(m => m.title === 'Module:Seasons/data').data
  for (const module of discovery.modules.filter(m => ['Module:Spirits/data', 'Module:Seasons/data', 'Module:Days Item/data'].includes(m.title))) {
    const eventModule = module.title === 'Module:Days Item/data'
    const seasonModule = module.title === 'Module:Seasons/data'
    for (const [key, row] of Object.entries(module.data)) {
      const names = [row.name, row.guide_name, row.short_name, ...strings(row.alt_name)].filter(Boolean)
      const groups = new Map()
      for (const [field, file] of Object.entries(row)) {
        if (typeof file !== 'string' || !/\.(png|jpe?g|webp|gif|svg)$/i.test(file.trim()) || /spell|iap|dye|sh_icon|sc_icon/.test(field) || /no.cosmetic|question.mark|placeholder/i.test(file)) continue
        const base = eventModule ? 'item' : field.replace(/_(real|front|back|side|interior|exterior|held|using)$/, '')
        const type = base.split('_')[0]
        if (!eventModule && (!fieldCategories[type] || seasonModule && type === 'icon')) continue
        if (!groups.has(base)) groups.set(base, [])
        groups.get(base).push({ fileTitle: titleKey(`File:${file.trim()}`), field, kind: classifyMedia(field, file) })
      }
      for (const [base, files] of groups) {
        const type = base.split('_')[0]
        const category = eventModule ? names.map(eventCategory).find(Boolean) ?? 'unknown' : fieldCategories[type]
        const itemNames = eventModule ? names : [row[`${base}_name`], type === 'instrument' ? row.inst_name : null, type === 'icon' ? row.emote_name : null].filter(Boolean)
        const variants = base.endsWith('_u') ? ['ultimate'] : /_2$/.test(base) ? ['2', 'tier 2'] : /_[bc]$/.test(base) ? [base.endsWith('_b') ? '2' : '3'] : base.includes('_') ? [] : ['']
        const words = categoryWords[type] ?? []
        const aliases = eventModule ? names : [...itemNames, ...names.flatMap(name => words.flatMap(word => variants.flatMap(variant => [`${name} ${variant} ${word}`, `${name} ${word} ${variant}`])))]
        if (!eventModule && base === 'cape') aliases.push(...names.map(name => `${name} cape 1`))
        const event = eventModule ? Object.values(days).find(d => [d.name, d.short_name, ...strings(d.alt_name)].some(n => normalizeName(n) === normalizeName(row.days))) : null
        const pageTitle = eventModule ? event ? `${event.name}/${row.year}` : row.name : row.guide_link ?? row.name ?? row.emote_name
        const relatedGroups = [...groups.keys()].filter(g => fieldCategories[g.split('_')[0]] === category)
        bindings.push({ key: `${module.title}#${key}/${base}`, names: [...new Set(aliases.filter(Boolean))], canonicalNames: eventModule ? [row.name] : itemNames, contextNames: names, allowContext: relatedGroups.length === 1, category, spirit: seasonModule || eventModule ? null : row.name ?? null, season: seasonModule ? row.name : row.season ?? null,
          event: event?.name ?? null, pageTitle, sourcePage: module.title, sourceRevision: module.revision, sourceField: `${key}.${base}`, files })
        const binding = bindings.at(-1)
        binding.season = seasons[binding.season]?.name ?? binding.season
        if (eventModule) binding.categorySources = names.flatMap(name => categorySources.get(normalizeName(name)) ?? [])
      }
    }
  }
  for (const module of discovery.modules.filter(m => ['Module:Cosmetics/data', 'Module:Emotes/data', 'Module:Instruments/data'].includes(m.title))) {
    for (const [key, row] of Object.entries(module.data)) {
      const type = row.item_type?.split('_')[0]
      const category = module.title === 'Module:Instruments/data' ? 'instrument' : ['emote', 'call', 'stance'].includes(type) ? 'expression' : fieldCategories[type] ?? 'unknown'
      const names = [row.name, ...strings(row.alt_name)].filter(Boolean)
      if (category === 'expression' && row.emote_name) {
        // A level-one file is evidence for level one only, never all upgrades.
        if (row.levels && /[-_]1\.(png|gif)$/i.test(row.icon ?? '')) names.push(`${row.emote_name} 1`, `Emote ${row.emote_name} 1`)
        else if (!row.levels) names.push(row.emote_name)
      }
      const files = Object.entries(row).flatMap(([field, file]) => typeof file === 'string' && /^(icon|real|side|back|front|interior|exterior|held|using)$/.test(field) && /\.(png|jpe?g|webp|gif|svg)$/i.test(file) && !/no.cosmetic|question.mark|placeholder/i.test(file) ? [{ fileTitle: titleKey(`File:${file}`), field, kind: classifyMedia(field, file) }] : [])
      if (!files.length) continue
      bindings.push({ key: `${module.title}#${key}/item`, names, canonicalNames: [row.name], contextNames: [row.spirit].filter(Boolean), allowContext: false, category,
        spirit: row.spirit ?? null, season: seasons[row.season]?.name ?? row.season ?? null, event: null, pageTitle: row.spirit ?? (module.title === 'Module:Instruments/data' ? 'Instruments' : module.title), sourcePage: module.title, sourceRevision: module.revision, sourceField: key, files })
    }
  }
  return bindings
}

const preparedCatalogues = new WeakMap()
function prepare(catalogue) {
  if (preparedCatalogues.has(catalogue)) return preparedCatalogues.get(catalogue)
  const spirits = new Map(catalogue.spirits.map(s => [s.id, compact(s.name.default)]))
  const seasons = new Map(catalogue.seasons.map(s => [s.id, compact(s.name.default)]))
  const items = new Map(catalogue.items.map(i => [i.id, i]))
  const prepared = catalogue.lookup.map(entry => {
    const item = items.get(entry.id)
    return { entry, name: compact(item.name.default), identifier: compact(entry.identifier), spirits: item.spiritIds.map(id => spirits.get(id)), seasons: item.seasonIds.map(id => seasons.get(id)) }
  })
  preparedCatalogues.set(catalogue, prepared)
  return prepared
}
export function matchBinding(binding, catalogue, overrides = {}) {
  const manual = overrides.bindings?.[binding.key]
  if (manual) {
    const found = catalogue.lookup.find(l => l.identifier === manual.identifier)
    if (!found || !manual.reason) throw new Error(`Invalid manual override: ${binding.key}`)
    return { status: 'manual', itemIds: [found.id], evidence: [manual.reason] }
  }
  const names = new Set([...binding.names, ...(overrides.aliases?.[binding.key] ?? [])].map(compact))
  const context = new Set(binding.contextNames.map(compact))
  const canonicalNames = new Set((binding.canonicalNames ?? []).map(compact))
  const ranked = prepare(catalogue).flatMap(({ entry, name, identifier, spirits, seasons }) => {
    const categoryCompatible = entry.category === binding.category || entry.category === 'unknown' || binding.category === 'unknown'
    if (!categoryCompatible) return []
    const direct = names.has(name) || names.has(identifier)
    const spirit = spirits.some(name => context.has(name))
    const season = seasons.some(name => context.has(name) || context.has(name?.replace(/^seasonof/, '')))
    // Context+category is only a candidate; equal candidates remain ambiguous.
    // Unknown categories need an actual name/identifier match.
    const canonicalMatch = canonicalNames.has(name)
    const score = direct ? 100 + (canonicalMatch ? 20 : 0) + (spirit ? 15 : 0) + (season ? 8 : 0) : binding.allowContext !== false && spirit && entry.category === binding.category && binding.category !== 'expression' ? 70 : 0
    return score ? [{ id: entry.id, score, direct, spirit, season }] : []
  }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id, 'en'))
  if (!ranked.length) return { status: 'unmapped', itemIds: [], evidence: [] }
  const best = ranked.filter(candidate => candidate.score === ranked[0].score)
  if (best.length !== 1) return { status: 'ambiguous', itemIds: [], candidates: best.map(c => c.id), evidence: ['Multiple equally supported catalogue candidates'] }
  return { status: best[0].direct ? 'exact' : 'high-confidence', itemIds: [best[0].id], evidence: best[0].direct ? ['Normalized name/identifier or explicit alias', ...(best[0].spirit ? ['Spirit relation agrees'] : [])] : ['Unique spirit and category relation'] }
}

export function parseImageInfo(page) {
  const info = page.imageinfo?.[0]
  if (!info?.url) return null
  const metadata = info.extmetadata ?? {}
  return { mediaId: `wiki-file-${page.pageid}`, fileTitle: page.title, filePageUrl: info.descriptionurl ?? wikiUrl(page.title), thumbnailUrl: info.thumburl ?? info.url, originalUrl: info.url,
    width: info.width, height: info.height, thumbnailWidth: info.thumbwidth ?? info.width, thumbnailHeight: info.thumbheight ?? info.height, mime: info.mime, sha1: info.sha1 ?? null,
    uploader: info.user ?? null, timestamp: info.timestamp ?? null, fileRevision: page.revisions?.[0]?.revid ?? null,
    licenseMetadata: Object.fromEntries(Object.entries(metadata).filter(([key]) => /license|copyright|restriction|attributionrequired/i.test(key))),
    creditMetadata: Object.fromEntries(Object.entries(metadata).filter(([key]) => /artist|credit|attribution|objectname/i.test(key))),
    usageMetadata: { mode: 'external-reference', permissionStatus: 'unverified', note: 'Public Wiki file reference requested for this local catalogue. Text licensing does not grant media permission.' },
  }
}

export function normalizeCorpus(discovery, catalogue, overrides) {
  const canonical = title => canonicalTitle(title, [{ query: { redirects: discovery.redirects } }])
  const bindings = extractBindings(discovery)
  const fileBindings = new Map(), mappingReport = []
  for (const binding of bindings) {
    const match = matchBinding(binding, catalogue, overrides)
    mappingReport.push({ key: binding.key, ...match })
    for (const file of binding.files) {
      const key = canonical(file.fileTitle)
      if (!fileBindings.has(key)) fileBindings.set(key, [])
      fileBindings.get(key).push({ binding, match, kind: file.kind })
    }
  }
  const usedOn = new Map()
  for (const page of discovery.pages) for (const file of page.images) {
    const key = canonical(file.title)
    if (!usedOn.has(key)) usedOn.set(key, new Set())
    usedOn.get(key).add(page.title)
  }
  // Inspect every remaining file, using specific file names and canonical page
  // aliases. Never assign a whole spirit gallery to every cosmetic it sells.
  for (const page of discovery.files) if (!fileBindings.has(page.title) && /^image\//.test(page.imageinfo?.[0]?.mime ?? '')) {
    const stem = page.title.replace(/^File:/, '').replace(/\.[^.]+$/, '').replace(/[-_ ](?:icon|real|front|back|side|render|inventory)(?:[-_ ]\d+)?$/i, '')
    if (/no.cosmetic|question.mark|placeholder|^music.?sheet(?:n|w)?(?:-|$)/i.test(stem)) continue
    const related = [...(usedOn.get(page.title) ?? [])]
    const categories = [...new Set(related.map(title => rootCategories[title]).filter(Boolean))]
    // A bare event/spirit name can also be a music sheet display name. Without
    // an item-category page relationship, an event banner is not item evidence.
    if (categories.length !== 1) continue
    const aliases = discovery.redirects.filter(r => compact(r.to) === compact(stem)).map(r => r.from)
    const binding = { key: `File-name#${page.title}`, names: [stem, ...aliases], canonicalNames: [], contextNames: [], allowContext: false, category: categories.length === 1 ? categories[0] : 'unknown', pageTitle: related.find(title => compact(title) === compact(stem)) ?? related.find(title => !rootCategories[title]) ?? related[0] ?? page.title, sourcePage: page.title, sourceRevision: page.revisions?.[0]?.revid ?? null, sourceField: 'title', files: [{ fileTitle: page.title, field: 'gallery', kind: classifyMedia('gallery', page.title) }] }
    const match = matchBinding(binding, catalogue, overrides)
    if (match.status !== 'unmapped') {
      bindings.push(binding); mappingReport.push({ key: binding.key, ...match })
      fileBindings.set(page.title, [{ binding, match, kind: binding.files[0].kind }])
    }
  }
  const records = discovery.files.map(page => {
    const image = parseImageInfo(page)
    const matches = fileBindings.get(page.title) ?? []
    const mapped = matches.filter(m => m.match.itemIds.length)
    const first = mapped[0] ?? matches[0]
    const itemIds = [...new Set(mapped.flatMap(m => m.match.itemIds))].sort()
    return { ...image, itemIds, mediaKind: first?.kind ?? 'reference', mappingStatus: itemIds.length ? mapped.some(m => m.match.status === 'manual') ? 'manual' : mapped.some(m => m.match.status === 'exact') ? 'exact' : 'high-confidence' : matches.some(m => m.match.status === 'ambiguous') ? 'ambiguous' : 'unmapped',
      wikiPageUrl: first?.binding.pageTitle ? wikiUrl(canonical(first.binding.pageTitle)) : null,
      sourcePage: first?.binding.sourcePage ?? page.title, sourceRevision: first?.binding.sourceRevision ?? image.fileRevision,
      mappings: mapped.map(m => ({ itemIds: m.match.itemIds, kind: m.kind, status: m.match.status, binding: m.binding.key, evidence: m.match.evidence })),
      usedOn: [...(usedOn.get(page.title) ?? [])].sort(),
    }
  })
  const entries = {}, conflicts = []
  for (const binding of bindings) {
    if (binding.category === 'unknown') continue
    const names = new Set(binding.names.map(compact))
    for (const row of prepare(catalogue)) if ((names.has(row.name) || names.has(row.identifier)) && row.entry.category !== 'unknown' && row.entry.category !== binding.category) {
      conflicts.push({ itemId: row.entry.id, field: 'category', catalogue: row.entry.category, wiki: binding.category, sourcePage: binding.sourcePage, sourceRevision: binding.sourceRevision, binding: binding.key, resolution: 'preserve-catalogue; incompatible candidate not mapped' })
    }
  }
  const knownPages = new Set([...discovery.pages.map(p => p.title), ...discovery.modules.map(m => m.title)])
  const evidenceUrl = binding => wikiUrl(knownPages.has(canonical(binding.pageTitle)) ? canonical(binding.pageTitle) : binding.sourcePage)
  for (const item of catalogue.items) {
    const images = records.filter(m => m.itemIds.includes(item.id)).map(m => ({ ...m, mediaKind: m.mappings.find(mapping => mapping.itemIds.includes(item.id))?.kind ?? m.mediaKind }))
    const primary = choosePrimary(images)
    const matchedBindings = bindings.filter((_, i) => mappingReport[i].itemIds.includes(item.id))
    const metadata = catalogue.lookup.find(l => l.id === item.id)
    const categories = [...new Set(matchedBindings.map(b => b.category).filter(c => c !== 'unknown'))]
    const suggestedCategory = categories.length === 1 ? categories[0] : null
    const relations = {}
    for (const [field, source, existing] of [['season', catalogue.seasons, item.seasonIds], ['spirit', catalogue.spirits, item.spiritIds]]) {
      const wikiIds = [...new Set(matchedBindings.flatMap(binding => source.filter(row => compact(row.name.default) === compact(binding[field])).map(row => row.id)))].sort()
      relations[`${field}Ids`] = existing.length === 0 ? wikiIds : []
      if (existing.length && wikiIds.some(id => !existing.includes(id))) conflicts.push({ itemId: item.id, field, catalogue: existing, wiki: wikiIds, evidence: matchedBindings.map(b => ({ sourcePage: b.sourcePage, sourceRevision: b.sourceRevision })), resolution: 'preserve-catalogue' })
    }
    if (suggestedCategory && metadata.category !== 'unknown' && metadata.category !== suggestedCategory) conflicts.push({ itemId: item.id, field: 'category', catalogue: metadata.category, wiki: suggestedCategory, resolution: 'preserve-catalogue' })
    entries[item.id] = { primaryId: primary?.mediaId ?? null,
      galleryIds: images.filter(m => m.mediaId !== primary?.mediaId).sort((a, b) => rankMedia(b) - rankMedia(a) || a.mediaId.localeCompare(b.mediaId, 'en')).map(m => m.mediaId),
      category: metadata.category === 'unknown' ? suggestedCategory : null, ...relations,
      aliases: [...new Set(matchedBindings.flatMap(b => b.names))].sort(),
      evidence: matchedBindings.map(b => ({ sourcePage: b.sourcePage, sourceRevision: b.sourceRevision, sourceField: b.sourceField, wikiPageUrl: evidenceUrl(b), category: b.category, categorySources: b.categorySources ?? [], spirit: b.spirit, season: b.season, event: b.event })),
    }
  }
  return { records, entries, mappingReport, conflicts }
}
