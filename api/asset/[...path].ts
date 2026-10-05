/**
 * Vercel Function: private Cloudflare R2 asset signer
 *
 * Public route:
 *   GET /assets/items/<variant>/<sha256>.webp
 *
 * Internal route:
 *   GET /api/asset/<variant>/<sha256>.webp
 *
 * R2 credentials remain server-side only.
 */

import {
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const ASSET_RE =
  /^(?:\/api\/asset\/|\/assets\/items\/)(thumbnails|cards|detail)\/([a-f0-9]{64}\.webp)$/
const SIGNED_URL_TTL_SECONDS = 3600

function assetKey(
  pathname: string,
): { variant: string; filename: string } | null {
  const match = ASSET_RE.exec(pathname)
  if (!match) return null
  return {
    variant: match[1],
    filename: match[2],
  }
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

async function handler(
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
    console.error('[asset-r2] storage not configured')
    return new Response('Storage not configured', {
      status: 503,
    })
  }

  const url = new URL(req.url)
  const parsed = url.pathname === '/api/asset/[...path]'
    ? assetKey(`/api/asset/${url.searchParams.get('variant') ?? ''}/${url.searchParams.get('file') ?? ''}`)
    : assetKey(url.pathname)

  if (!parsed) {
    return new Response('Not Found', {
      status: 404,
    })
  }

  const key =
    `items/${parsed.variant}/${parsed.filename}`

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

// A default function is a Node (req, res) handler on Vercel. Opt into Web APIs.
export default { fetch: handler }
