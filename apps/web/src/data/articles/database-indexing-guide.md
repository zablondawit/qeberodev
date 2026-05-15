---
title: "Database Indexing: The Hidden Performance Multiplier"
description: "How to design indexes that transform slow queries into lightning-fast lookups."
date: 2025-12-18T11:00:00Z
author:
  name: "Zablon Dawit"
tags:
  - database
  - performance
  - sql
category: "engineering"
slug: "database-indexing-guide"
series: "Database Optimization"
weight: 1
layout: "post"
draft: false
toc: true
reading_time: 9
lang: en
---

# Database Indexing: The Hidden Performance Multiplier

## Introduction

A production database without proper indexes is like a library without a card catalog. Users sit at shelves scanning every book to find the one they need. Query times explode. CPU maxes out. Your app grinds to a halt.

Indexes transform database performance. A well-placed index can take a query from 10 seconds to 10 milliseconds. But bad indexes waste storage, slow down writes, and confuse query planners.

This article covers index design patterns that balance read performance with write efficiency.

## B-Tree Indexes: The Default Choice

Most databases use B-Tree indexes by default. They maintain sorted order and enable efficient range queries.

```sql
-- Create a basic index
CREATE INDEX idx_users_email ON users(email);

-- Query planner uses index
SELECT * FROM users WHERE email = 'alice@example.com'; -- Fast!
```

B-Tree indexes excel at:
- **Equality lookups:** WHERE email = 'alice@example.com'
- **Range queries:** WHERE age BETWEEN 18 AND 65
- **Sorting:** ORDER BY created_at (can use index instead of sorting)
- **Prefix matching:** WHERE name LIKE 'Alice%'

## Composite Indexes: The Performance Hack

A single column index helps one query. Composite indexes help multiple queries.

```sql
-- Bad: Three separate indexes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);

-- Good: One composite index (order matters!)
CREATE INDEX idx_orders_lookup ON orders(user_id, status, created_at);
```

The order of columns in a composite index matters. Use the **ESR rule**:

1. **Equality** columns first (WHERE user_id = ?)
2. **Sort** columns second (ORDER BY created_at)
3. **Range** columns last (WHERE status IN (...))

```sql
-- Efficient queries for idx_orders_lookup(user_id, status, created_at)
SELECT * FROM orders 
WHERE user_id = 5 AND status = 'completed' 
ORDER BY created_at DESC;

-- Good: User_id filters, status filters, created_at sorts
-- Index satisfies all three conditions in one lookup!

-- Bad query structure (still works, less efficient)
SELECT * FROM orders 
WHERE created_at > '2024-01-01' 
ORDER BY user_id;
-- Index can't help with range on first column
```

## Partial Indexes: Indexing What Matters

You don't always need to index everything. Partial indexes index only matching rows.

```sql
-- Bad: Index all orders (most are archived)
CREATE INDEX idx_orders_status ON orders(status);

-- Good: Index only active orders
CREATE INDEX idx_orders_active ON orders(status) 
WHERE status IN ('pending', 'processing', 'shipped');
```

This index is smaller (faster), uses less storage, and updates are faster (fewer rows to maintain).

Use cases:
- Active/draft records only
- Recent data only
- Non-null values only

```sql
-- Only index non-deleted rows (soft deletes)
CREATE INDEX idx_users_active ON users(email) 
WHERE deleted_at IS NULL;

-- Only index recent orders (archive old ones)
CREATE INDEX idx_orders_recent ON orders(user_id) 
WHERE created_at > NOW() - INTERVAL '1 year';
```

## COVERING Indexes: The Ultimate Query Speed

A covering index includes all columns needed for a query. The database never touches the main table.

```sql
-- Query needs: user_id, status, amount, created_at
SELECT user_id, status, amount, created_at 
FROM orders 
WHERE user_id = 5;

-- Regular index: finds matching row, fetches from main table (2 steps)
CREATE INDEX idx_orders_user ON orders(user_id);

-- Covering index: has all data in index, no table access (1 step)
CREATE INDEX idx_orders_user_covering ON orders(user_id) 
INCLUDE (status, amount, created_at);
```

Covering indexes eliminate table lookups for the covered columns. The database reads only the index.

Trade-off: Larger index, slower writes. Use only for frequently accessed queries.

## Index Design: Real-World Example

Let's index a production e-commerce database:

