---
title: "API Rate Limiting: Protecting Your Backend from Abuse"
description: "Implement rate limiting strategies to prevent abuse, manage capacity, and ensure fair access."
date: 2026-01-05T09:30:00Z
author:
  name: "Zablon Dawit"
tags:
  - api
  - rate-limiting
  - security
category: "engineering"
slug: "api-rate-limiting"
series: "API Security"
weight: 2
layout: "post"
draft: false
toc: true
reading_time: 7
lang: en
---

## Introduction

An unprotected API is like a restaurant with no reservation system. One large group books all tables. Other customers can't get in. Your business suffers.

Rate limiting enforces fair access. It protects against:
- **Brute force attacks:** Automated credential guessing
- **Denial of service:** Overwhelming your servers with requests
- **Scraping:** Bulk data extraction
- **Resource exhaustion:** Expensive operations called too frequently

Without rate limiting, a single malicious actor can bring down your entire platform.

## Rate Limiting Strategies

### Token Bucket Algorithm

The token bucket algorithm is simple and fair. Each client gets a bucket. Tokens refill at a constant rate. Requests consume tokens.

```
Bucket capacity: 100 tokens
Refill rate: 10 tokens per minute

Client makes 3 requests:
[100 tokens] → [97 tokens] → [94 tokens] → [91 tokens]

Client waits 1 minute:
[91 tokens] → [101 tokens] (capped at 100)
```

Advantages:
- **Fairness:** All clients get equal allocations
- **Burst handling:** Allows temporary spikes
- **Simplicity:** Easy to implement

```typescript
class TokenBucket {
  private tokens: number;
  private lastRefill: number = Date.now();

  constructor(
    private capacity: number,
    private refillRate: number // tokens per second
  ) {
    this.tokens = capacity;
  }

  refillBucket() {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  consume(count: number = 1): boolean {
    this.refillBucket();
    
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    return false;
  }
}

// Middleware
app.use((req, res, next) => {
  const clientId = req.ip;
  const bucket = getBucketForClient(clientId);
  
  if (bucket.consume(1)) {
    next();
  } else {
    res.status(429).json({ error: 'Rate limit exceeded' });
  }
});
```

### Sliding Window Log

Keep a log of request timestamps. Reject if too many recent requests.

```typescript
class SlidingWindowLog {
  private log: Map<string, number[]> = new Map();

  constructor(private maxRequests: number, private windowMs: number) {}

  allowRequest(clientId: string): boolean {
    const now = Date.now();
    const timestamps = this.log.get(clientId) || [];

    // Remove old timestamps outside window
    const validTimestamps = timestamps.filter(
      ts => now - ts < this.windowMs
    );

    if (validTimestamps.length < this.maxRequests) {
      validTimestamps.push(now);
      this.log.set(clientId, validTimestamps);
      return true;
    }
    return false;
  }
}

// Usage: 100 requests per 60 seconds
const limiter = new SlidingWindowLog(100, 60000);
```

Disadvantages:
- **Memory overhead:** Stores all request timestamps
- **Doesn't handle bursts:** Request 1ms apart count as separate

## Distributed Rate Limiting

In microservices, rate limits must be shared across instances.

### Redis-Backed Rate Limiter

```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6379
});

async function checkRateLimit(
  clientId: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `ratelimit:${clientId}`;
  const now = Date.now() / 1000;
  const windowStart = now - windowSeconds;

  // Use Redis sorted set to track request timestamps
  const pipeline = redis.pipeline();
  
  // Remove old requests outside window
  pipeline.zremrangebyscore(key, '-inf', windowStart);
  
  // Count requests in window
  pipeline.zcard(key);
  
  // Add current request
  pipeline.zadd(key, now, `${now}-${Math.random()}`);
  
  // Expire key after window
  pipeline.expire(key, windowSeconds);
  
  const results = await pipeline.exec();
  const count = results[1][1]; // Result from zcard

  return {
    allowed: count < limit,
    remaining: Math.max(0, limit - count - 1)
  };
}

// Middleware
app.use(async (req, res, next) => {
  const { allowed, remaining } = await checkRateLimit(
    req.ip,
    100,   // 100 requests
    60     // per 60 seconds
  );

  res.set('X-RateLimit-Limit', '100');
  res.set('X-RateLimit-Remaining', String(remaining));

  if (!allowed) {
    res.status(429).json({ error: 'Rate limit exceeded' });
    return;
  }
  
  next();
});
```

