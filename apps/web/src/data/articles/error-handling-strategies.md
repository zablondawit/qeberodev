---
title: "Error Handling Strategies in Production Systems"
description: "Building resilient systems that gracefully handle failures and inform users appropriately."
date: 2025-12-10T14:30:00Z
author:
  name: "Zablon Dawit"
tags:
  - error-handling
  - resilience
  - backend
category: "engineering"
slug: "error-handling-strategies"
series: "Production Architecture"
weight: 1
layout: "post"
draft: false
toc: true
reading_time: 8
lang: en
---


## Introduction

Errors aren't exceptions—they're normal. Users will misuse your API. Networks will timeout. Databases will crash. Third-party services will fail. The difference between fragile and resilient systems is how you handle these inevitable failures.

Poor error handling creates cascading failures. A single database timeout takes down your entire app. A missing null check causes an unhandled exception. Users see blank screens. They leave. You lose revenue.

This article covers the error handling strategies that turn fragile systems into production-grade applications.

## The Error Pyramid

Not all errors are equal. Categorize them:

```
        CRITICAL
         (0.1%)
        ERROR
        (1-2%)
       WARNING
       (5-10%)
        INFO
       (85%+)
```

**CRITICAL Errors** (0.1% of events):
- Database connection lost
- Authentication service down
- Payment processing failed
- Out of memory

These need immediate alerting and failover.

**ERROR** (1-2%):
- Invalid input validation
- API rate limit exceeded
- Resource not found
- Permission denied

These need logging and user feedback.

**WARNING** (5-10%):
- Slow query detected
- Cache miss on frequently accessed data
- Retry attempt #3

These need monitoring but not immediate action.

**INFO** (85%+):
- User login successful
- Request processed
- Cache hit

These need structured logging for debugging.

## Strategy 1: Fail Fast, Fail Loud

Catch errors early. Don't let bad data propagate through your system.

```typescript
// BAD: Silent failure
async function processPayment(amount: number, cardToken: string) {
  try {
    const result = await stripeClient.charge(amount, cardToken);
    return result;
  } catch (e) {
    console.log('error'); // Useless error handling
    return null; // Silent failure
  }
}

// GOOD: Explicit error handling
async function processPayment(amount: number, cardToken: string) {
  if (!amount || amount <= 0) {
    throw new ValidationError('Amount must be greater than 0');
  }
  
  if (!cardToken || cardToken.length < 10) {
    throw new ValidationError('Invalid card token');
  }
  
  try {
    const result = await stripeClient.charge(amount, cardToken);
    return result;
  } catch (error) {
    if (error.code === 'card_declined') {
      throw new PaymentError('Card declined', { code: 'CARD_DECLINED', retryable: false });
    }
    if (error.code === 'timeout') {
      throw new PaymentError('Payment service timeout', { code: 'TIMEOUT', retryable: true });
    }
    throw new PaymentError('Payment processing failed', { code: 'UNKNOWN', retryable: false });
  }
}
```

The key differences:
1. **Validate early:** Check inputs before processing.
2. **Use specific errors:** Don't catch generic `Error`. Use domain-specific exceptions.
3. **Include metadata:** `retryable` flag tells callers whether to retry.

## Strategy 2: Graceful Degradation

Not all errors should crash your app. Some features can degrade gracefully.

```typescript
// User profile page
async function getUserProfile(userId: string) {
  const user = await db.users.findById(userId); // Critical
  const recentPosts = await db.posts.findByUserId(userId, { limit: 10 }); // Optional
  const recommendations = await aiService.getRecommendations(userId); // Optional
  
  return {
    user,
    recentPosts: recentPosts || [], // Degrade gracefully
    recommendations: recommendations || [] // Show empty if AI service down
  };
}
```

In your API response:

```json
{
  "status": "partial_success",
  "data": {
    "user": { "id": "123", "name": "John" },
    "recentPosts": [],
    "recommendations": []
  },
  "errors": [
    {
      "feature": "recommendations",
      "message": "AI service temporarily unavailable"
    }
  ]
}
```

