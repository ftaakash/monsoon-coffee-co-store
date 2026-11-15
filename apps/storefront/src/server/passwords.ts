import "server-only"

import crypto from "node:crypto"

// Passwords are never stored. We store "salt:hash", where hash is scrypt (a
// deliberately slow key-derivation function) of the password and a random salt.
const KEY_LENGTH = 64

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex")
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string | null) {
  if (!stored) return false
  const [salt, hash] = stored.split(":")
  if (!salt || !hash) return false
  const expected = new Uint8Array(Buffer.from(hash, "hex"))
  const actual = new Uint8Array(crypto.scryptSync(password, salt, KEY_LENGTH))
  // Constant-time compare, so response timing doesn't leak how close a guess was.
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

// Session tokens: 32 random bytes, unguessable and meaningless on their own.
export const newSessionToken = () => crypto.randomBytes(32).toString("base64url")
