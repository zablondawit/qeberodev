---
title: "Building Scalable Microservices Architecture"
description: "Design microservices that scale independently while maintaining system coherence."
date: 2026-03-01T16:30:00Z
author:
  name: "Zablon Dawit"
tags:
  - microservices
  - architecture
  - scaling
categories:
  - engineering
slug: "scalable-microservices-architecture"
series: "System Design"
weight: 1
layout: "post"
draft: false
toc: true
reading_time: 11
lang: en
---

# Building Scalable Microservices Architecture

## Introduction

Monolithic applications hit walls. One slow database query brings down the entire app. One memory leak crashes everything. One team's deployment breaks another team's feature.

Microservices split your system into independent services. Each service owns its data. Each service scales independently. Each team deploys separately.

But microservices introduce complexity. Network latency. Partial failures. Eventual consistency. Debugging across 20 services.

This article covers microservices patterns that actually work in production.

## When to Use Microservices

Microservices are not always the answer. Use them when:

1. **Teams scale:** Each service owned by a team (avoiding coordination overhead)
2. **Scaling needs differ:** Some services need horizontal scaling, others don't
3. **Technology diversity:** Different services use different languages/databases
4. **Deployment frequency:** Services deploy at different cadences
5. **Fault isolation:** Failure in one service shouldn't cascade

If your system has 5 engineers, a monolith is simpler.

## Service Boundaries

Good service boundaries are the foundation. Define them by business capability, not by technical layers.

**Bad boundaries (technical):**
```
API Service → Business Logic Service → Database Service
```
Hard to change. Multiple services touched for each feature.

**Good boundaries (business capability):**
```
User Service (user accounts, profiles)
Order Service (orders, fulfillment)
Payment Service (payments, refunds)
Inventory Service (stock management)
```
Each service owns its domain. One team per service.

## Communication Patterns

### Synchronous: REST/gRPC

Services call each other directly. Immediate response.

```typescript
// Order Service calls Payment Service synchronously
async function createOrder(userId: string, items: Item[]) {
  // Calculate total
  const total = items.reduce((sum, item) => sum + item.price, 0);
  
  // Charge payment synchronously
  try {
    const paymentResult = await paymentService.charge({
      userId,
      amount: total,
      currency: 'USD'
    });
  } catch (error) {
    throw new PaymentFailedError('Payment declined');
  }
  
  // Create order if payment succeeded
  const order = await db.orders.create({
    userId,
    items,
    status: 'confirmed'
  });
  
  return order;
}
```

Pros:
- Simple: Request-response model
- Immediate: Know result immediately

Cons:
- **Cascading failures:** If Payment Service is down, Order Service fails
- **Tight coupling:** Order Service depends on Payment Service implementation
- **Network latency:** Every call adds 50-200ms

Use for critical flows that need immediate consistency (payments).

### Asynchronous: Message Queues

Services post events. Other services react independently.

```typescript
// Order Service publishes event
async function createOrder(userId: string, items: Item[]) {
  const order = await db.orders.create({
    userId,
    items,
    status: 'pending'
  });
  
  // Publish event (don't wait for response)
  await messageQueue.publish('order.created', {
    orderId: order.id,
    userId,
    items,
    total: calculateTotal(items)
  });
  
  return order;
}

// Payment Service subscribes to event
messageQueue.subscribe('order.created', async (event) => {
  const { orderId, userId, total } = event;
  
  try {
    const payment = await stripe.charge(userId, total);
    
    // Publish success event
    await messageQueue.publish('payment.succeeded', {
      orderId,
      paymentId: payment.id
    });
  } catch (error) {
    // Publish failure event
    await messageQueue.publish('payment.failed', {
      orderId,
      reason: error.message
    });
  }
});

// Order Service reacts to payment result
messageQueue.subscribe('payment.succeeded', async (event) => {
  const { orderId } = event;
  await db.orders.update(orderId, { status: 'confirmed' });
  // Notify user, send confirmation email, etc.
});

messageQueue.subscribe('payment.failed', async (event) => {
  const { orderId, reason } = event;
  await db.orders.update(orderId, { status: 'failed', reason });
  // Notify user
});
```

Pros:
- **Resilient:** Payment Service down doesn't block Order Service
- **Loose coupling:** Services don't know about each other
- **Scalable:** Order Service handles 1000 orders/sec, Payment Service catches up later

Cons:
- **Eventual consistency:** Order exists before payment is processed
- **Complex debugging:** Hard to trace flow across services
- **Exactly-once delivery:** Difficult to guarantee (requires idempotency)

Use for non-critical flows (analytics, notifications, email).

## Data Management

Each service owns its database. No shared databases (defeats the purpose of microservices).

```
User Service → PostgreSQL (users table)
Order Service → PostgreSQL (orders table)
Payment Service → PostgreSQL (payments table)
```

Trade-off: Can't join data across services. Must manage data consistency differently.

### Handling Distributed Transactions

Payment must succeed before order is confirmed. How do you do this across services?

**Option 1: Saga Pattern (Orchestrated)**

One service (orchestrator) coordinates the transaction.