This prevents a single failure from breaking the entire page.

## Strategy 3: Structured Error Logging

Unstructured logs are noise. Structured logs are actionable.

```typescript
// BAD: Unstructured logging
console.error('Payment failed: ' + error.toString());

// GOOD: Structured logging
logger.error('payment_processing_failed', {
  userId: user.id,
  amount: amount,
  currency: 'USD',
  paymentProvider: 'stripe',
  errorCode: error.code,
  errorMessage: error.message,
  timestamp: new Date().toISOString(),
  requestId: context.requestId, // Trace across services
  attempt: retryCount,
  isRetryable: error.retryable
});
```

Structured logs enable:
- **Querying:** Find all payment failures by user, by provider, by error code.
- **Alerting:** Alert when payment errors exceed 5% in last 5 minutes.
- **Debugging:** Reconstruct user journey using `requestId`.

## Strategy 4: Retry Logic with Exponential Backoff

Transient failures (network timeouts) should be retried. Permanent failures (invalid input) should not.

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 100
): Promise<T> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry permanent errors
      if (!error.retryable) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff with jitter)
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      const jitter = Math.random() * delay * 0.1;
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }
  
  throw lastError;
}

// Usage
const result = await retryWithBackoff(
  () => externalService.fetchData(),
  3,
  100
);
```

This approach:
- **Handles transient failures:** Retries network timeouts automatically.
- **Respects permanent errors:** Fails fast on invalid input.
- **Prevents thundering herd:** Exponential backoff + jitter spreads retry load.

## Strategy 5: Circuit Breaker Pattern

When a service is failing, stop calling it immediately.

```typescript
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime?: number;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  private readonly failureThreshold = 5;
  private readonly resetTimeout = 60000; // 1 minute

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime! > this.resetTimeout) {
        this.state = 'half-open'; // Try again
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      if (this.state === 'half-open') {
        this.state = 'closed'; // Recovered
        this.failureCount = 0;
      }
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.state = 'open'; // Stop calling
      }

      throw error;
    }
  }
}

// Usage
const breaker = new CircuitBreaker();

async function callFlakeyService() {
  return breaker.execute(() => externalService.getData());
}
```

States:
- **Closed:** Normal operation. Calls go through.
- **Open:** Service failing. Calls rejected immediately.
- **Half-open:** Testing recovery. Allows limited requests.

## Strategy 6: Error Boundaries in Frontend

React error boundaries prevent a single component error from crashing your entire app.

```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to error reporting service
    errorReportingService.logError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h1>Something went wrong</h1>
          <p>We're working on it. Try refreshing the page.</p>
          <button onClick={() => window.location.reload()}>
            Refresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <UserProfile userId="123" />
</ErrorBoundary>
```

This ensures:
- Users see a helpful error message instead of a blank screen.
- Errors are reported to your monitoring service.
- Other components continue to work.

## Monitoring: The Early Warning System

Error handling is only useful if you know errors are happening.

```typescript
// Example with Sentry
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "https://your-key@sentry.io/project-id",
  tracesSampleRate: 1.0
});

// Manual capture
try {
  riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      operation: 'payment_processing',
      userId: user.id
    }
  });
}

// Track performance
const transaction = Sentry.startTransaction({
  op: 'database.query',
  name: 'SELECT users'
});

// ... query runs ...

transaction.finish();
```

Set up alerts:
- **Error rate spike:** Alert if errors exceed 1% in 5 minutes.
- **Critical errors:** Page on-call for CRITICAL errors.
- **Slow endpoints:** Alert if 95th percentile latency exceeds 500ms.

## Conclusion

Error handling isn't an afterthought. It's foundational to reliability.

Fail fast with specific errors. Degrade gracefully where possible. Log structurally. Retry intelligently. Use circuit breakers. Monitor everything.

This transforms errors from disasters into manageable, debuggable events.
