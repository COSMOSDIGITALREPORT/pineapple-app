const mysql = require('mysql2/promise');

const isCloud = !!process.env.DB_SSL;

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASS     || '',
  database:           process.env.DB_NAME     || 'pineapple',
  waitForConnections: true,
  connectionLimit:    5,
  connectTimeout:     30000,
  timezone:           'local',
  ssl: isCloud ? { rejectUnauthorized: false } : undefined,
});

pool.on('connection', () => console.log('[DB] Connected to TiDB'));

module.exports = pool;
