import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLocale } from '../../shared/i18n/useLocale'
import { Button, SectionCard, StatusBadge, TextInput } from '../../shared/ui/primitives'
import { estimateSourcePath, sampleAttribution, sourceNodeKey, sourceTree, sourceVisits, treeSample, treeSourceUrl, visitSourceUrl } from './sourceSamples'

const vi = {
  tree: 'Cây spirit', visits: 'Traveling Spirit', back: 'Về Khám phá', scope: 'Mẫu đã đối chiếu nguồn · 05/10/2026',
  treeNote: 'Một cây Regular Spirit với 10 node và 9 điều kiện mở khóa đã đối chiếu. Đây là mẫu có nguồn, không phải dữ liệu đầy đủ cho mọi spirit hoặc giá game hiện tại.',
  visitsNote: 'Hai lần ghé lịch sử của cùng một spirit được giữ riêng. Ngày bắt đầu có nguồn; giờ, múi giờ, ngày kết thúc và cây từng lần ghé chưa được xác minh. Không dùng mẫu này để đếm ngược hoặc dự đoán.',
  query: 'Tìm trong mẫu spirit', empty: 'Không có mẫu phù hợp. Xóa nội dung tìm kiếm để xem lại.',
  select: 'Chọn node muốn mở', needs: 'Cần mở trước', root: 'Không có node cha trong cây', unknown: 'Chưa rõ giá', free: 'Miễn phí theo nguồn',
  total: 'Ước tính đường mở khóa', choose: 'Chọn ít nhất một node để tính các điều kiện và chi phí liên quan.',
  subtotal: 'Phần chi phí đã biết', partial: 'Chưa đủ để gọi là tổng giá. Còn node chưa rõ giá:', included: 'Các node phải mở (mỗi node chỉ tính một lần)', clear: 'Bỏ chọn tất cả',
  conditions: 'Điều kiện ngoài cây', foreign: 'Chưa nối node với item trong danh mục; không áp giá này sang item khác.',
  source: 'Nguồn và phạm vi', sourceLink: 'Xem bản nguồn đã ghim', dates: 'Chỉ có ngày; giờ và ngày kết thúc chưa rõ.',
  failure: 'Không thể tính từ mẫu này. Lựa chọn được giữ nguyên.',
}
const en: typeof vi = {
  tree: 'Spirit tree', visits: 'Traveling Spirit', back: 'Back to Explore', scope: 'Source-reviewed sample · 2026-10-05',
  treeNote: 'One Regular Spirit tree with 10 reviewed nodes and 9 prerequisites. This sourced sample is not full spirit coverage or a statement of current game prices.',
  visitsNote: 'Two historical visits by the same spirit remain separate. Start dates are sourced; time, timezone, end dates and per-visit trees are unknown. This sample does not provide countdowns or predictions.',
  query: 'Search spirit samples', empty: 'No matching sample. Clear your search to return.',
  select: 'Choose nodes to unlock', needs: 'Requires', root: 'No parent node within this tree', unknown: 'Price unknown', free: 'Free according to source',
  total: 'Unlock path estimate', choose: 'Choose at least one node to include its prerequisites and costs.',
  subtotal: 'Known cost subtotal', partial: 'This is not a complete price. Unknown-cost nodes:', included: 'Required nodes (counted once each)', clear: 'Clear selection',
  conditions: 'Conditions outside the tree', foreign: 'Nodes are not linked to catalogue items; these prices are not applied to unrelated items.',
  source: 'Source and scope', sourceLink: 'Open pinned source', dates: 'Date only; time and end date unknown.',
  failure: 'This sample could not be calculated. Your selection is kept.',
}

