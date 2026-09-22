// Chat attachments. The bytes never go into Postgres, and never anywhere the web
// server will serve directly — every download goes through a route that checks group
// membership first.
//
// Two backends behind one interface. Locally the bytes land on disk (a Docker volume);
// on ECS they land in S3, because a Fargate task's filesystem is ephemeral and every
// attachment would vanish on the next deploy. Which one is live is decided by whether
// UPLOADS_BUCKET is set, so nothing else in the app has to know.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import multer from "multer";
import { DeleteObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

const BUCKET = process.env.UPLOADS_BUCKET ?? "";
export const usingS3 = BUCKET !== "";

// The container sets UPLOAD_DIR to the mounted volume. The default is relative so a
// plain `npm run dev` on a host doesn't die trying to mkdir an absolute container path.
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), "uploads");

// A conservative allow-list: things a browser can render or download safely. No
// archives, no scripts, nothing the server would ever be tempted to execute.
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
]);

const s3 = usingS3 ? new S3Client({ region: process.env.AWS_REGION ?? "ap-south-1" }) : null;

if (!usingS3) {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    throw new Error(`Can't create the upload directory at ${UPLOAD_DIR}: ${error.message}`);
  }
}

// The stored key is random and carries no extension: the client's filename is kept as
// metadata only, so a name like "../../x" or "x.sh" can't decide where the bytes land
// or what they're called. This is true of both backends.
const storage = usingS3
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, done) => done(null, UPLOAD_DIR),
      filename: (req, file, done) => done(null, crypto.randomUUID()),
    });

export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
  fileFilter: (req, file, done) => {
    if (!ALLOWED.has(file.mimetype)) {
      done(new Error("That file type isn't allowed"));
      return;
    }
    done(null, true);
  },
});

/** Multer's own errors are user-facing, so they're translated rather than thrown on. */
export function uploadErrorMessage(error) {
  if (error?.code === "LIMIT_FILE_SIZE") return "Files must be under 5 MB";
  if (error?.code === "LIMIT_FILE_COUNT") return "One file at a time";
  return error?.message ?? "Upload failed";
}

/**
 * Persist an uploaded file and return the key to store on the message.
 *
 * On disk multer has already written it and named it; in S3 the body is still in
 * memory, so this is where it gets a key and goes up.
 */
export async function storeUpload(file) {
  if (!usingS3) return file.filename;

  const key = crypto.randomUUID();
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );
  return key;
}

/** Guards against a stored path escaping the upload directory before any read. */
export function resolveStored(storedName) {
  const resolved = path.resolve(UPLOAD_DIR, storedName);
  if (resolved !== path.join(UPLOAD_DIR, path.basename(storedName))) return null;
  return resolved;
}

/**
 * A readable stream of the stored bytes, or null if it's gone. The route pipes this
 * itself rather than redirecting to a presigned URL, so membership is checked on
 * every single fetch instead of once per link.
 */
export async function openStored(storedName) {
  if (!usingS3) {
    const resolved = resolveStored(storedName);
    if (!resolved || !fs.existsSync(resolved)) return null;
    return fs.createReadStream(resolved);
  }

  try {
    const result = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: storedName }));
    return Readable.from(result.Body);
  } catch {
    return null;
  }
}

export function removeStored(storedName) {
  if (!storedName) return;

  if (!usingS3) {
    const resolved = resolveStored(storedName);
    if (resolved) fs.promises.unlink(resolved).catch(() => {});
    return;
  }

  s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: storedName })).catch(() => {});
}
