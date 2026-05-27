# Summary: API Rate Limiting Article

This article covers protecting APIs from abuse through rate limiting. Here's a breakdown:

## Key Concepts
Rate limiting prevents brute force attacks, DDoS, data scraping, and resource exhaustion by controlling request frequency per client.

## Strategies Covered

### 1. Token Bucket
Fairest approach; clients get tokens that refill at constant rates and consume 1 token per request. Includes TypeScript implementation.

### 2. Sliding Window Log
Tracks request timestamps within a time window. Simpler but memory-intensive.

### 3. Distributed (Redis)
Uses Redis sorted sets for multi-instance systems, tracks requests across your infrastructure.

### 4. Differentiated Limits
Different tiers (free/pro/enterprise) get different request quotas.

### 5. Cost-Based
Charges varying "costs" per operation (e.g., uploads cost more than reads).

## Practical Implementation
- Proper HTTP responses (429 status, `Retry-After` header, remaining quota headers)
- Client-side exponential backoff for retries
- Monitoring for attack patterns and anomalies
- Comprehensive checklist for production deployment

## Recommendation
Token bucket + Redis is the best default for most production APIs. The article emphasizes testing with real traffic, monitoring blocked requests, and adjusting limits based on actual usage patterns.
