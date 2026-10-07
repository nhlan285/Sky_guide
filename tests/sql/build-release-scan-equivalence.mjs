import { writeFileSync } from 'node:fs'
import { Buffer } from 'node:buffer'
import process from 'node:process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildReleaseMetadataScanProposal } from './build-release-metadata-scan-proposal.mjs'
import { releaseScanCases } from '../fixtures/releaseMetadataScanCases.mjs'

const literal = s => "'"+s.replaceAll("'","''")+"'"
const members='catalog_version text,id text,position integer,owner_revision bigint'
const schemas={release_item:members,release_lookup:members,release_spirit:members,release_season:members,
 release_provenance:'catalog_version text,id text,position integer',release_source_path:'catalog_version text,position integer',
 domain_identity:'kind text,id text,revision bigint,fixture boolean,retired_at text',
 item:'id text,record_status text',spirit:'id text,record_status text',season:'id text,record_status text',
 provenance:'id text,source_id text,source_url text,verification_status text'}
const flagNames='incomplete_membership,invalid_order,invalid_owner,invalid_publication,invalid_provenance'
export function buildReleaseScanEquivalence() {
 const proposal=buildReleaseMetadataScanProposal(),old=proposal.originalBody
 const start=old.indexOf('or not exists(select 1 from sky_private.release_item')
 if(start<0)throw new Error('Original incomplete predicate changed')
 const incomplete=old.slice(start+3,old.indexOf(' then',start))
 const selects=new Map([...old.matchAll(/select (exists\([\s\S]*?\)) into (invalid_order|invalid_owner);/g)].map(m=>[m[2],m[1]]))
 const tail=old.slice(old.indexOf('if invalid_order or invalid_owner'))
 const prov=tail.indexOf('or exists(select 1 from sky_private.release_provenance r')
 const published=tail.slice(tail.indexOf('or exists(')+3,prov).trim(),provenance=tail.slice(prov+3,tail.indexOf(' then',prov)).trim()
 if(selects.size!==2||prov<0)throw new Error('Original predicates changed')
 const legacy='select '+[incomplete,selects.get('invalid_order'),selects.get('invalid_owner'),published,provenance].join(',\n')
 const fused=proposal.proposedBody.match(/ with scope[\s\S]*? into incomplete_membership,invalid_order,invalid_owner,invalid_publication,invalid_provenance;/)?.[0]
 if(!fused)throw new Error('Proposed predicate select missing')
 const scoped=s=>s.replaceAll('sky_private.','').replaceAll('catalog_version=version',"catalog_version='fixture-scan'")
 const revised=scoped(fused.replace(' into '+flagNames+';',''))
 const cases=releaseScanCases()
 const definitions=Object.entries(schemas).map(([name,type])=>`${name} as materialized(select * from jsonb_to_recordset(test_case.value->'state'->${literal(name)}) as r(${type}))`).join(',\n')
 const query=`-- READ ONLY / synthetic SQL predicates only. No function installation, DML, role change or benchmark proof.
with cases as (select value,ordinality from jsonb_array_elements(${literal(JSON.stringify(cases))}::jsonb) with ordinality)
select jsonb_build_object('cases',count(*),'observations',jsonb_agg(jsonb_build_object('case',test_case.value->>'name','legacy',result.legacy,'proposed',result.proposed) order by test_case.ordinality),'mismatches',coalesce(jsonb_agg(jsonb_build_object('case',test_case.value->>'name','legacy',result.legacy,'proposed',result.proposed)) filter(where result.legacy is distinct from result.proposed),'[]'::jsonb)) as equivalence
from cases test_case cross join lateral (
 with ${definitions}
 select (select to_jsonb(flags) from (${scoped(legacy)}) flags(${flagNames})) as legacy,
        (select to_jsonb(flags) from (${revised}) flags(${flagNames})) as proposed
) result;\n`
 if(query.includes('sky_private.')||Buffer.byteLength(query)>500000)throw new Error('Read-only corpus namespace/byte boundary changed')
 return {query,cases,legacySelect:scoped(legacy),proposedSelect:revised}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 if(!process.argv[2])throw new Error('Provide E-drive read-only fixture path')
 const r=buildReleaseScanEquivalence();writeFileSync(process.argv[2],r.query)
 process.stdout.write(JSON.stringify({cases:r.cases.length,bytes:Buffer.byteLength(r.query),status:'READ ONLY/PREDICATE CORPUS, NOT TRIGGER OR COST PROOF'})+'\n')
}
