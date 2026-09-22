// Chat attachments. The bytes go to a mounted volume, never into Postgres, and never
// anywhere the web server will serve directly — every download goes through a route
// that checks group membership first.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";

// The container sets UPLOAD_DIR to the mounted volume. The default is relative so a
// plain `npm run dev` on a host doesn't die trying to mkdir an absolute container path.
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), "uploads");
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

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

try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (error) {
  throw new Error(`Can't create the upload directory at ${UPLOAD_DIR}: ${error.message}`);
}

const storage = multer.diskStorage({
  destination: (req, file, done) => done(null, UPLOAD_DIR),
  // The stored name is random and extensionless-by-our-choosing: the client's
  // filename is kept as metadata only, so a name like "../../x" or "x.sh" can't
  // decide where the file lands or what it's called on disk.
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

/** Guards against a stored path escaping the upload directory before any read. */
export function resolveStored(storedName) {
  const resolved = path.resolve(UPLOAD_DIR, storedName);
  if (resolved !== path.join(UPLOAD_DIR, path.basename(storedName))) return null;
  return resolved;
}

export function removeStored(storedName) {
  const resolved = storedName && resolveStored(storedName);
  if (resolved) fs.promises.unlink(resolved).catch(() => {});
}
