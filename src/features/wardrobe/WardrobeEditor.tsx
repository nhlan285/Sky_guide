import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { LocalizedText } from '../../data/catalog/types'
import { SLOTS } from '../../data/wardrobe/index'
import type { Slot } from '../../data/wardrobe/index'
import { useLocale } from '../../shared/i18n/useLocale'
import { Button, StatusBadge } from '../../shared/ui/primitives'
import { demoDefaultSize, demoGeometry, demoPackage, demoPalette } from './demo/demo'
import { createWardrobeState, wardrobeReducer } from './engine'
import { deriveRenderModel } from './model'
import { ItemThumbnail, PaperDoll } from './PaperDoll'
import { wardrobeCopy } from './copy'
import { createOutfitStorage } from './persistence'
import { SavedOutfits } from './SavedOutfits'

const reduce = (state: ReturnType<typeof createWardrobeState>, action: Parameters<typeof wardrobeReducer>[1]) => wardrobeReducer(state, action, demoPackage)

export function WardrobeEditor() {
  const { locale } = useLocale()
  const title = useRef<HTMLHeadingElement>(null)
  useEffect(() => { title.current?.focus({ preventScroll: true }) }, [])
  const copy = wardrobeCopy[locale]
  const [outfitStorage] = useState(() => createOutfitStorage(demoPackage, () => window.localStorage))
  const [state, dispatch] = useReducer(reduce, null, () => {
    const initial = createWardrobeState(demoPackage, demoDefaultSize)
    const library = outfitStorage.read().value
    const last = library.outfits.find(outfit => outfit.id === library.lastOutfitId)
    return last ? wardrobeReducer(initial, { type: 'restore_outfit', snapshot: last }, demoPackage) : initial
  })
  const [slot, setSlot] = useState<Slot>('cape')
  const [panel, setPanel] = useState<'picker' | 'outfit'>('picker')
  const { selection } = state
  const model = useMemo(() => deriveRenderModel(demoPackage, selection, state.effectiveSizeCode), [selection, state.effectiveSizeCode])
  const name = (text: LocalizedText) => text.translations[locale] ?? text.default
  const options = demoPackage.items.filter(item => item.slot === slot)
  const currentIds = selection.equippedBySlot[slot]
  const current = demoPackage.items.find(item => currentIds.includes(item.id))
  const supportedRegions = current?.dyeRegions.filter(region => region.support === 'demo' && region.maskAssetId && demoGeometry.get(region.maskAssetId)?.paths.length) ?? []
  const equipped = demoPackage.items.filter(item => selection.equippedBySlot[item.slot].includes(item.id))

  return <div className="wardrobe-editor">
    <div className="wardrobe-intro">
      <div><h1 ref={title} id="page-title" tabIndex={-1}>{copy.title}</h1><p>{copy.subtitle}</p></div>
      <div className="wardrobe-disclosure"><StatusBadge tone="info">{copy.demo}</StatusBadge><p>{copy.disclosure}</p></div>
    </div>
    <div className="wardrobe-workspace" data-panel={panel}>
      <section className="wardrobe-preview" aria-labelledby="preview-title">
        <div className="preview-caption"><h2 id="preview-title">{copy.preview}</h2><span>{equipped.length} / {SLOTS.length}</span></div>
        <div className="preview-stage"><PaperDoll model={model} selection={selection} label={copy.previewLabel} /></div>
        <p className="preview-note">{copy.layerHint}</p>
        <p className="wardrobe-feedback" role="status" aria-live="polite">{state.issue ? copy.error : model.warnings.length ? copy.renderError : equipped.map(item => name(item.name)).join(' · ') || copy.empty}</p>
      </section>
      <div className="wardrobe-panel-switch" role="group" aria-label={copy.controls}>
        <Button aria-pressed={panel === 'picker'} aria-controls="wardrobe-picker" onClick={() => setPanel('picker')}>{copy.picker}</Button>
        <Button aria-pressed={panel === 'outfit'} aria-controls="wardrobe-outfit" onClick={() => setPanel('outfit')}>{copy.outfit} · {equipped.length}</Button>
      </div>
      <section id="wardrobe-picker" className="wardrobe-picker wardrobe-panel" aria-labelledby="picker-title">
        <h2 id="picker-title">{copy.picker}</h2>
        <div className="wardrobe-categories" role="group" aria-label={copy.picker}>
          {SLOTS.map(key => <button key={key} type="button" aria-pressed={slot === key} onClick={() => setSlot(key)}>{copy.slots[key]}</button>)}
        </div>
        <div className="wardrobe-items">
          {options.map(item => {
            const selected = currentIds.includes(item.id)
            const replacing = !selected && currentIds.length >= (demoPackage.config.slotPolicies.find(policy => policy.slot === slot)?.maxItems ?? 0)
            return <button className={`wardrobe-item${selected ? ' is-equipped' : ''}`} key={item.id} type="button" aria-pressed={selected}
              onClick={() => {
                if (selected) dispatch({ type: 'unequip', slot, itemId: item.id })
                else if (replacing) dispatch({ type: 'replace', slot, itemId: item.id, replacedItemId: currentIds[0] })
                else dispatch({ type: 'equip', slot, itemId: item.id })
              }}>
              <ItemThumbnail itemId={item.id} />
              <span className="wardrobe-item__name">{name(item.name)}</span>
              <span className="wardrobe-item__state">{selected ? `✓ ${copy.equipped}` : copy.available}</span>
              <span className="wardrobe-item__action">{selected ? copy.unequip : replacing ? copy.replace : copy.equip}</span>
            </button>
          })}
        </div>
        <Button className="button--quiet" disabled={!currentIds.length} onClick={() => dispatch({ type: 'reset_slot', slot })}>{copy.resetSlot}</Button>
        <div className="wardrobe-dye">
          <h3>{copy.colors}{current ? ` · ${name(current.name)}` : ''}</h3>
          {!current ? <p>{copy.dyeHint}</p> : !supportedRegions.length ? <p>{copy.noDye}</p> : <>
            {supportedRegions.map(region => <fieldset key={region.id}>
              <legend>{name(region.label)}</legend>
              <div className="wardrobe-palette">
                {demoPalette.filter(color => region.allowedColors?.includes(color)).map(color => {
                  const selected = selection.dyeByItemRegion[current.id]?.[region.id] === color
                  return <button type="button" key={color} style={{ '--swatch': color } as CSSProperties}
                    aria-label={copy.palette[demoPalette.indexOf(color)]} aria-pressed={selected} title={copy.palette[demoPalette.indexOf(color)]}
                    onClick={() => dispatch({ type: 'set_dye', itemId: current.id, regionId: region.id, color })}><span aria-hidden="true">{selected ? '✓' : ''}</span></button>
                })}
              </div>
              <Button className="button--quiet" onClick={() => dispatch({ type: 'reset_region', itemId: current.id, regionId: region.id })}>{copy.resetRegion}</Button>
            </fieldset>)}
            <button className="wardrobe-text-button" type="button" onClick={() => dispatch({ type: 'reset_item_colors', itemId: current.id })}>{copy.resetColors}</button>
          </>}
        </div>
      </section>
      <section id="wardrobe-outfit" className="wardrobe-outfit wardrobe-panel" aria-labelledby="outfit-title">
        <h2 id="outfit-title">{copy.outfit}</h2>
        <fieldset className="wardrobe-sizes"><legend>{copy.size}</legend>
          {demoPackage.sizes.map((size, index) => <label key={size.code}>
            <input type="radio" name="demo-size" value={size.code} checked={selection.baseSizeCode === size.code} onChange={() => dispatch({ type: 'set_base_size', sizeCode: size.code })} />
            <span>{copy.sizes[index]}</span>
          </label>)}
        </fieldset>
        <p className="wardrobe-small">{copy.sizeNote}</p>
        {state.effectiveSizeCode !== selection.baseSizeCode && <p className="wardrobe-rule-output">{copy.effective}: {copy.sizes[demoPackage.sizes.findIndex(size => size.code === state.effectiveSizeCode)]}<br />{copy.base}: {copy.sizes[demoPackage.sizes.findIndex(size => size.code === selection.baseSizeCode)]}</p>}
        <ul className="wardrobe-equipped">
          {SLOTS.map(key => <li key={key}><span className="wardrobe-equipped__slot">{copy.slots[key]}</span>
            {selection.equippedBySlot[key].length ? selection.equippedBySlot[key].map(id => {
              const item = demoPackage.items.find(entry => entry.id === id)
              return <div key={id}><span>{item && name(item.name)}</span><button type="button" aria-label={`${copy.unequip} ${item && name(item.name)}`} onClick={() => dispatch({ type: 'unequip', slot: key, itemId: id })}>{copy.unequip}</button></div>
            }) : <span className="wardrobe-small">{copy.empty}</span>}
          </li>)}
        </ul>
        <div className="wardrobe-actions">
          <Button onClick={() => dispatch({ type: 'random_outfit', seed: Math.floor(Math.random() * 0x100000000) })}>{copy.random}</Button>
          <Button className="button--quiet" onClick={() => dispatch({ type: 'reset_outfit' })}>{copy.resetOutfit}</Button>
        </div>
        <p className="wardrobe-small">{copy.session}</p>
        <SavedOutfits storage={outfitStorage} selection={selection} onLoad={snapshot => dispatch({ type: 'restore_outfit', snapshot })} />
      </section>
    </div>
  </div>
}
