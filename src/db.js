import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import Database from 'better-sqlite3';

const sqliteSchema = `
CREATE TABLE IF NOT EXISTS trends(id INTEGER PRIMARY KEY AUTOINCREMENT,term TEXT NOT NULL,source TEXT NOT NULL,score REAL DEFAULT 0,captured_at TEXT NOT NULL,UNIQUE(term,source,captured_at));
CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY AUTOINCREMENT,trend_id INTEGER,title TEXT NOT NULL,merchant TEXT NOT NULL,product_url TEXT,affiliate_url TEXT,price_brl REAL,commission_note TEXT,image_url TEXT,status TEXT DEFAULT 'candidate',created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS posts(id INTEGER PRIMARY KEY AUTOINCREMENT,product_id INTEGER,platform TEXT NOT NULL,caption TEXT NOT NULL,status TEXT DEFAULT 'draft',remote_id TEXT,error TEXT,created_at TEXT NOT NULL,published_at TEXT);
CREATE TABLE IF NOT EXISTS runs(id INTEGER PRIMARY KEY AUTOINCREMENT,started_at TEXT NOT NULL,finished_at TEXT,status TEXT NOT NULL,trends_found INTEGER DEFAULT 0,products_found INTEGER DEFAULT 0,posts_created INTEGER DEFAULT 0,error TEXT);
`;

let db;
if (process.env.DATABASE_URL) {
  const pool = new pg.Pool({connectionString:process.env.DATABASE_URL});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS trends(id BIGSERIAL PRIMARY KEY,term TEXT NOT NULL,source TEXT NOT NULL,score DOUBLE PRECISION DEFAULT 0,captured_at TIMESTAMPTZ NOT NULL,UNIQUE(term,source,captured_at));
    CREATE TABLE IF NOT EXISTS products(id BIGSERIAL PRIMARY KEY,trend_id BIGINT,title TEXT NOT NULL,merchant TEXT NOT NULL,product_url TEXT,affiliate_url TEXT,price_brl NUMERIC(12,2),commission_note TEXT,image_url TEXT,status TEXT DEFAULT 'candidate',created_at TIMESTAMPTZ NOT NULL);
    CREATE TABLE IF NOT EXISTS posts(id BIGSERIAL PRIMARY KEY,product_id BIGINT,platform TEXT NOT NULL,caption TEXT NOT NULL,status TEXT DEFAULT 'draft',remote_id TEXT,error TEXT,created_at TIMESTAMPTZ NOT NULL,published_at TIMESTAMPTZ);
    CREATE TABLE IF NOT EXISTS runs(id BIGSERIAL PRIMARY KEY,started_at TIMESTAMPTZ NOT NULL,finished_at TIMESTAMPTZ,status TEXT NOT NULL,trends_found INTEGER DEFAULT 0,products_found INTEGER DEFAULT 0,posts_created INTEGER DEFAULT 0,error TEXT)
  `);
  db = {
    async all(sql,params=[]){const q=sql.replace(/\?/g,(_,i)=>'$'+(++this.n));const r=await pool.query(q,params);this.n=0;return r.rows;},
    async run(sql,params=[]){let i=0;const q=sql.replace(/\?/g,()=>'$'+(++i));return pool.query(q,params);},
    async close(){await pool.end();}, n:0
  };
} else {
  const file=process.env.SQLITE_PATH||'./data/vendasautomaticas.sqlite';
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const sqlite=new Database(file);sqlite.pragma('journal_mode = WAL');sqlite.exec(sqliteSchema);
  db={async all(sql,params=[]){return sqlite.prepare(sql).all(...params);},async run(sql,params=[]){return sqlite.prepare(sql).run(...params);},async close(){sqlite.close();}};
}
export {db};
