/**
 * Vitest setup.
 *
 * Next loads `.env` for the app; vitest does not. The wallet's database tests
 * need `DATABASE_URL` in `process.env` **before** `@/lib/prisma` is imported
 * (it reads the variable at module load), so load it here, where it runs ahead
 * of every test file.
 *
 * Absent `.env` is not an error: the database suite skips itself when
 * `DATABASE_URL` is unset, so the pure tests still run anywhere.
 */
try {
  // Node >= 20.6. Absent on older runtimes — the try/catch covers that.
  (process as unknown as { loadEnvFile?: (path?: string) => void })
    .loadEnvFile?.(".env");
} catch {
  // No .env, or an older Node. The database suite skips itself.
}