export function SpiritSamples({ mode }: { mode: 'tree' | 'visits' }) {
  const copy = useLocale().locale === 'vi' ? vi : en
  const id = useId()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const name = mode === 'tree' ? treeSample.spiritName : sourceVisits[0].spiritName
  const visible = name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  const estimate = selected.length ? estimateSourcePath(selected) : null
  const required = new Set(estimate?.valid ? estimate.value.includedNodeIds : [])

  return <div className="information-page spirit-samples">
    <Link className="text-link" to="/hub">← {copy.back}</Link>
    <div className="page-intro"><h1 id="page-title" tabIndex={-1}>{mode === 'tree' ? copy.tree : copy.visits}</h1>
      <StatusBadge tone="info">{copy.scope}</StatusBadge><p>{mode === 'tree' ? copy.treeNote : copy.visitsNote}</p>
    </div>
    <nav className="spirit-sample-nav" aria-label={copy.tree}><Link className="button button--quiet" to="/spirits">{copy.tree}</Link><Link className="button button--quiet" to="/traveling-spirits">{copy.visits}</Link></nav>
    <TextInput id={`${id}-query`} label={copy.query} type="search" value={query} onChange={event => setQuery(event.target.value)} />
    {!visible ? <p role="status">{copy.empty}</p> : mode === 'tree' ? <>
      <SectionCard id="spirit-tree-sample" title={name}>
        <fieldset className="spirit-node-list"><legend>{copy.select}</legend>
          {sourceTree.nodes.map(node => <label className={`spirit-node${required.has(node.id) ? ' is-required' : ''}`} key={node.id}>
            <input type="checkbox" checked={selected.includes(node.id)} onChange={event => { const checked = event.target.checked; setSelected(current => checked ? [...current, node.id] : current.filter(value => value !== node.id)) }} />
            <span><strong>{sourceNodeKey(node.id)} · {node.label}</strong><span className="spirit-node-detail">{node.parentNodeIds.length ? `${copy.needs}: ${node.parentNodeIds.map(sourceNodeKey).join(', ')}` : copy.root}</span>
              <span className="spirit-node-detail">{node.costStatus === 'unknown' ? copy.unknown : node.costStatus === 'free' ? copy.free : node.costs.map(cost => `${cost.amount} ${cost.sourceCurrencyLabel}`).join(' + ')}</span></span>
          </label>)}
        </fieldset>
        <Button className="button--quiet" disabled={!selected.length} onClick={() => setSelected([])}>{copy.clear}</Button>
        <p className="section-note">{copy.foreign}</p>
      </SectionCard>
      <SectionCard id="spirit-path-estimate" title={copy.total}>
        <div role="status" aria-live="polite">{!estimate ? <p>{copy.choose}</p> : !estimate.valid ? <p>{copy.failure}</p> : <>
          <h3>{copy.subtotal}</h3><p className="spirit-subtotal">{estimate.value.knownSubtotal.map(cost => `${cost.amount} ${cost.sourceCurrencyLabel}`).join(' + ') || '—'}</p>
          {!estimate.value.complete ? <p>{copy.partial} {estimate.value.missingCostNodeIds.map(sourceNodeKey).join(', ')}</p> : null}
          <p>{copy.included}: {estimate.value.includedNodeIds.map(sourceNodeKey).join(', ')}</p>
        </>}</div>
        <h3>{copy.conditions}</h3><ul>{treeSample.externalUnlockConditions.map(condition => <li key={condition}>{condition}</li>)}</ul>
      </SectionCard>
    </> : <SectionCard id="traveling-visit-sample" title={name}>
      <ul className="spirit-visit-list">{[...sourceVisits].sort((a, b) => b.startsAt.value.localeCompare(a.startsAt.value)).map(visit => <li key={visit.id}>
        <h3>{visit.sourceVisitKey}</h3><time dateTime={visit.startsAt.value}>{visit.startsAt.value}</time><p>{copy.dates}</p>
      </li>)}</ul>
    </SectionCard>}
    <SectionCard id="spirit-sample-source" title={copy.source}>
      <p>{sampleAttribution}</p><a className="text-link" href={mode === 'tree' ? treeSourceUrl : visitSourceUrl} target="_blank" rel="noopener noreferrer">{copy.sourceLink} ↗</a>
    </SectionCard>
  </div>
}
