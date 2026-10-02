import ts from 'typescript'

// Static reads only. Upstream TypeScript is never executed or imported.
export const revision = '74007cf878ef44c764eb5a143ef01d4c80982509'
export const repository = 'thatskyapplication/thatskyapplication'
export const normalizationVersion = 'tsa-v1'
// Initial capture/import timestamp; retained when reproducing this immutable release.
export const generatedAt = '2026-10-02T17:53:41Z'
export const catalogVersion = `tsa-v1-${revision.slice(0, 12)}`
export const blobUrl = path => `https://github.com/${repository}/blob/${revision}/${path}`

export function parseSource(path, text) {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true)
  if (source.parseDiagnostics.length) throw new Error(`Cannot parse ${path}`)
  return source
}
export function unwrap(node) {
  while (node && (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node))) node = node.expression
  return node
}
export function property(node, key) {
  node = unwrap(node)
  return node && ts.isObjectLiteralExpression(node) ? node.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText().replace(/^['"]|['"]$/g, '') === key)?.initializer : undefined
}
export function literal(node) {
  node = unwrap(node)
  if (!node) return undefined
  if (ts.isNumericLiteral(node)) return Number(node.text)
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false
  if (node.kind === ts.SyntaxKind.NullKeyword) return null
  throw new Error(`Unsupported literal: ${node.getText().slice(0, 120)}`)
}
export function variable(source, name) {
  let result
  source.forEachChild(node => {
    if (ts.isVariableStatement(node)) for (const declaration of node.declarationList.declarations) {
      if (declaration.name.getText() === name) result = unwrap(declaration.initializer)
    }
  })
  if (!result) throw new Error(`Missing ${name} in ${source.fileName}`)
  return result
}
export function identityTable(source, name) {
  const declaration = source.statements.find(s => ts.isEnumDeclaration(s) && s.name.text === name)
  const entries = declaration ? declaration.members : variable(source, name).properties
  const result = {}
  for (const entry of entries) {
    const value = literal(entry.initializer)
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid stable ID ${name}.${entry.name.getText()}`)
    result[entry.name.getText()] = value
  }
  if (new Set(Object.values(result)).size !== entries.length) throw new Error(`Duplicate IDs in ${name}`)
  return result
}
export function reference(node, name, table) {
  node = unwrap(node)
  if (node && ts.isIdentifier(node)) node = variable(node.getSourceFile(), node.text)
  if (!node || !ts.isPropertyAccessExpression(node) || node.expression.getText() !== name || !(node.name.text in table)) {
    throw new Error(`Invalid ${name} reference: ${node?.getText()}`)
  }
  return table[node.name.text]
}
export function translations(source, section, namespace, ids) {
  let target
  const visit = node => {
    if (ts.isPropertyAssignment(node) && node.name.getText().replace(/^['"]|['"]$/g, '') === section && !target) target = unwrap(node.initializer)
    ts.forEachChild(node, visit)
  }
  visit(source)
  if (!target || !ts.isObjectLiteralExpression(target)) throw new Error(`Missing translation section ${section}`)
  return Object.fromEntries(target.properties.filter(p => ts.isPropertyAssignment(p) && ts.isComputedPropertyName(p.name) && p.name.expression.getText().startsWith(`${namespace}.`))
    .map(p => [reference(p.name.expression, namespace, ids), literal(p.initializer)]))
}
export function constructors(source) {
  const result = []
  const visit = node => {
    if (ts.isNewExpression(node) && ['StandardSpirit', 'SeasonalSpirit', 'GuideSpirit', 'ElderSpirit', 'Season'].includes(node.expression.getText())) {
      const data = unwrap(node.arguments?.[0])
      if (!data || !ts.isObjectLiteralExpression(data)) throw new Error(`Nonliteral domain definition in ${source.fileName}`)
      result.push({ kind: node.expression.getText(), data })
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return result
}
export function offers(node, tables, context, output = [], trail = []) {
  node = unwrap(node)
  if (!node) return output
  if (ts.isArrayLiteralExpression(node)) {
    node.elements.forEach((element, index) => offers(element, tables, context, output, [...trail, index]))
  } else if (ts.isObjectLiteralExpression(node)) {
    const cosmetic = unwrap(property(node, 'cosmetic'))
    if (cosmetic) {
      const cosmeticNodes = ts.isArrayLiteralExpression(cosmetic) ? cosmetic.elements : [cosmetic]
      const cost = unwrap(property(node, 'cost'))
      if (cost && !ts.isObjectLiteralExpression(cost)) throw new Error(`Nonliteral cost in ${context.path}`)
      const costs = cost ? Object.fromEntries(cost.properties.map(p => {
        if (!ts.isPropertyAssignment(p)) throw new Error(`Unsupported cost in ${context.path}`)
        return [p.name.getText(), literal(p.initializer)]
      })) : null
      const translation = unwrap(property(node, 'translation'))
      const common = translation && ts.isObjectLiteralExpression(translation) ? property(translation, 'key') : translation
      const commonKey = common && ts.isPropertyAccessExpression(common) && common.expression.getText() === 'CosmeticCommon' ? common.name.text : null
      const line = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line + 1
      for (const cosmeticNode of cosmeticNodes) output.push({
        ...context, upstreamId: reference(cosmeticNode, 'Cosmetic', tables.cosmetics), costs,
        commonKey, seasonPass: literal(property(node, 'seasonPass')) === true,
        pack: cosmeticNodes.length > 1, line, key: trail.join('-'),
      })
      offers(property(node, 'children'), tables, context, output, [...trail, 'children'])
    } else {
      for (const p of node.properties) if (ts.isPropertyAssignment(p)) offers(p.initializer, tables, context, output, [...trail, p.name.getText()])
    }
  } else if (node.kind !== ts.SyntaxKind.NullKeyword && node.kind !== ts.SyntaxKind.UndefinedKeyword && !(ts.isIdentifier(node) && node.text === 'undefined')) {
    throw new Error(`Unsupported offer at ${context.path}: ${node.getText().slice(0, 80)}`)
  }
  return output
}
