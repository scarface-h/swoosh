import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';

/** Delete uploaded objects older than the grace period that have no ProductImage row. */
export async function cleanupOrphanedImages(graceHours = 24): Promise<number> {
  if (!env.S3_BUCKET || !env.S3_REGION || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) return 0;
  const client = new S3Client({
    region: env.S3_REGION, endpoint: env.S3_ENDPOINT, forcePathStyle: Boolean(env.S3_ENDPOINT),
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
  });
  const known = new Set((await prisma.productImage.findMany({ where: { objectKey: { not: null } }, select: { objectKey: true } })).map((row) => row.objectKey!));
  const cutoff = Date.now() - graceHours * 60 * 60_000;
  let token: string | undefined;
  let deleted = 0;
  do {
    const page = await client.send(new ListObjectsV2Command({ Bucket: env.S3_BUCKET, ContinuationToken: token }));
    const objects = (page.Contents ?? []).filter((entry) => entry.Key && entry.LastModified && entry.LastModified.getTime() < cutoff && !known.has(entry.Key));
    if (objects.length) {
      await client.send(new DeleteObjectsCommand({ Bucket: env.S3_BUCKET, Delete: { Objects: objects.map((entry) => ({ Key: entry.Key! })), Quiet: true } }));
      deleted += objects.length;
    }
    token = page.NextContinuationToken;
  } while (token);
  return deleted;
}
