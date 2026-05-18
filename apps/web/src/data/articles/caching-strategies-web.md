---
title: "Caching Strategies for Web Applications"
description: "Implement multi-layer caching to reduce load times and database queries."
date: 2026-02-02T10:45:00Z
author:
  name: "Zablon Dawit"
tags:
  - caching
  - performance
  - architecture
category: "engineering"
slug: "caching-strategies-web"
series: "Performance Optimization"
weight: 1
layout: "post"
draft: false
toc: true
reading_time: 8
lang: en
---

# Caching Strategies for Web Applications

## Introduction

The fastest code is code that doesn't run. The fastest database query is the one you don't make. Caching is the art of serving previously computed results instead of recomputing them.

Without caching, every request recalculates. Every query hits the database. Your servers burn CPU. Database connections exhaust. Users wait seconds for simple pages.

With caching, you serve results from memory. Database load drops 100x. Pages load in milliseconds. Happy users.

This article covers caching strategies at every layer of your application.

## Cache Layers

Effective caching uses multiple layers:

```
User's Browser (HTTP Cache)
        ↓
CDN (static files)
        ↓
API Response Cache (Redis)
        ↓
Database Query Cache (Redis)
        ↓
In-Process Cache (Node)
        ↓
Database (source of truth)
```

Each layer serves different data and has different invalidation strategies.

## Layer 1: Browser Caching

Tell browsers to cache static assets for months.

```typescript
app.use(express.static('public', {
  maxAge: '365d' // Cache for 1 year
}));

// Manual control with headers
app.get('/logo.png', (req, res) => {
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.sendFile('./logo.png');
});

// Dynamic content: revalidate frequently
app.get('/api/user-profile', (req, res) => {
  res.set('Cache-Control', 'private, max-age=300'); // 5 minutes
  res.json(getUserData());
});

// Never cache
app.get('/api/payment-status', (req, res) => {
  res.set('Cache-Control', 'no-store'); // Always fetch fresh
  res.json(getPaymentStatus());
});
```

Cache-Control directives:
- `max-age=300` - Reuse for 5 minutes without checking
- `stale-while-revalidate=3600` - Use stale copy for 1 hour, revalidate in background
- `no-store` - Never cache
- `public` - Cache everywhere (CDN, proxies, browsers)
- `private` - Cache only in browser

## Layer 2: CDN Caching

For static assets, let CDN distribute from edge locations:

```typescript
// Serve static files through CDN
const cdnUrl = 'https://cdn.example.com';

// In HTML
<img src="${cdnUrl}/images/hero.jpg" />
<script src="${cdnUrl}/app.js"></script>

// Give files cache-breaking names (content hash)
// app.1a2b3c.js (changes when content changes)
```

CDN caches responses at edge servers worldwide. Users download from nearby, not your origin.

## Layer 3: Response Caching

Cache entire API responses:

```typescript
import Redis from 'ioredis';

const redis = new Redis();

// Cache decorator
function cached(key: string, ttlSeconds: number = 300) {
  return async (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
      // Check cache
      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
      
      // Call original
      const result = await originalMethod.apply(this, args);
      
      // Cache result
      await redis.setex(key, ttlSeconds, JSON.stringify(result));
      
      return result;
    };
    
    return descriptor;
  };
}

// Usage
class UserService {
  @cached('user:profile:123', 300)
  async getUserProfile(userId: number) {
    // Expensive database query
    return await db.users.findById(userId);
  }
}

// Invalidate when user updates
async function updateUser(userId: number, data: any) {
  await db.users.update(userId, data);
  await redis.del(`user:profile:${userId}`); // Invalidate cache
}
```

## Layer 4: Query Result Caching

Cache database query results:

```typescript
class UserRepository {
  async getUsersInRegion(region: string, limit: number = 100) {
    const cacheKey = `users:region:${region}:${limit}`;
    
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Query database
    const users = await db.query(
      `SELECT * FROM users WHERE region = ? LIMIT ?`,
      [region, limit]
    );
    
    // Cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(users));
    
    return users;
  }
}
```

Cache strategies:
- **Write-through:** Update cache immediately on write (immediate consistency)
- **Write-behind:** Write to DB, update cache async (fast writes, eventual consistency)
- **Invalidation:** Delete cache on update (simple but causes cache misses)

```typescript
// Write-through: Always consistent
async function updateUser(userId: number, data: any) {
  await db.users.update(userId, data);
  const user = await db.users.findById(userId); // Refresh
  await redis.set(`user:${userId}`, JSON.stringify(user));
}

// Write-behind: Fast writes, eventual consistency
async function updateUser(userId: number, data: any) {
  await db.users.update(userId, data); // Fast
  // Invalidate cache - next read will refresh
  await redis.del(`user:${userId}`);
}
```

## Layer 5: In-Process Caching

Cache in Node process memory for lightning-fast lookups:

