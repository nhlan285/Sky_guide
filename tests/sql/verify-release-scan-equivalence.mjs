import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { releaseScanCases,referenceReleaseScanFlags } from '../fixtures/releaseMetadataScanCases.mjs'

export function verifyReleaseScanEquivalence(receipt) {
 const cases=releaseScanCases()
 assert.equal(receipt.cases,cases.length);assert.deepEqual(receipt.mismatches,[])
 assert.equal(receipt.observations.length,cases.length)
 receipt.observations.forEach((r,n)=>{
  assert.equal(r.case,cases[n].name)
  const expected=referenceReleaseScanFlags(cases[n].state)
  assert.deepEqual(r.legacy,expected,r.case+' legacy');assert.deepEqual(r.proposed,expected,r.case+' proposed')
 })
 const rejected=receipt.observations.filter(r=>Object.values(r.proposed).some(Boolean)).length
 assert.ok(rejected>0&&rejected<cases.length)
 return {cases:cases.length,rejected,matching:true}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 if(!process.argv[2])throw new Error('Provide actual read-only SQL receipt outside Git')
 process.stdout.write(JSON.stringify(verifyReleaseScanEquivalence(JSON.parse(readFileSync(process.argv[2],'utf8'))))+'\n')
}
