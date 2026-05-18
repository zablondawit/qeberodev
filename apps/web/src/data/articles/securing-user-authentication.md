---
title: "Securing User Authentication: From Basics to Production"
description: "Build secure authentication systems that protect user accounts without sacrificing usability."
date: 2026-02-15T14:20:00Z
author:
  name: "Zablon Dawit"
tags:
  - security
  - authentication
  - backend
category: "engineering"
slug: "securing-user-authentication"
series: "Security Fundamentals"
weight: 1
layout: "post"
draft: false
toc: true
reading_time: 10
lang: en
---


## Introduction

Authentication is where security begins. Weak authentication means compromised user accounts. Compromised accounts mean stolen data, fraudulent transactions, and destroyed trust.

But security often conflicts with usability. Users hate complex passwords and multi-factor authentication. Your job is to find the balance: strong security that users actually adopt.

This article covers authentication patterns that work in production.

## Password Storage: The Foundation

Never store passwords in plain text. Never. Encrypt them with a one-way hash.

```typescript
// WRONG: Storing passwords in plain text
user.password = 'secretpassword123'; // Readable by attackers!

// WRONG: Using simple hash (MD5)
import crypto from 'crypto';
const hash = crypto.createHash('md5').update(password).digest('hex');
// Rainbow tables can reverse MD5 hashes

// RIGHT: Using bcrypt with salt
import bcrypt from 'bcrypt';

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12; // Higher = slower = more resistant to brute force
  return bcrypt.hash(password, saltRounds);
}

// Verify password on login
async function verifyPassword(inputPassword: string, storedHash: string): Promise<boolean> {
  return bcrypt.compare(inputPassword, storedHash);
}

// Usage
const user = {
  email: 'alice@example.com',
  passwordHash: await hashPassword('mysecurepassword') // Slow & salted
};

// Login
const correct = await verifyPassword(inputPassword, user.passwordHash);
```

Why bcrypt?
- **Salt:** Adds random data so same password produces different hashes
- **Slow:** Takes 100ms to verify (slows brute force attacks)
- **Adaptive:** `saltRounds` increases over time (future-proof)

Alternatives:
- **Argon2:** Even better than bcrypt (GPU-resistant)
- **PBKDF2:** Good, built into Node (slower than bcrypt)

## Session-Based Authentication

After login, create a session so user doesn't retype password on every request.

```typescript
import session from 'express-session';
import RedisStore from 'connect-redis';
import redis from 'redis';

const redisClient = redis.createClient();

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET, // Use strong secret!
  cookie: {
    secure: true,        // HTTPS only
    httpOnly: true,      // No JavaScript access (prevents XSS theft)
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Login endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  const user = await db.users.findByEmail(email);
  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Create session
  req.session.userId = user.id;
  req.session.email = user.email;
  
  res.json({ message: 'Logged in' });
});

// Protected route
app.get('/api/profile', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const user = db.users.findById(req.session.userId);
  res.json(user);
});

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    res.json({ message: 'Logged out' });
  });
});
```

Session security best practices:
- **Use HTTPS:** Prevents session cookie interception
- **httpOnly:** Blocks JavaScript from reading cookie (prevents XSS theft)
- **Secure flag:** Cookie sent only over HTTPS
- **SameSite:** Prevents CSRF attacks (cookie not sent in cross-site requests)

```typescript
cookie: {
  secure: true,
  httpOnly: true,
  sameSite: 'strict', // Don't send with cross-site requests
  maxAge: 24 * 60 * 60 * 1000
}
```

## JWT (JSON Web Tokens) for APIs

Sessions work with browsers. APIs need stateless authentication. Use JWTs.

```typescript
import jwt from 'jsonwebtoken';

// Login: issue token
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  const user = await db.users.findByEmail(email);
  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Create JWT
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  res.json({ token });
});

// Middleware: verify token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1]; // "Bearer TOKEN"
  
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    req.user = user;
    next();
  });
}

// Protected route
app.get('/api/profile', authenticateToken, (req, res) => {
  res.json({ userId: req.user.userId, email: req.user.email });
});
```

JWT vs Sessions:
- **Sessions:** Stateful (server stores session data), work with browsers
- **JWT:** Stateless (client sends token), work with APIs and mobile apps

## Multi-Factor Authentication (MFA)

For sensitive accounts, require a second factor:

