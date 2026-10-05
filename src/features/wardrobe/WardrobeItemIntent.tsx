import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLocale } from '../../shared/i18n/useLocale'
import { wardrobeItemIntent } from './navigation'
import { wardrobeCopy } from './copy'

export function WardrobeItemIntent({ search }: { search: string }) {
  const { locale } = useLocale()
  const copy = wardrobeCopy[locale].itemIntent
  const intent = wardrobeItemIntent(search)
  const [result, setResult] = useState<{ id: string; name: string | null; failed: boolean } | null>(null)
  useEffect(() => {
    if (!intent.id) return
    let active = true
    const id = intent.id
    void import('../../data/itemLookup/catalog').then(({ catalogResult }) => {
      if (active) setResult({ id, name: catalogResult.valid ? catalogResult.value.entries.find(entry => entry.id === id)?.item.name.default ?? null : null, failed: !catalogResult.valid })
    }).catch(() => { if (active) setResult({ id, name: null, failed: true }) })
    return () => { active = false }
  }, [intent.id])
  if (!intent.requested) return null
  const current = result?.id === intent.id ? result : null
  return <section className="wardrobe-share" aria-label={copy.title}>
    <h2>{copy.title}</h2>
    <p role="status">{!intent.id ? copy.missing : !current ? copy.loading : current.failed ? copy.unavailable : current.name ? `${current.name} — ${copy.explanation}` : copy.missing}</p>
    <Link className="text-link" to={intent.returnUrl}>{copy.back}</Link>
  </section>
}
