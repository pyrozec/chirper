const sqlite3 = require('sqlite3').verbose();
const config = require('../config/env');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.db = new sqlite3.Database(config.database.path, (err) => {
      if (err) {
        logger.error(`Database connection error: ${err.message}`);
        throw err;
      }
      logger.info('Connected to SQLite database');
    });

    this.init();
  }

  init() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS scheduled_calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT NOT NULL,
        message TEXT,
        schedule_time TEXT NOT NULL,
        recurrence TEXT,
        status TEXT DEFAULT 'pending',
        user_id INTEGER NOT NULL
      )
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        telegram_id INTEGER PRIMARY KEY,
        is_authorized INTEGER DEFAULT 0,
        preferred_language TEXT DEFAULT 'en',
        default_template TEXT
      )
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS call_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        phone_number TEXT NOT NULL,
        call_sid TEXT,
        status TEXT,
        timestamp TEXT NOT NULL,
        recording_url TEXT
      )
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS message_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        message TEXT NOT NULL,
        category TEXT DEFAULT 'default',
        shared_with TEXT DEFAULT '',
        UNIQUE(user_id, name)
      )
    `);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_scheduled_calls_user_id ON scheduled_calls (user_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_call_history_user_id ON call_history (user_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_message_templates_user_id ON message_templates (user_id)`);
  }

  async run(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function (err) {
        if (err) return reject(err);
        resolve(this);
      });
    });
  }

  async get(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  async all(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }
}

module.exports = new Database();