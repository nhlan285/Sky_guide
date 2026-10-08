import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { decodeReleaseRows } from '../../src/server/releaseRows.ts'
import { canonicalizeSnapshotFiles } from '../../src/server/domainSnapshot.ts'
import { releaseFixture } from '../fixtures/releaseRows.mjs'

const actual=JSON.parse(readFileSync(process.argv[2],'utf8')),{snapshot}=releaseFixture()
if(process.argv[3]==='--without-optional') {
  delete snapshot.manifest.source;delete snapshot.manifest.importReport;snapshot.manifest.assetManifestVersion=null
}
assert.deepEqual(decodeReleaseRows(actual.release,actual.catalog),canonicalizeSnapshotFiles(snapshot))
process.stdout.write('Actual hosted typed rows -> complete canonical fixture byte/metadata parity PASS\n')
