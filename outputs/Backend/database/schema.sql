-- EMI Calculator Database Schema
-- Run this file to create the database and tables

-- Create Database
CREATE DATABASE IF NOT EXISTS emi_calculator;
USE emi_calculator;

-- Users Table
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

-- User Sessions Table (for token management)
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

-- User Calculations History (Optional - for future dashboard)
CREATE TABLE IF NOT EXISTS calculations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    loan_amount DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    tenure_months INT NOT NULL,
    monthly_emi DECIMAL(15, 2) NOT NULL,
    total_interest DECIMAL(15, 2) NOT NULL,
    calculation_type VARCHAR(50), -- 'calculator' or 'eligibility'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created (created_at)
);

-- Create Application User (for local development)
-- ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_password';

-- Grant Privileges to Application User
-- CREATE USER 'emi_user'@'localhost' IDENTIFIED BY 'secure_password_123';
-- GRANT ALL PRIVILEGES ON emi_calculator.* TO 'emi_user'@'localhost';
-- FLUSH PRIVILEGES;

-- Sample Data (for testing)
-- INSERT INTO users (full_name, email, phone_number, password_hash) VALUES
-- ('John Doe', 'john@example.com', '9876543210', '$2a$10$...hashed_password...');
