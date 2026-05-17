import { app } from 'electron'
import initSqlJs, { type Database } from 'sql.js'
import path from 'path'
import fs from 'fs'

let db: Database | null = null
let dbInitPromise: Promise<Database> | null = null
let writeLock = false

function getDbPath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'data.db')
}

export function getDatabase(): Promise<Database> {
  if (db) return Promise.resolve(db)
  if (dbInitPromise) return dbInitPromise

  dbInitPromise = (async () => {
    const dbPath = getDbPath()
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const SQL = await initSqlJs()

    if (fs.existsSync(dbPath)) {
      const buf = fs.readFileSync(dbPath)
      db = new SQL.Database(buf)
    } else {
      db = new SQL.Database()
    }

    db.run(`
      CREATE TABLE IF NOT EXISTS used_poems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        poem_id TEXT NOT NULL UNIQUE,
        used_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS saved_videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        poem_title TEXT NOT NULL,
        poem_author TEXT NOT NULL,
        poem_content TEXT NOT NULL,
        scene_description TEXT NOT NULL,
        prompt_json TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT ''
      )
    `)

    return db
  })()

  return dbInitPromise
}

export function saveDatabase() {
  if (!db || writeLock) return
  writeLock = true
  try {
    const dbPath = getDbPath()
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
  } catch (err) {
    console.error('saveDatabase 失败:', err)
  } finally {
    writeLock = false
  }
}

export function closeDatabase() {
  saveDatabase()
  if (db) {
    db.close()
    db = null
  }
}

// ====== 诗词去重操作 ======

export function isPoemUsed(poemId: string): boolean {
  if (!db) return false
  // sql.js 的 exec() 不支持参数绑定，用 prepare()
  const stmt = db.prepare('SELECT 1 FROM used_poems WHERE poem_id = ?')
  stmt.bind([poemId])
  const hasRow = stmt.step()
  stmt.free()
  return hasRow
}

export function markPoemUsed(poemId: string) {
  if (!db) return
  db.run('INSERT OR IGNORE INTO used_poems (poem_id) VALUES (?)', [poemId])
}

export function getUsedPoemIds(): string[] {
  if (!db) return []
  const result = db.exec('SELECT poem_id FROM used_poems')
  if (result.length === 0) return []
  return result[0].values.map((row: unknown[]) => row[0] as string)
}

export function resetUsedPoems() {
  if (!db) return
  db.run('DELETE FROM used_poems')
}
