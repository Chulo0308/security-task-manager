import * as OTPAuth from "otpauth";
import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-me-8bishopsgate-2026"
);

export function generateTotpSecret(accountLabel: string) {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: "8 Bishopsgate Security",
    label: accountLabel,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });
  return { base32: secret.base32, otpauthUrl: totp.toString() };
}

export function verifyTotpCode(base32Secret: string, code: string) {
  const totp = new OTPAuth.TOTP({
    issuer: "8 Bishopsgate Security",
    label: "user",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(base32Secret),
  });
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

export async function signTwoFactorChallenge(userId: string) {
  return new SignJWT({ sub: userId, purpose: "2fa" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(SECRET);
}

export async function verifyTwoFactorChallenge(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.purpose !== "2fa") return null;
    return (payload.sub as string) || null;
  } catch {
    return null;
  }
}