```sql
-- Users table
CREATE INDEX idx_users_email ON users(email);
-- Query: SELECT * FROM users WHERE email = ?

CREATE INDEX idx_users_signup ON users(created_at DESC) 
WHERE deleted_at IS NULL;
-- Query: Show recent signups (admin dashboard)

-- Orders table (high volume!)
CREATE INDEX idx_orders_user_status ON orders(user_id, status, created_at) 
WHERE cancelled_at IS NULL;
-- Query: SELECT * FROM orders WHERE user_id = 5 AND status = 'pending'

CREATE INDEX idx_orders_by_date ON orders(created_at) 
INCLUDE (user_id, total_amount);
-- Query: Analytics: sum(total_amount) grouped by day

-- Products table
CREATE INDEX idx_products_sku ON products(sku) UNIQUE;
-- SKU must be unique for lookup

CREATE INDEX idx_products_search ON products(category, price, popularity);
-- Query: Find products WHERE category = 'books' ORDER BY popularity

-- Review table (time-series)
CREATE INDEX idx_reviews_recent ON reviews(product_id, created_at DESC) 
WHERE verified = true;
-- Query: Show verified reviews for product, sorted by newest
```

## Index Anti-Patterns to Avoid

**Anti-Pattern 1: Indexing Low-Cardinality Columns**

```sql
-- BAD: Only 2 values (true/false)
CREATE INDEX idx_users_active ON users(is_active);
-- Table scan might be faster than index lookup!

-- GOOD: Partial index on common value
CREATE INDEX idx_users_inactive ON users(id) 
WHERE is_active = false;
-- Only 10% of table needs indexing
```

**Anti-Pattern 2: Too Many Indexes**

```sql
-- BAD: One index per column
CREATE INDEX idx_users_id ON users(id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_name ON users(name);
-- Each insert/update pays cost of maintaining all indexes
-- Query planner gets confused choosing between them

-- GOOD: Fewer, smarter indexes
CREATE INDEX idx_users_email ON users(email);
-- Name search can use full-text index if needed
CREATE INDEX idx_users_name_ft ON users USING GIN (to_tsvector('english', name));
```

**Anti-Pattern 3: Unused Indexes**

```sql
-- Identify unused indexes in PostgreSQL
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY idx_blks_read DESC;

-- Drop unused indexes
DROP INDEX idx_orders_unused;
```

## Monitoring Index Health

Track index performance to catch regressions:

```sql
-- PostgreSQL: Find slow queries
SELECT query, calls, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Find missing indexes (suggested by query planner)
SELECT schemaname, tablename, attname 
FROM pg_stat_user_tables 
WHERE seq_scan > 1000 AND idx_scan = 0;
-- High sequential scans = missing index?

-- Monitor index size
SELECT schemaname, tablename, indexname, 
       pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;
```

Set up alerts:
- Alert if full table scans spike (index broken?)
- Alert if query latency increases (index removed?)
- Track index fragmentation (periodic rebuilds needed)

## Index Maintenance

Indexes degrade over time. Maintain them:

```sql
-- PostgreSQL: Rebuild fragmented indexes
REINDEX INDEX idx_orders_user;

-- Or rebuild entire table's indexes
REINDEX TABLE orders;

-- Analyze table statistics (helps query planner)
ANALYZE orders;

-- Vacuum removes dead rows (after deletes/updates)
VACUUM orders;
```

Schedule maintenance during low-traffic windows:

```sql
-- Daily maintenance job
0 2 * * * reindexdb --all && vacuumdb --all
```

## Index Checklists

**Before Indexing:**
- [ ] Identify slow queries (use query logs)
- [ ] Estimate table size and growth
- [ ] Check query frequency (worth the index cost?)
- [ ] Analyze query plan (WHERE predicates, JOIN conditions)

**After Indexing:**
- [ ] Verify query plan uses index (EXPLAIN ANALYZE)
- [ ] Monitor write performance (inserts slower?)
- [ ] Check storage growth (index size acceptable?)
- [ ] Remove duplicate indexes

**Quarterly Maintenance:**
- [ ] Identify unused indexes (DROP them)
- [ ] Check for fragmentation (REINDEX if needed)
- [ ] Review slow query logs for new patterns
- [ ] Update table statistics (ANALYZE)

## Conclusion

Indexes are the difference between production systems and slow systems. B-Tree indexes for equality and range. Composite indexes for multiple predicates. Partial indexes to reduce size. Covering indexes to eliminate table lookups.

Design indexes based on actual query patterns, not guesses. Monitor performance. Maintain regularly.

Index discipline pays dividends in user experience and infrastructure costs.
