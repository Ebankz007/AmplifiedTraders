import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { loginSchema, firstError } from "@/lib/validators";
import {
  rateLimit,
  rateLimitKey,
  resetRateLimit,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import {
  createAdminSession,
  setAdminSessionCookie,
  sessionMeta,
} from "@/lib/auth";

/**
 * A real bcrypt hash to compare against when the email is unknown, so a missing
 * account and a wrong password take the same time (no admin enumeration). Mirrors
 * the member login route deliberately — same timing discipline, separate cookie.
 */
let dummyHash: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword("timing-equalisation-placeholder");
  return dummyHash;
}

export async function POST(request: Request) {
  const key = rateLimitKey(request, "admin-login");
  const rl = rateLimit(key, RATE_LIMITS.login.limit, RATE_LIMITS.login.windowMs);
  if (!rl.ok) {
    return Response.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const admin = await prisma.admin.findUnique({ where: { email } });
  const hash = admin?.passwordHash ?? (await getDummyHash());
  const valid = await verifyPassword(password, hash);

  if (!admin || !valid) {
    return Response.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if (!admin.isActive) {
    return Response.json(
      { error: "This administrator account is disabled." },
      { status: 403 },
    );
  }

  const { token, expiresAt } = await createAdminSession(
    admin.id,
    sessionMeta(request),
  );
  await setAdminSessionCookie(token, expiresAt);
  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  resetRateLimit(key);

  return Response.json({
    ok: true,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
  });
}
