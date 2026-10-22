import { randomBytes, scrypt as scryptCb, scryptSync, timingSafeEqual } from "node:crypto";

/** Demo-mode password hashing. Supabase mode never touches this. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return Promise.resolve(false);
  return new Promise((resolve) => {
    scryptCb(password, Buffer.from(saltHex, "hex"), 32, (err, derived) => {
      if (err) return resolve(false);
      const expected = Buffer.from(hashHex, "hex");
      resolve(expected.length === derived.length && timingSafeEqual(expected, derived));
    });
  });
}
