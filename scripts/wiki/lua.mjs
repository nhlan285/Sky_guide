// Parse only the literal `local data = { ... }` table. Never execute upstream Lua.
export function parseLuaData(source, diagnostics = []) {
  const start = /\blocal\s+data\s*=\s*\{/.exec(source)
  if (!start) throw new Error('Expected a literal local data table')
  let offset = start.index + start[0].length - 1
  function skip() {
    while (offset < source.length) {
      if (/\s/.test(source[offset])) { offset++; continue }
      if (!source.startsWith('--', offset)) break
      offset += 2
      const block = /^\[(=*)\[/.exec(source.slice(offset))
      if (block) {
        const end = source.indexOf(`]${block[1]}]`, offset + block[0].length)
        if (end < 0) throw new Error('Unclosed Lua comment')
        offset = end + block[1].length + 2
      } else { const end = source.indexOf('\n', offset); offset = end < 0 ? source.length : end + 1 }
    }
  }
  function take(char) { skip(); if (source[offset] !== char) throw new Error(`Expected ${char} at ${offset}: ${source.slice(offset, offset + 60)}`); offset++ }
  function value() {
    skip()
    const char = source[offset]
    if (char === '{') return table()
    if (char === '"' || char === "'") {
      offset++; let result = ''
      while (offset < source.length) {
        const next = source[offset++]
        if (next === char) return result
        if (next === '\\') { const escaped = source[offset++]; result += ({ n: '\n', r: '\r', t: '\t' })[escaped] ?? escaped }
        else result += next
      }
      throw new Error('Unclosed Lua string')
    }
    const literal = /^(?:-?\d+(?:\.\d+)?|true\b|false\b|nil\b)/.exec(source.slice(offset))
    if (!literal) throw new Error(`Nonliteral Lua value at ${offset}: ${source.slice(offset, offset + 80)}`)
    offset += literal[0].length
    return literal[0] === 'nil' ? null : literal[0] === 'true' ? true : literal[0] === 'false' ? false : Number(literal[0])
  }
  function table() {
    take('{'); const result = Object.create(null); let arrayIndex = 1
    while (true) {
      skip(); if (source[offset] === '}') { offset++; return result }
      let key
      const named = /^([a-zA-Z_][\w]*)\s*=/.exec(source.slice(offset))
      if (named) { key = named[1]; offset += named[0].length }
      else if (source[offset] === '[') { offset++; key = value(); take(']'); take('=') }
      else key = String(arrayIndex++)
      const next = value()
      if (Object.hasOwn(result, key)) diagnostics.push({ kind: 'duplicate-literal-key', key, previous: result[key], replacement: next, offset })
      result[key] = next
      skip(); if (source[offset] === ',' || source[offset] === ';') offset++
      else if (source[offset] !== '}') throw new Error(`Nonliteral Lua expression at ${offset}`)
    }
  }
  return table()
}
