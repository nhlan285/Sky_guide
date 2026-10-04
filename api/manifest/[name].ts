/**
 * Vercel Function: private Cloudflare R2 manifest signer
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
 *     -> generate short-lived R2 presigned URL
 *     -> 302 redirect
 *     -> browser downloads JSON directly from Cloudflare R2
 *
 * R2 credentials remain server-side only.
 */

import {
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const ALLOWED_NAMES = new Set<string>(['index'])

for (let i = 0; i <= 29; i++) {
  ALLOWED_NAMES.add(
    `items-${String(i).padStart(2, '0')}`,
  )
}

const SIGNED_URL_TTL_SECONDS = 300

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
    const command =
      req.method === 'HEAD'
        ? new HeadObjectCommand({
            Bucket: bucket,
            Key: key,
          })
        : new GetObjectCommand({
            Bucket: bucket,
            Key: key,
          })

    const signedUrl = await getSignedUrl(
      client,
      command,
      {
        expiresIn: SIGNED_URL_TTL_SECONDS,
      },
    )

    return new Response(null, {
      status: 302,
      headers: {
        Location: signedUrl,
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