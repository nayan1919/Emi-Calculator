/**
 * Database Connection Pool
 * ========================
 * MySQL connection pool using mysql2 with connection pooling
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'emi_calculator',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelayMs: 0,
});

/**
 * Execute a query using the connection pool
 * @param {string} sql - SQL query
 * @param {array} values - Query parameters
 * @returns {Promise<array>} Query results
 */
async function query(sql, values = []) {
    try {
        const connection = await pool.getConnection();
        const [results] = await connection.execute(sql, values);
        connection.release();
        return results;
    } catch (error) {
        console.error('❌ Database Error:', error);
        throw error;
    }
}

/**
 * Test database connection
 */
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        console.log('✅ Database connection successful');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

module.exports = {
    pool,
    query,
    testConnection,
};
