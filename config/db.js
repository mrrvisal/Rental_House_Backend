require("dotenv").config();

const mysql = require("mysql2/promise");
const path = require("path");
const fs = require("fs");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "rental_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 20000,
  ssl: process.env.DB_CA_PATH
    ? {
        ca: fs.readFileSync(path.resolve(__dirname, process.env.DB_CA_PATH)),
        rejectUnauthorized: true,
      }
    : undefined,
});

module.exports = pool;
