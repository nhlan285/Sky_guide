/* global console */
import { readFile } from 'node:fs/promises'
console.log(await readFile('data/wiki-media/report.json', 'utf8'))