```typescript
// Order Service orchestrates
async function createOrderWithPayment(userId: string, items: Item[]) {
  const order = await db.orders.create({
    userId,
    items,
    status: 'pending'
  });
  
  try {
    // Step 1: Charge payment
    const payment = await paymentService.charge({
      orderId: order.id,
      userId,
      amount: calculateTotal(items)
    });
    
    // Step 2: Reserve inventory
    const reservation = await inventoryService.reserve({
      orderId: order.id,
      items
    });
    
    // Step 3: Mark order confirmed
    await db.orders.update(order.id, { status: 'confirmed' });
    
    return order;
  } catch (error) {
    // Rollback: reverse all steps
    await paymentService.refund(payment.id);
    await inventoryService.unreserve(reservation.id);
    await db.orders.update(order.id, { status: 'failed' });
    throw error;
  }
}
```

Pros: Clear flow
Cons: Orchestrator becomes complex bottleneck

**Option 2: Saga Pattern (Choreographed)**

Services react to events, no central orchestrator.

```
Order Service creates order
  ↓
publishes order.created event
  ↓
Payment Service charges
  ↓
publishes payment.succeeded event
  ↓
Inventory Service reserves
  ↓
publishes inventory.reserved event
  ↓
Order Service confirms order
```

Simpler per-service, but hard to track overall flow.

## Service Discovery

Services need to find each other (IP addresses change in cloud).

**Client-side discovery:**

```typescript
// Hardcoded service URLs
const PAYMENT_SERVICE_URL = 'http://payment-service:3000';
const ORDER_SERVICE_URL = 'http://order-service:3001';

async function callPaymentService(data) {
  return fetch(`${PAYMENT_SERVICE_URL}/api/charge`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}
```

Cons: Hard to update when service moves

**Server-side discovery (Load Balancer):**

```
Client → Load Balancer → Payment Service Instance 1
                      → Payment Service Instance 2
                      → Payment Service Instance 3
```

Load balancer knows where services are. Client calls load balancer only.

```typescript
// Single endpoint
const PAYMENT_SERVICE_URL = 'http://payment-service-lb:80';

async function callPaymentService(data) {
  return fetch(`${PAYMENT_SERVICE_URL}/api/charge`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}
```

Better. Use Kubernetes Service Discovery or Consul.

## Resilience Patterns

Microservices are unreliable. Network timeouts. Services crash. Data corruption.

### Circuit Breaker

Stop calling failing service immediately (don't cascade failure).

```typescript
class CircuitBreaker {
  state = 'closed'; // closed → open → half-open
  failureCount = 0;
  lastFailureTime = null;
  
  async execute(fn) {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > 60000) {
        this.state = 'half-open'; // Try again after 1 minute
      } else {
        throw new Error('Circuit breaker open');
      }
    }
    
    try {
      const result = await fn();
      if (this.state === 'half-open') {
        this.state = 'closed'; // Recovered!
        this.failureCount = 0;
      }
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= 5) {
        this.state = 'open'; // Stop calling
      }
      throw error;
    }
  }
}

// Usage
const paymentBreaker = new CircuitBreaker();

async function chargeUser(amount) {
  return paymentBreaker.execute(() =>
    paymentService.charge(amount)
  );
}
```

### Bulkhead

Isolate failures. Don't let one slow service drag down others.

```typescript
// Thread pool per service
const paymentPool = new ThreadPool(10); // 10 concurrent requests
const inventoryPool = new ThreadPool(10);

// If payment is slow, only 10 threads affected
// Order service keeps 90 threads for other work
```

In Node (single-threaded), use connection pools:

```typescript
// Limit concurrent calls to payment service
const paymentSemaphore = new Semaphore(10);

async function chargeUser(amount) {
  await paymentSemaphore.acquire();
  try {
    return await paymentService.charge(amount);
  } finally {
    paymentSemaphore.release();
  }
}
```

## Monitoring Microservices

With 20 services, you can't debug manually. Instrument everything.

```typescript
// Distributed tracing (correlation ID)
const requestId = generateUUID();

// Pass correlation ID between services
async function callPaymentService(data) {
  return fetch(`${PAYMENT_SERVICE_URL}/api/charge`, {
    headers: {
      'X-Correlation-ID': requestId
    },
    body: JSON.stringify(data)
  });
}

// Log with correlation ID
logger.info('Processing order', {
  requestId,
  orderId,
  userId,
  timestamp: new Date()
});
```

Tools: Jaeger, Zipkin for distributed tracing. Prometheus for metrics.

## Microservices Checklist

- [ ] Clear service boundaries (business capability)
- [ ] Each service owns its data (no shared DB)
- [ ] Async communication for non-critical paths
- [ ] Saga pattern for distributed transactions
- [ ] Service discovery (not hardcoded IPs)
- [ ] Circuit breaker for fault tolerance
- [ ] Bulkhead isolation (connection pools)
- [ ] Distributed tracing (correlation IDs)
- [ ] Metrics per service (latency, errors, throughput)
- [ ] Centralized logging
- [ ] Health checks (readiness + liveness probes)
- [ ] Graceful shutdown (drain connections before terminating)

## Conclusion

Microservices enable scale. But they add complexity. Clear service boundaries. Async communication for resilience. Distributed tracing for observability.

Start with a monolith. Split services when they need independent scaling.

Microservices are a journey, not a destination. Evolve incrementally.
