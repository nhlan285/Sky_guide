/* global console */
import { canonicalTitle, chunks, mapLimit, pagesOf, paginate, titleKey, wikiUrl } from './api.mjs'
import { parseLuaData } from './lua.mjs'

export const roots = ['Cosmetics', 'Masks', 'Capes', 'Hair', 'Outfits', 'Accessories', 'Hair Accessories', 'Head Accessories', 'Face Accessories', 'Necklaces', 'Shoes', 'Instruments', 'Props', 'Held Props', 'Small Props', 'Large Props', 'Music Sheets', 'Spirits', 'Seasons', 'Events']
export const moduleTitles = ['Module:Spirits/data', 'Module:Seasons/data', 'Module:Days Item/data', 'Module:Days/data', 'Module:Cosmetics/data', 'Module:Emotes/data', 'Module:Instruments/data', 'Module:Music Sheet/data', 'Module:Spirit Item/data']
const inspectionTitles = ['Module:Season Item/data', 'Module:Cosmetics/Outfits/data']
export const stableRedirects = redirects => [...new Map(redirects.map(r => [JSON.stringify(r), r])).values()].sort((a, b) => a.from.localeCompare(b.from, 'en') || a.to.localeCompare(b.to, 'en') || JSON.stringify(a).localeCompare(JSON.stringify(b), 'en'))
export async function readPages(client, titles) {
  const found = new Map(), redirects = []
  await mapLimit(chunks([...new Set(titles)].sort(), 20), 2, async batch => {
    const responses = await paginate(client.request, { titles: batch.join('|'), redirects: '1', prop: 'info|revisions|images|links|categories', inprop: 'url', rvprop: 'ids|timestamp|content', rvslots: 'main', imlimit: 'max', pllimit: 'max', plnamespace: '0', cllimit: 'max' })
    for (const response of responses) {
      redirects.push(...(response.query?.redirects ?? []), ...(response.query?.normalized ?? []))
      for (const page of pagesOf(response)) {
        if (page.missing || page.invalid) continue
        const previous = found.get(page.title)
        found.set(page.title, { ...previous, ...page, images: [...(previous?.images ?? []), ...(page.images ?? [])], links: [...(previous?.links ?? []), ...(page.links ?? [])], categories: [...(previous?.categories ?? []), ...(page.categories ?? [])] })
      }
    }
  })
  return { pages: [...found.values()].sort((a, b) => a.title.localeCompare(b.title, 'en')), redirects: stableRedirects(redirects) }
}
export async function discover(client, catalogue) {
  const site = await client.request({ meta: 'siteinfo', siprop: 'general|rightsinfo' })
  // Page thumbnails are discovery evidence only: a category-page thumbnail may
  // be a dye diagram or banner, not an individual cosmetic.
  const pageImages = await client.request({ titles: roots.join('|'), redirects: '1', prop: 'pageimages', piprop: 'name|thumbnail', pithumbsize: '480' })
  const moduleInventory = (await paginate(client.request, { list: 'allpages', apnamespace: '828', aplimit: 'max' })).flatMap(r => r.query.allpages.map(p => p.title))
  const modulesResult = await readPages(client, [...moduleTitles, ...inspectionTitles])
  const inspectedModules = modulesResult.pages.filter(p => inspectionTitles.includes(p.title)).map(page => ({ title: page.title, revision: page.revisions[0].revid,
    reason: page.title === 'Module:Season Item/data' ? 'Source explicitly declares WIP/not used on live pages; excluded from factual mapping.' : 'Computed table calls Spirit Item and Days Item modules; underlying literal data and rendered page image relationships are scanned. Lua is never executed.' }))
  const modules = modulesResult.pages.filter(p => moduleTitles.includes(p.title)).map(page => {
    const diagnostics = []
    return { title: page.title, revision: page.revisions[0].revid, data: parseLuaData(page.revisions[0].slots.main.content, diagnostics), diagnostics }
  })
  if (modules.length !== moduleTitles.length) throw new Error('Missing required Wiki data module')
  const allCategories = (await paginate(client.request, { list: 'allcategories', aclimit: 'max' })).flatMap(r => r.query.allcategories.map(c => c.category))
  const entityNames = new Set(modules.flatMap(module => Object.values(module.data).flatMap(row => [row.name, row.guide_name].filter(name => typeof name === 'string'))))
  const categories = new Set(allCategories.filter(name => (/cosmetic|cape|mask|hair|outfit|accessor|necklace|shoe|instrument|prop|music|spirit|season|event|emote|expression|^calls$|^stances$|^days of |^sky anniversary|^cutouts$|^gallery images$|^screenshots$|^icons$/i.test(name) || entityNames.has(name.split('/')[0])) && !/maintenance|draft|early preview/i.test(name)).map(name => `Category:${name}`))
  const scanned = new Set(), fileTitles = new Set(), pageTitles = new Set([...roots, ...catalogue.spirits.map(s => s.name.default), ...catalogue.seasons.map(s => s.name.default)])
  const categoryCounts = {}
  while ([...categories].some(name => !scanned.has(name))) {
    const wave = [...categories].filter(name => !scanned.has(name)).sort()
    await mapLimit(wave, 2, async category => {
      const members = (await paginate(client.request, { list: 'categorymembers', cmtitle: category, cmlimit: 'max', cmnamespace: '0|6|14' })).flatMap(r => r.query.categorymembers)
      categoryCounts[category] = members.length
      for (const member of members) {
        if (member.ns === 14 && !/maintenance|draft|early preview/i.test(member.title)) categories.add(member.title)
        else if (member.ns === 6) fileTitles.add(titleKey(member.title))
        else if (member.ns === 0 && !/early preview|\/draft/i.test(member.title)) pageTitles.add(member.title)
      }
      scanned.add(category)
    })
  }
  console.log(`Discovery: ${scanned.size} categories, ${pageTitles.size} pages, ${fileTitles.size} category files`)
  const result = await readPages(client, [...pageTitles])
  const known = new Set(result.pages.map(p => p.title))
  // All links from cosmetic index pages are inspected, including individual items
  // absent from category membership. We do not recursively crawl unrelated lore.
  const extra = [...new Set(result.pages.filter(p => roots.includes(p.title)).flatMap(p => p.links.map(l => l.title)))].filter(t => !known.has(t) && !/early preview|\/draft/i.test(t))
  const extraResult = await readPages(client, extra)
  const pages = [...new Map([...result.pages, ...extraResult.pages].map(p => [p.title, p])).values()].sort((a, b) => a.title.localeCompare(b.title, 'en'))
  for (const page of pages) for (const image of page.images) fileTitles.add(titleKey(image.title))
  for (const module of modules) for (const entry of Object.values(module.data)) for (const value of Object.values(entry)) {
    if (typeof value === 'string' && /\.(png|jpe?g|webp|gif|svg)$/i.test(value.trim())) fileTitles.add(titleKey(`File:${value.trim()}`))
  }
  console.log(`Discovery: ${pages.length} canonical pages, ${fileTitles.size} files; fetching imageinfo`)
  const files = [], missing = [], fileRedirects = []
  await mapLimit(chunks([...fileTitles].sort(), 40), 2, async titles => {
    const responses = await paginate(client.request, { titles: titles.join('|'), redirects: '1', prop: 'imageinfo|revisions', rvprop: 'ids', iiprop: 'url|size|mime|user|timestamp|extmetadata|sha1', iiurlwidth: '480' })
    for (const response of responses) {
      fileRedirects.push(...(response.query?.normalized ?? []), ...(response.query?.redirects ?? []))
      for (const page of pagesOf(response)) {
        if (!page.imageinfo?.length) missing.push(page.title)
        else files.push(page)
      }
    }
  })
  const redirects = stableRedirects([...result.redirects, ...extraResult.redirects, ...fileRedirects])
  const canonical = title => canonicalTitle(title, [{ query: { redirects } }])
  return { site: site.query, pageImages: pagesOf(pageImages), modules, inspectedModules, moduleInventory, pages, requestedFileTitles: fileTitles.size, files: [...new Map(files.map(f => [f.pageid, f])).values()].sort((a, b) => a.pageid - b.pageid), categories: Object.fromEntries(Object.entries(categoryCounts).sort()), redirects, missing: [...new Set(missing)].sort(), canonical,
    pageSummaries: pages.map(p => ({ title: p.title, pageId: p.pageid, url: p.canonicalurl ?? wikiUrl(p.title), revision: p.revisions?.[0]?.revid ?? null, categories: [...new Set(p.categories.map(c => c.title))].sort() })) }
}
