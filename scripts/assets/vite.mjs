import { createReadStream } from 'node:fs'
import { stat, realpath } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { configuration } from './config.mjs'

export function localItemAssets(settings) {
  return {
    name: 'sky-guide-local-item-assets',
    apply: 'serve',
    configureServer(server) {
      const config = settings ?? configuration()
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0]
        if (!path?.startsWith('/assets/items/')) return next()
        if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; res.end(); return }
        const match = /^\/assets\/items\/(thumbnails|cards|detail)\/([a-f0-9]{64}\.webp)$/.exec(path)
        const manifest = /^\/assets\/items\/manifests\/(index\.json|items-\d{2}\.json)$/.exec(path)
        if (!match && !manifest) { res.statusCode = 404; res.end(); return }
        const root = match ? config.processedDir : config.manifestDir
        const file = match ? join(root, match[1], match[2]) : join(root, manifest[1])
        try {
          const actual = await realpath(file)
          if (actual.toLowerCase() !== resolve(file).toLowerCase()) throw new Error('Unsafe local asset path')
          const info = await stat(file)
          if (!info.isFile()) throw new Error('Missing asset')
          res.setHeader('Content-Type', match ? 'image/webp' : 'application/json')
          res.setHeader('Content-Length', info.size)
          res.setHeader('Cache-Control', match ? 'public,max-age=31536000,immutable' : 'no-cache')
          if (req.method === 'HEAD') { res.end(); return }
          const stream = createReadStream(file)
          stream.on('error', () => { res.destroy() })
          stream.pipe(res)
        } catch (e) {
          if (e.code === 'ENOENT') return next()
          res.statusCode = 500; res.end('Local asset store unavailable')
        }
      })
    },
  }
}
