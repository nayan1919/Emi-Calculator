# EMI Calculator Backend API

Complete Node.js + Express backend for EMI Calculator with MySQL authentication.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 14+
- MySQL 5.7+
- npm or yarn

### Installation

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create .env file**
   ```bash
   cp .env.example .env
   ```

4. **Update .env with your credentials**
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=emi_calculator
   JWT_SECRET=your_super_secret_key
   FRONTEND_URL=http://localhost:8000
   ```

5. **Initialize database**
   ```bash
   node setup-db.js
   ```

6. **Start the server**
   ```bash
   # Development (with auto-reload)
   npm run dev

   # Production
   npm start
   ```

Server will run at `http://localhost:5000`

---

## 📋 API Endpoints

### Health Check
```http
GET /health
```
**Response**: Server status and uptime

---

### Sign Up
```http
POST /api/auth/signup
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "9876543210",
  "password": "SecurePass@123"
}
```

**Success Response (201)**:
```json
{
  "status": "success",
  "message": "Account created successfully",
  "userId": 1,
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "fullName": "John Doe",
    "email": "john@example.com"
  },
  "redirect": "/calculator.html"
}
```

**Error Response (400)**:
```json
{
  "status": "error",
  "message": "Name must be at least 3 characters",
  "field": "fullName"
}
```

**Validation Rules**:
- **Full Name**: 3+ chars, letters only, no numbers
- **Email**: Valid RFC 5322 format
- **Phone**: 10-digit Indian number
- **Password**: 8+ chars, uppercase, number, special char

---

### Sign In
```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass@123"
}
```

**Success Response (200)**:
```json
{
  "status": "success",
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "fullName": "John Doe",
    "email": "john@example.com"
  },
  "redirect": "/calculator.html"
}
```

**Error Response (401)**:
```json
{
  "status": "error",
  "message": "Invalid email or password"
}
```

---

### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "status": "success",
  "message": "Logged out successfully",
  "redirect": "/login.html"
}
```

---

## 🔐 Security Features

### ✅ Implemented
- **Password Hashing**: bcryptjs (10 salt rounds)
- **JWT Tokens**: 7-day expiration
- **Rate Limiting**: 5 login attempts/15 min, 5 signup attempts/hour
- **Input Validation**: express-validator
- **SQL Injection Protection**: Prepared statements (mysql2/promise)
- **XSS Prevention**: Input sanitization
- **CORS**: Configured origin whitelist
- **Helmet**: Security headers
- **HTTPS-Ready**: Recommended for production

### ⚠️ Additional Steps for Production
1. Use HTTPS/SSL certificates
2. Move JWT_SECRET to environment
3. Implement CSRF tokens
4. Add request logging (Morgan)
5. Database connection pooling (already done)
6. API key authentication for sensitive endpoints
7. Two-factor authentication (2FA)
8. Email verification on signup

---

## 📦 Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Calculations Table (Optional)
```sql
CREATE TABLE calculations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    loan_amount DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    tenure_months INT NOT NULL,
    monthly_emi DECIMAL(15, 2) NOT NULL,
    total_interest DECIMAL(15, 2) NOT NULL,
    calculation_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 🛠️ Project Structure

```
backend/
├── server.js              # Main Express app
├── setup-db.js            # Database initialization
├── package.json           # Dependencies
├── .env.example           # Environment template
├── config/
│   └── database.js        # MySQL connection pool
├── routes/
│   └── auth.js            # Authentication routes
├── middleware/
│   └── errorHandler.js    # Error handling
├── utils/
│   └── validators.js      # Input validation
└── database/
    └── schema.sql         # Database schema
```

---

## 🧪 Testing the API

### Using cURL

**Sign Up**:
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "9876543210",
    "password": "SecurePass@123"
  }'
```

**Sign In**:
```bash
curl -X POST http://localhost:5000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass@123"
  }'
```

### Using Postman
1. Create POST request to `http://localhost:5000/api/auth/signup`
2. Set Content-Type: application/json
3. Paste JSON body
4. Click Send

---

## 🐛 Troubleshooting

### "Database connection failed"
```
✓ Ensure MySQL is running
✓ Check credentials in .env
✓ Verify database exists: node setup-db.js
✓ Test connection: mysql -u root -p
```

### "Email already registered"
- This email is already in the database
- Use a different email or reset database

### "Rate limit exceeded"
- Too many login/signup attempts
- Wait 15 minutes for login, 1 hour for signup

### "Invalid JWT"
- Token expired or malformed
- Have user sign in again

### "CORS Error"
- Frontend URL not in CORS whitelist
- Update FRONTEND_URL in .env

---

## 📈 Scaling for Production

### Performance Improvements
1. Add Redis for session caching
2. Implement database query caching
3. Use connection pooling (already done)
4. Add CDN for static assets
5. Implement API pagination

### Monitoring
1. Add logging (Winston, Morgan)
2. Error tracking (Sentry)
3. Performance monitoring (New Relic)
4. Database monitoring

### Database Optimization
1. Add indexes (already done for email, phone)
2. Archive old sessions
3. Implement database backups
4. Regular optimization queries

---

## 📝 Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 5000 | Server port |
| NODE_ENV | development | Environment |
| DB_HOST | localhost | Database host |
| DB_PORT | 3306 | Database port |
| DB_USER | root | Database user |
| DB_PASSWORD | | Database password |
| DB_NAME | emi_calculator | Database name |
| JWT_SECRET | your_secret | JWT signing key |
| JWT_EXPIRE | 7d | Token expiration |
| FRONTEND_URL | http://localhost:8000 | CORS origin |

---

## 🔗 Connecting Frontend to Backend

In `js/login.js`, the API calls are already set up:

```javascript
fetch('/api/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
})
```

If running frontend and backend on different ports, update the fetch URLs:

```javascript
fetch('http://localhost:5000/api/auth/signin', { ... })
```

---

## 📚 Dependencies

| Package | Purpose |
|---------|---------|
| express | Web framework |
| express-cors | CORS middleware |
| mysql2 | MySQL database driver |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT authentication |
| express-validator | Input validation |
| helmet | Security headers |
| express-rate-limit | Rate limiting |
| dotenv | Environment variables |
| nodemon | Development auto-reload |

---

## 🚀 Next Features

- [ ] Email verification on signup
- [ ] Password reset via email
- [ ] User profile page
- [ ] Save calculations history
- [ ] Share calculations
- [ ] Admin dashboard
- [ ] Google/Facebook OAuth
- [ ] Two-factor authentication

---

## 📞 Support

For issues or questions:
- Email: duttanayan1919@gmail.com
- Phone: +91 69008 83337

---

**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Last Updated**: July 2026
