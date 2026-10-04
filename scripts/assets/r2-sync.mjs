import { createReadStream } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { loadEnvFile } from 'node:process'
import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3'

try {
  loadEnvFile('.env.local')
} catch (error) {
  if (error?.code !== 'ENOENT') throw error
}

const ROOT = process.env.SKY_GUIDE_ASSET_ROOT || 'E:\\SkyGuideAssets'
const BUCKET = process.env.R2_BUCKET

const requiredEnv = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_ENDPOINT',
  'R2_BUCKET',
]

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`)
  }
}

const client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  maxAttempts: 5,
})

const VARIANTS = ['thumbnails', 'cards', 'detail']
const CONCURRENCY = 8
const DRY_RUN = process.argv.includes('--dry-run')

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(dir, entry.name))
}

async function listRemoteKeys(prefix) {
  const keys = new Set()
  let continuationToken

  do {
    const result = await client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      }),
    )

    for (const object of result.Contents ?? []) {
      if (object.Key) keys.add(object.Key)
    }

    continuationToken = result.IsTruncated
      ? result.NextContinuationToken
      : undefined
  } while (continuationToken)

  return keys
}

async function buildLocalFiles() {
  const files = []

  for (const variant of VARIANTS) {
    const dir = path.join(ROOT, 'processed', variant)
    const localFiles = await listFiles(dir)

    for (const localPath of localFiles) {
      const filename = path.basename(localPath)

      if (!/^[a-f0-9]{64}\.webp$/.test(filename)) {
        continue
      }

      const info = await stat(localPath)

      files.push({
        localPath,
        remoteKey: `items/${variant}/${filename}`,
        contentType: 'image/webp',
        size: info.size,
      })
    }
  }

  const manifestDir = path.join(ROOT, 'manifests')
  const manifests = await listFiles(manifestDir)

  for (const localPath of manifests) {
    const filename = path.basename(localPath)

    if (!(filename === 'index.json' || /^items-(?:[0-2]\d)\.json$/.test(filename))) continue

    const info = await stat(localPath)

    files.push({
      localPath,
      remoteKey: `manifests/${filename}`,
      contentType: 'application/json',
      size: info.size,
    })
  }

  return files
}

async function uploadFile(file) {
  if (DRY_RUN) return

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: file.remoteKey,
      Body: createReadStream(file.localPath),
      ContentType: file.contentType,
    }),
  )
}

async function runPool(items, worker, concurrency) {
  let index = 0

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (true) {
        const current = index++
        if (current >= items.length) return
        await worker(items[current], current)
      }
    },
  )

  await Promise.all(workers)
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }

  return `${value.toFixed(unit === 0 ? 0 : 2)} ${units[unit]}`
}

async function main() {
  console.log('Scanning local asset corpus...')

  const localFiles = await buildLocalFiles()
  const totalBytes = localFiles.reduce((sum, file) => sum + file.size, 0)

  console.log(`Local objects: ${localFiles.length}`)
  console.log(`Local size: ${formatBytes(totalBytes)}`)

  console.log('Listing existing R2 objects...')

  const remoteKeys = new Set()

  for (const prefix of [
    'items/thumbnails/',
    'items/cards/',
    'items/detail/',
    'manifests/',
  ]) {
    const keys = await listRemoteKeys(prefix)
    console.log(`${prefix} ${keys.size}`)

    for (const key of keys) {
      remoteKeys.add(key)
    }
  }

  const pending = localFiles.filter(
    (file) => !remoteKeys.has(file.remoteKey),
  )

  const skipped = localFiles.length - pending.length
  const pendingBytes = pending.reduce(
    (sum, file) => sum + file.size,
    0,
  )

  console.log(`Existing: ${skipped}`)
  console.log(`Pending: ${pending.length}`)
  console.log(`Pending size: ${formatBytes(pendingBytes)}`)

  if (DRY_RUN) {
    console.log('Dry run complete.')
    return
  }

  if (pending.length === 0) {
    console.log('R2 is already in sync.')
    return
  }

  let uploaded = 0
  let uploadedBytes = 0
  let failed = 0
  const failures = []
  const startedAt = Date.now()

  await runPool(
    pending,
    async (file) => {
      try {
        await uploadFile(file)

        uploaded++
        uploadedBytes += file.size
      } catch (error) {
        failed++
        failures.push({
          key: file.remoteKey,
          message: error?.message ?? String(error),
        })
      }

      const completed = uploaded + failed

      if (
        completed === 1 ||
        completed % 100 === 0 ||
        completed === pending.length
      ) {
        const elapsedSeconds = Math.max(
          (Date.now() - startedAt) / 1000,
          1,
        )

        const speed = uploadedBytes / elapsedSeconds
        const percent = (
          (completed / pending.length) *
          100
        ).toFixed(1)

        process.stdout.write(
          `\rProgress: ${completed}/${pending.length} (${percent}%) | Uploaded: ${uploaded} | Failed: ${failed} | ${formatBytes(uploadedBytes)} | ${formatBytes(speed)}/s`,
        )
      }
    },
    CONCURRENCY,
  )

  process.stdout.write('\n')

  console.log(`Uploaded: ${uploaded}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Failed: ${failed}`)
  console.log(`Uploaded bytes: ${formatBytes(uploadedBytes)}`)

  if (failures.length > 0) {
    console.error('First upload errors:')

    for (const failure of failures.slice(0, 10)) {
      console.error(`${failure.key}: ${failure.message}`)
    }

    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})