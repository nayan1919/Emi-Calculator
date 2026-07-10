/**
 * Database Setup Script
 * =====================
 * Initialize database tables for EMI Calculator
 * 
 * Run: node setup-db.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'emi_calculator';

/**
 * SQL to create tables
 */
const SQL_CREATE_USERS_TABLE = `
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    
    INDEX idx_email (email),
    INDEX idx_phone (phone_number),
    INDEX idx_created (created_at)
);
`;

const SQL_CREATE_SESSIONS_TABLE = `
CREATE TABLE IF NOT EXISTS sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_expires (expires_at)
);
`;

const SQL_CREATE_CALCULATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS calculations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    loan_amount DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    tenure_months INT NOT NULL,
    monthly_emi DECIMAL(15, 2) NOT NULL,
    total_interest DECIMAL(15, 2) NOT NULL,
    calculation_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created (created_at)
);
`;

/**
 * Create database and tables
 */
async function setupDatabase() {
    let connection;

    try {
        console.log('📝 Starting database setup...\n');

        // Step 1: Connect to MySQL (without database)
        console.log(`🔗 Connecting to MySQL at ${DB_HOST}...`);
        connection = await mysql.createConnection({
            host: DB_HOST,
            user: DB_USER,
            password: DB_PASSWORD,
        });
        console.log('✅ Connected to MySQL\n');

        // Step 2: Create database
        console.log(`📦 Creating database: ${DB_NAME}`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
        console.log(`✅ Database '${DB_NAME}' created/verified\n`);

        // Step 3: Select database
        console.log(`🎯 Selecting database: ${DB_NAME}`);
        await connection.query(`USE ${DB_NAME}`);
        console.log('✅ Database selected\n');

        // Step 4: Create users table
        console.log('📋 Creating users table...');
        await connection.query(SQL_CREATE_USERS_TABLE);
        console.log('✅ Users table created/verified\n');

        // Step 5: Create sessions table
        console.log('📋 Creating sessions table...');
        await connection.query(SQL_CREATE_SESSIONS_TABLE);
        console.log('✅ Sessions table created/verified\n');

        // Step 6: Create calculations table
        console.log('📋 Creating calculations table...');
        await connection.query(SQL_CREATE_CALCULATIONS_TABLE);
        console.log('✅ Calculations table created/verified\n');

        // Step 7: Verify tables
        console.log('🔍 Verifying tables...');
        const [tables] = await connection.query('SHOW TABLES');
        console.log('📊 Tables in database:');
        tables.forEach(table => {
            const tableName = Object.values(table)[0];
            console.log(`   ✓ ${tableName}`);
        });

        console.log('\n✅ Database setup completed successfully!\n');
        console.log('📝 Next steps:');
        console.log('   1. Copy .env.example to .env');
        console.log('   2. Update database credentials in .env');
        console.log('   3. Run: npm install');
        console.log('   4. Run: npm start (or npm run dev)\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Database setup error:', error.message);
        console.error('\nTroubleshooting:');
        console.error('   • Check if MySQL is running');
        console.error('   • Verify database credentials in .env');
        console.error('   • Ensure user has CREATE DATABASE privilege');
        console.error('   • For Windows: Check MySQL is in PATH\n');
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run setup
setupDatabase();
