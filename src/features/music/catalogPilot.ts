import pilot from './catalog-pilot.json' with { type: 'json' }

// Explicit development mappings to our original shared tone set. These do not
// claim game timbre, music samples, wardrobe slot or upstream category semantics.
const mappings = [
  { itemId: 'tsa-cosmetic-81', identifier: 'LaughingLightCollectorHarp' },
  { itemId: 'tsa-cosmetic-227', identifier: 'CheerfulSpectatorPiano' },
]
export const musicInstruments = mappings.map(mapping => {
  const record = pilot.records.find(item => item.id === mapping.itemId)
  if (!record || record.fixture || record.recordStatus !== 'published' || !record.provenanceIds.length || record.sourceKeys.tsaIdentifier !== mapping.identifier) throw new Error('Invalid music identity pilot.')
  return { itemId: record.id, name: record.name.default, sampleSetId: 'self-created-sine-pluck-v1', representation: 'original-fallback' as const }
})
export function musicInstrumentForItem(itemId: string | null) { return musicInstruments.find(instrument => instrument.itemId === itemId) }
