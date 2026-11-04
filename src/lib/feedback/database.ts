import { Pool, type PoolClient } from "pg";

export interface QueryDatabase {
  query<Row = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{rows: Row[]; rowCount: number | null}>;
  transaction<T>(fn: (tx: QueryDatabase) => Promise<T>): Promise<T>;
}

/** Private production PostgreSQL only. Pool connects lazily; never a disk/memory fallback. */
export function createFeedbackDatabase(connectionString: string): QueryDatabase & {close(): Promise<void>} {
  if (!/^postgres(?:ql)?:\/\//.test(connectionString)) throw new Error("PostgreSQL configuration required");
  const pool = new Pool({connectionString, max: 4, connectionTimeoutMillis: 5000, statement_timeout: 10000, idleTimeoutMillis: 30000});
  const adapter = (client: Pool | PoolClient): QueryDatabase => ({
    async query<Row>(sql: string, params: unknown[] = []) {
      const result = await client.query(sql, params);
      return {rows: result.rows as Row[], rowCount: result.rowCount};
    },
    async transaction<T>(fn: (tx: QueryDatabase) => Promise<T>): Promise<T> {
      if (client !== pool) throw new Error("Nested transactions are unsupported");
      const connection = await pool.connect();
      try {
        await connection.query("BEGIN");
        const value = await fn(adapter(connection));
        await connection.query("COMMIT");
        return value;
      } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
      } finally { connection.release(); }
    },
  });
  return {...adapter(pool), close: () => pool.end()};
}