```typescript
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// Step 1: User requests 2FA setup
app.post('/mfa/setup', authenticateToken, async (req, res) => {
  const secret = speakeasy.generateSecret({
    name: `YourApp (${req.user.email})`,
    issuer: 'YourApp'
  });
  
  // Generate QR code
  const qrCode = await QRCode.toDataURL(secret.otpauth_url);
  
  // Store secret temporarily (not verified yet)
  await redis.setex(
    `mfa:setup:${req.user.userId}`,
    600, // 10 minutes
    secret.base32
  );
  
  res.json({ qrCode, secret: secret.base32 });
});

// Step 2: User scans QR code in authenticator app, provides code
app.post('/mfa/verify', authenticateToken, async (req, res) => {
  const { code } = req.body;
  const secret = await redis.get(`mfa:setup:${req.user.userId}`);
  
  if (!secret) {
    return res.status(400).json({ error: 'Setup not found' });
  }
  
  // Verify the code matches secret
  const verified = speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: code,
    window: 2 // Allow time drift
  });
  
  if (!verified) {
    return res.status(401).json({ error: 'Invalid code' });
  }
  
  // Save secret (2FA is now enabled)
  await db.users.update(req.user.userId, {
    mfaSecret: secret,
    mfaEnabled: true
  });
  
  res.json({ message: '2FA enabled' });
});

// Login with 2FA
app.post('/login-mfa', async (req, res) => {
  const { email, password, mfaCode } = req.body;
  
  const user = await db.users.findByEmail(email);
  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Check 2FA if enabled
  if (user.mfaEnabled) {
    if (!mfaCode) {
      return res.status(401).json({ error: 'MFA code required' });
    }
    
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: mfaCode,
      window: 2
    });
    
    if (!verified) {
      return res.status(401).json({ error: 'Invalid MFA code' });
    }
  }
  
  // All checks passed
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  res.json({ token });
});
```

## Rate Limiting on Login

Prevent brute force attacks by limiting login attempts:

```typescript
// Track failed login attempts per IP
const failedAttempts = new Map<string, { count: number; resetAt: number }>();

app.post('/login', async (req, res) => {
  const clientIp = req.ip;
  const now = Date.now();
  
  // Check if IP is rate limited
  const attempts = failedAttempts.get(clientIp) || { count: 0, resetAt: now + 900000 };
  
  if (now < attempts.resetAt && attempts.count >= 5) {
    return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
  }
  
  // Reset counter if time window passed
  if (now >= attempts.resetAt) {
    failedAttempts.delete(clientIp);
  }
  
  // Verify credentials
  const { email, password } = req.body;
  const user = await db.users.findByEmail(email);
  
  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    // Increment failed attempts
    attempts.count++;
    failedAttempts.set(clientIp, attempts);
    
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Success: clear attempts
  failedAttempts.delete(clientIp);
  
  // Issue token
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
  res.json({ token });
});
```

Or use Redis for distributed rate limiting:

```typescript
async function checkLoginAttempts(email: string): Promise<boolean> {
  const key = `login:${email}`;
  const attempts = await redis.incr(key);
  
  if (attempts === 1) {
    await redis.expire(key, 900); // 15 minutes
  }
  
  return attempts <= 5;
}
```

## Logout Security

Invalidate tokens properly:

```typescript
// JWT: Can't revoke directly (they're stateless)
// Solution: Maintain a blacklist in Redis

app.post('/logout', authenticateToken, async (req, res) => {
  const token = req.headers['authorization'].split(' ')[1];
  const decoded = jwt.decode(token);
  
  // Add to blacklist until token expires
  const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
  await redis.setex(`blacklist:${token}`, expiresIn, '1');
  
  res.json({ message: 'Logged out' });
});

// Middleware: check blacklist
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }
  
  // Check if blacklisted
  const isBlacklisted = await redis.get(`blacklist:${token}`);
  if (isBlacklisted) {
    return res.status(401).json({ error: 'Token expired' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}
```

## Security Checklist

- [ ] Hash passwords with bcrypt/Argon2 (never plain text)
- [ ] Use HTTPS for all auth endpoints
- [ ] Set httpOnly + Secure + SameSite on cookies
- [ ] Implement rate limiting on login (5 attempts per 15 min)
- [ ] Use strong JWT secrets (32+ bytes random)
- [ ] Implement session timeout (24 hours for sessions, 15 min for JWTs)
- [ ] Require MFA for admin accounts
- [ ] Log authentication events
- [ ] Monitor for suspicious patterns (failed logins, impossible travel)
- [ ] Use environment variables for secrets (never hardcode)
- [ ] Implement CSRF protection (SameSite cookies)
- [ ] Reset sessions on sensitive changes (password, email, 2FA)

## Conclusion

Authentication is complex but critical. Hash passwords strongly. Choose between sessions (browsers) and JWTs (APIs). Implement 2FA for sensitive accounts. Rate-limit login attempts.

Security is a journey, not a destination. Review auth code regularly. Monitor for breaches. Update as threats evolve.

User trust is your most valuable asset. Protect it relentlessly.
