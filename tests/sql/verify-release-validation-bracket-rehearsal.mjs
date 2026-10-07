import { readFileSync } from 'node:fs'
import process from 'node:process'
import { buildReleaseValidationBracketRehearsal,verifyReleaseValidationBracketReceipt } from './build-release-validation-bracket-rehearsal.mjs'

// Only ACTUAL native output qualifies; synthetic corruption tests are not proof.
if(!process.argv[2])throw new Error('Provide actual native bracket_receipt JSON outside Git')
const prepared=await buildReleaseValidationBracketRehearsal()
const checked=verifyReleaseValidationBracketReceipt(JSON.parse(readFileSync(process.argv[2],'utf8')),prepared)
process.stdout.write(JSON.stringify({scope:'single-connection SQL/rollback proof only',...checked})+'\n')
