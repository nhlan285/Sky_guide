/**
 * Vercel Function: private Cloudflare R2 manifest proxy
 *
 * Route:
 *   GET /api/manifest/<name>.json
 *
 * Allowed:
 *   index
 *   items-00 ... items-29
 *
 * Flow:
 *   browser
 *     -> Vercel Function
 *     -> fetch private manifest from R2
 *     -> return JSON from the same origin
 *
 * Keeping manifest bytes on the Vercel response avoids browser CORS
 * failures while image bytes still redirect directly to private R2.
 *
 * R2 credentials remain server-side only.
 */

import {
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

const ALLOWED_NAMES = new Set<string>(['index'])

for (let i = 0; i <= 29; i++) {
  ALLOWED_NAMES.add(
    `items-${String(i).padStart(2, '0')}`,
  )
}

function getR2Client(): S3Client | null {
  const endpoint = process.env.R2_ENDPOINT
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    return null
  }

  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
}

export default async function handler(
  req: Request,
): Promise<Response> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        Allow: 'GET, HEAD',
      },
    })
  }

  const bucket = process.env.R2_BUCKET
  const client = getR2Client()

  if (!bucket || !client) {
    return new Response('Storage not configured', {
      status: 503,
    })
  }

  const url = new URL(req.url)

  const raw = url.pathname
    .replace(/^\/api\/manifest\//, '')
    .replace(/\.json$/, '')

  if (!ALLOWED_NAMES.has(raw)) {
    return new Response('Not Found', {
      status: 404,
    })
  }

  const key = `manifests/${raw}.json`

  try {
    if (req.method === 'HEAD') {
      await client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      )

      return new Response(null, {
        status: 200,
        headers: {
          'Content-Type':
            'application/json; charset=utf-8',
          'Cache-Control':
            'private, max-age=60',
          'X-Content-Type-Options':
            'nosniff',
        },
      })
    }

    const result = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    )

    if (!result.Body) {
      throw new Error('R2 manifest body missing')
    }

    const body = await result.Body.transformToString()

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type':
          'application/json; charset=utf-8',
        'Cache-Control':
          'private, max-age=60',
        'X-Content-Type-Options':
          'nosniff',
      },
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : String(error)

    console.error(
      `[manifest-r2] ${key}: ${message}`,
    )

    return new Response(
      'Internal Server Error',
      {
        status: 500,
      },
    )
  }
}
