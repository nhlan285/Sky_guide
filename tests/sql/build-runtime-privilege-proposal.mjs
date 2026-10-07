import { readFileSync,writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'
import process from 'node:process'
import console from 'node:console'
import { assertRuntimePrivilegeCatalog,prepareRuntimePrivilegeProposal } from '../../src/server/runtimePrivilegePlan.ts'

const [inventoryPath,outputDir]=process.argv.slice(2)
if(!inventoryPath||!outputDir) throw new Error('Provide approved native inventory.json and E-drive review output directory')
const inventory=JSON.parse(readFileSync(inventoryPath,'utf8'))
assertRuntimePrivilegeCatalog(inventory) // Never adopt fresh catalog changes as the baseline.
const plan=prepareRuntimePrivilegeProposal()
const files={
 'runtime-privilege-preflight.sql':plan.preflight+'\n',
 'runtime-privilege-grant-proposal.sql':plan.grant,
 'runtime-privilege-rollback-proposal.sql':plan.rollback,
 'runtime-privilege-manifest.json':JSON.stringify({tables:plan.tables,helpers:plan.helpers},null,2)+'\n',
}
if(Object.values(files).some(v=>Buffer.byteLength(v)>200000)) throw new Error('Privilege proposal exceeds review file budget')
for(const [file,contents] of Object.entries(files)) writeFileSync(join(outputDir,file),contents)
console.log(JSON.stringify({tables:plan.tables.length,insert:plan.tables.filter(t=>t.insert.length).length,
 update:plan.tables.filter(t=>t.update.length&&!t.lockOnly).length,lockOnly:plan.tables.filter(t=>t.lockOnly).map(t=>t.table),
 delete:plan.tables.filter(t=>t.delete).length,helpers:plan.helpers.length,
 files:Object.fromEntries(Object.entries(files).map(([name,value])=>[name,{bytes:Buffer.byteLength(value),sha256:createHash('sha256').update(value).digest('hex')}]))}))
// This command only writes a review package; it cannot execute SQL/provision roles.
