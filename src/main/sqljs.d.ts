declare module 'sql.js' {
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database
  }
  interface Database {
    run(sql: string, params?: unknown[]): Database
    exec(sql: string, params?: unknown[]): QueryExecResult[]
    prepare(sql: string): Statement
    export(): Uint8Array
    close(): void
  }
  interface QueryExecResult {
    columns: string[]
    values: unknown[][]
  }
  interface Statement {
    bind(params?: unknown[]): boolean
    step(): boolean
    getAsObject(): Record<string, unknown>
    free(): void
  }
  export default function initSqlJs(config?: Record<string, unknown>): Promise<SqlJsStatic>
}

declare module 'ffmpeg-static' {
  const path: string | null
  export default path
}
