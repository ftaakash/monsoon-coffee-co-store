import "server-only"

import Database from "better-sqlite3"
import fs from "node:fs"
import path from "node:path"

import { SCHEMA } from "./schema"
import { seedDatabase } from "./seed"

// One SQLite connection per server process. The file is created (and seeded)
// on first use, so a fresh checkout needs no setup step.
const DB_PATH = path.resolve(
  process.env.DATABASE_PATH || path.join(process.cwd(), "data", "monsoon.db")
)

declare global {
  // Kept on globalThis so `next dev` hot reloads reuse the open connection.
  // eslint-disable-next-line no-var
  var __monsoonDb: Database.Database | undefined
}

function open() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  const db = new Database(DB_PATH)
  // WAL lets reads continue while a write is in progress.
  db.pragma("journal_mode = WAL")
  db.pragma("foreign_keys = ON")
  db.pragma("busy_timeout = 5000")
  db.exec(SCHEMA)
  seedDatabase(db)
  return db
}

export function getDb() {
  if (!globalThis.__monsoonDb) globalThis.__monsoonDb = open()
  return globalThis.__monsoonDb
}

export const now = () => new Date().toISOString()

export const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

export const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export const toJson = (value: unknown) =>
  value === undefined || value === null ? null : JSON.stringify(value)