```typescript
class CacheService {
  private cache = new Map<string, { value: any; expiresAt: number }>();

  set(key: string, value: any, ttlMs: number = 60000) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  get(key: string): any {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key); // Expired
      return null;
    }
    
    return cached.value;
  }

  // Use LRU cache for memory limits
  // npm install lru-cache
}

// Usage
const cache = new CacheService();

app.get('/api/feature-flags', (req, res) => {
  let flags = cache.get('feature-flags');
  
  if (!flags) {
    flags = db.getFeatureFlags();
    cache.set('feature-flags', flags, 60000); // Cache 1 minute
  }
  
  res.json(flags);
});
```

Trade-off: In-process cache is per-instance (doesn't sync across servers).

## Cache Invalidation Patterns

Invalidation is hard. Choose the right pattern:

**Pattern 1: Time-Based (Simplest)**

```typescript
// Cache everything for 5 minutes
// After 5 min, revalidate from source
app.get('/api/products', (req, res) => {
  res.set('Cache-Control', 'max-age=300');
  res.json(getProducts());
});
```

Pro: Simple
Con: Stale data up to 5 minutes

**Pattern 2: Event-Based (Most Accurate)**

```typescript
// Cache invalidates on specific events
async function createProduct(data: any) {
  const product = await db.products.create(data);
  
  // Invalidate related caches
  await redis.del('products:all');
  await redis.del('products:featured');
  
  return product;
}
```

Pro: Always fresh
Con: Requires code changes everywhere

**Pattern 3: Hybrid (Recommended)**

```typescript
// Combine time + events
async function getProduct(id: number) {
  const cacheKey = `product:${id}`;
  let product = await redis.get(cacheKey);
  
  if (!product) {
    product = await db.products.findById(id);
    // Cache for 1 hour OR until invalidated
    await redis.setex(cacheKey, 3600, JSON.stringify(product));
  }
  
  return product;
}

// Invalidate on update
async function updateProduct(id: number, data: any) {
  await db.products.update(id, data);
  await redis.del(`product:${id}`); // Immediate
  // Next read will re-cache for 1 hour
}
```

## Cache Warming

Pre-populate caches to avoid cold starts:

```typescript
// On application startup
async function warmCache() {
  const products = await db.products.findAll({ limit: 1000 });
  
  for (const product of products) {
    await redis.setex(
      `product:${product.id}`,
      3600,
      JSON.stringify(product)
    );
  }
  
  console.log('Cache warmed with 1000 products');
}

// Run on startup
app.listen(3000, async () => {
  await warmCache();
});
```

## Cache Stampede Prevention

When popular cache entry expires, many requests might hit database simultaneously.

```typescript
// Problem: 1000 users access same page simultaneously
// Cache expires → 1000 database queries = database overwhelmed

// Solution: Use locks
async function getWithLock(key: string, computeFn: () => Promise<any>, ttlMs: number) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  const lockKey = `lock:${key}`;
  
  // Try to acquire lock
  const acquired = await redis.set(lockKey, '1', 'NX', 'EX', 5);
  
  if (acquired) {
    // We got the lock, compute value
    const value = await computeFn();
    await redis.setex(key, ttlMs, JSON.stringify(value));
    await redis.del(lockKey);
    return value;
  } else {
    // Someone else computing, wait and retry
    await new Promise(r => setTimeout(r, 100));
    return getWithLock(key, computeFn, ttlMs);
  }
}
```

## Monitoring Cache Performance

Track cache effectiveness:

```typescript
const cacheMetrics = {
  hits: 0,
  misses: 0,
  
  recordHit() { this.hits++; },
  recordMiss() { this.misses++; },
  
  getHitRate() {
    return this.hits / (this.hits + this.misses);
  }
};

// Middleware
app.use((req, res, next) => {
  const original = redis.get.bind(redis);
  redis.get = async (key) => {
    const value = await original(key);
    if (value) {
      cacheMetrics.recordHit();
    } else {
      cacheMetrics.recordMiss();
    }
    return value;
  };
  next();
});

// Alert on poor hit rate
setInterval(() => {
  const hitRate = cacheMetrics.getHitRate();
  if (hitRate < 0.5) { // Less than 50%
    alert('Cache hit rate low: ' + hitRate);
  }
}, 60000);
```

## Caching Checklist

- [ ] Identify expensive operations (database queries, external API calls)
- [ ] Choose cache layer (in-process, Redis, CDN)
- [ ] Set appropriate TTLs (time-to-live)
- [ ] Implement invalidation (time-based, event-based)
- [ ] Monitor hit rates (aim for >80%)
- [ ] Prevent cache stampede (use locks)
- [ ] Set cache limits (don't let Redis consume all RAM)
- [ ] Test cache behavior (with cache and without)

## Conclusion

Caching is essential for performance. Multi-layer caching serves users at every layer.

Browser cache for static assets. Response cache for API results. Database cache for queries. In-process cache for feature flags.

Choose invalidation wisely: time-based is simple, event-based is accurate, hybrid works best.

Monitor cache performance. When hit rates drop, investigate. Caching is only useful if it actually hits.
