import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLocale } from '../../shared/i18n/useLocale'
import { wardrobeItemIntent } from './navigation'
import { wardrobeCopy } from './copy'
import { editorPackage } from './editorPackage'

export function WardrobeItemIntent({ search, selectedIds, onEquip }: { search: string; selectedIds: readonly string[]; onEquip: (id: string) => void }) {
  const { locale } = useLocale()
  const copy = wardrobeCopy[locale].itemIntent
  const intent = wardrobeItemIntent(search)
  const supported = editorPackage.items.find(item => item.id === intent.id && !item.fixture)
  const [result, setResult] = useState<{ id: string; name: string | null; failed: boolean } | null>(null)
  useEffect(() => {
    if (!intent.id || supported) return
    let active = true
    const id = intent.id
    void import('../../data/itemLookup/catalog').then(({ catalogResult }) => {
      if (active) setResult({ id, name: catalogResult.valid ? catalogResult.value.entries.find(entry => entry.id === id)?.item.name.default ?? null : null, failed: !catalogResult.valid })
    }).catch(() => { if (active) setResult({ id, name: null, failed: true }) })
    return () => { active = false }
  }, [intent.id, supported])
  if (!intent.requested) return null
  const current = result?.id === intent.id ? result : null
  return <section className="wardrobe-share" aria-label={copy.title}>
    <h2>{copy.title}</h2>
    <p role="status">{supported ? `${supported.name.default} — ${selectedIds.includes(supported.id) ? copy.applied : copy.notSelected}` : !intent.id ? copy.missing : !current ? copy.loading : current.failed ? copy.unavailable : current.name ? `${current.name} — ${copy.explanation}` : copy.missing}</p>
    {supported && !selectedIds.includes(supported.id) ? <button type="button" className="button" onClick={() => onEquip(supported.id)}>{copy.tryItem}</button> : null}
    <Link className="text-link" to={intent.returnUrl}>{copy.back}</Link>
  </section>
}
