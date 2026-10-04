/**
 * Vercel Function: private Cloudflare R2 asset signer
 *
 * Route:
 *   GET /api/asset/<variant>/<sha256>.webp
 *
 * Flow:
 *   browser
 *     -> Vercel Function
 *     -> generate short-lived R2 presigned URL
 *     -> 302 redirect
 *     -> browser downloads directly from Cloudflare R2
 *
 * R2 credentials remain server-side only.
 */

import {
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const ALLOWED_VARIANTS = new Set([
  'thumbnails',
  'cards',
  'detail',
])

const SHA256_WEBP_RE = /^[a-f0-9]{64}\.webp$/
const SIGNED_URL_TTL_SECONDS = 3600

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

  const rawPath = url.pathname.replace(
    /^\/api\/asset\//,
    '',
  )

  const slash = rawPath.indexOf('/')

  if (slash === -1) {
    return new Response('Not Found', {
      status: 404,
    })
  }

  const variant = rawPath.slice(0, slash)
  const filename = rawPath.slice(slash + 1)

  if (
    !ALLOWED_VARIANTS.has(variant) ||
    !SHA256_WEBP_RE.test(filename)
  ) {
    return new Response('Not Found', {
      status: 404,
    })
  }

  const key = `items/${variant}/${filename}`

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
          'private, max-age=1800',
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
      `[asset-r2] ${key}: ${message}`,
    )

    return new Response(
      'Internal Server Error',
      {
        status: 500,
      },
    )
  }
}