## Differentiated Rate Limits

Different clients deserve different limits.

```typescript
// Tier 1: Free tier (100 requests/hour)
// Tier 2: Pro tier (10,000 requests/hour)
// Tier 3: Enterprise (unlimited)

function getRateLimit(user: User) {
  const baseLimit = 100;
  
  switch (user.tier) {
    case 'free':
      return { requests: baseLimit, windowSeconds: 3600 };
    case 'pro':
      return { requests: baseLimit * 100, windowSeconds: 3600 };
    case 'enterprise':
      return { requests: Infinity, windowSeconds: 3600 };
    default:
      return { requests: 10, windowSeconds: 60 }; // Unauthenticated
  }
}

app.use(async (req, res, next) => {
  const user = req.user;
  const { requests, windowSeconds } = getRateLimit(user);
  
  const { allowed, remaining } = await checkRateLimit(
    user.id,
    requests,
    windowSeconds
  );

  if (!allowed) {
    res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: windowSeconds
    });
    return;
  }
  
  next();
});
```

## Cost-Based Rate Limiting

Some operations are more expensive. Charge differently.

```typescript
// Simple endpoints: 1 cost
// Complex queries: 10 cost
// File uploads: 50 cost
// Total daily budget: 10,000 cost

const operationCost = {
  'GET /users': 1,
  'GET /search': 5,
  'POST /upload': 50,
  'POST /export': 100
};

async function checkCostLimit(
  userId: string,
  cost: number,
  dailyBudget: number = 10000
): Promise<boolean> {
  const key = `cost:${userId}:${getTodayDate()}`;
  const current = await redis.incrby(key, cost);
  
  if (!current) {
    await redis.expire(key, 86400); // 24 hours
  }

  return current <= dailyBudget;
}

app.use(async (req, res, next) => {
  const cost = operationCost[`${req.method} ${req.path}`] || 1;
  
  if (!await checkCostLimit(req.user.id, cost)) {
    res.status(429).json({
      error: 'Daily budget exceeded',
      retryAfter: 'tomorrow'
    });
    return;
  }
  
  next();
});
```

## Handling Rate Limit Gracefully

When clients hit the limit, help them recover:

```typescript
const TooManyRequestsError = {
  statusCode: 429,
  headers: {
    'Retry-After': '60', // Seconds to wait
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': '0',
    'X-RateLimit-Reset': '1609459200' // Unix timestamp
  },
  body: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again after 60 seconds.',
    retryAfter: 60,
    documentation: 'https://api.example.com/docs/rate-limiting'
  }
};
```

Client-side exponential backoff:

```typescript
async function fetchWithRetry(url, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (error.status === 429) {
        const retryAfter = error.headers.get('Retry-After') || (60 * attempt);
        console.log(`Rate limited. Waiting ${retryAfter}s...`);
        await new Promise(r => setTimeout(r, retryAfter * 1000));
        continue;
      }
      throw error;
    }
  }
}
```

## Monitoring Rate Limits

Track limits to catch abuse patterns:

```typescript
// Metrics to monitor
const metrics = {
  totalRequests: 0,
  rateLimitedRequests: 0,
  uniqueBlockedClients: new Set(),
  peakRequestsPerSecond: 0
};

// Alert if:
// - More than 5% of requests are rate limited (potential attack)
// - Single client exceeds 10 rate limit errors in 1 minute
// - Total requests spike 200% over baseline

setInterval(() => {
  const blockRate = metrics.rateLimitedRequests / metrics.totalRequests;
  if (blockRate > 0.05) {
    alert('High rate limiting activity detected');
  }
}, 60000);
```

## Rate Limiting Checklist

- [ ] Choose appropriate algorithm (token bucket for most cases)
- [ ] Set realistic limits (test with real traffic patterns)
- [ ] Differentiate tiers (free vs. paid)
- [ ] Use cost-based limits for expensive operations
- [ ] Store state in Redis (distributed)
- [ ] Return proper HTTP headers (Retry-After, remaining)
- [ ] Monitor blocked requests (detect attacks)
- [ ] Document limits (for API users)
- [ ] Whitelist internal services (don't rate limit yourself)
- [ ] Test with load testing tools

## Conclusion

Rate limiting isn't optional for production APIs. Token bucket algorithm is simple and effective. Redis makes it distributed. Tiered limits reward paying customers.

Implement early. Monitor continuously. Adjust limits based on actual usage patterns.

This protects your platform from abuse and ensures fair access for all users.
