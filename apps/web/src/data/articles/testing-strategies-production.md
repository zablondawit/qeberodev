---
title: "Testing Strategies for Production Applications"
description: "Build test suites that catch bugs without becoming a maintenance burden."
date: 2026-04-10T15:45:00Z
author:
  name: "Zablon Dawit"
tags:
  - testing
  - quality
  - best-practices
categories:
  - engineering
slug: "testing-strategies-production"
series: "Code Quality"
weight: 1
layout: "post"
draft: false
toc: true
reading_time: 9
lang: en
---

# Testing Strategies for Production Applications

## Introduction

You can't test everything. Test suites become maintenance nightmares when you try.

The goal isn't 100% test coverage. The goal is to catch bugs that reach customers. Some bugs don't matter. Some bugs are disasters.

This article covers testing strategies that maximize bug detection while minimizing maintenance burden.

## The Testing Pyramid

Not all tests are equal. Structure tests like a pyramid:

```
        UI/Integration (few, slow, catch real user flows)
       /                                                  \
      /    Service Integration (moderate, medium speed)    \
     /                                                      \
    /         Unit Tests (many, fast, catch logic bugs)     \
   /________________________________________________________________\
```

**Unit tests** (bottom): Fast. Many. Cheap. Catch logic errors.
**Integration tests** (middle): Slower. Fewer. Catch service interaction bugs.
**E2E tests** (top): Slowest. Fewest. Catch user-facing bugs.

Most teams invert the pyramid:

```
   Pyramid (ideal): 1 E2E test, 5 integration, 50 unit
   Inverted (wasteful): 50 E2E tests, 10 integration, 5 unit
```

E2E tests are slow and fragile. Minimize them.

## Unit Tests: The Foundation

Test individual functions in isolation.

```typescript
// Function to test
function calculateDiscount(subtotal: number, coupon?: string): number {
  if (!coupon) return 0;
  
  const discounts = {
    'SAVE10': 0.10,
    'SAVE20': 0.20,
    'NEWUSER': 0.25
  };
  
  const rate = discounts[coupon];
  if (!rate) return 0; // Invalid coupon
  
  return subtotal * rate;
}

// Unit tests
describe('calculateDiscount', () => {
  it('returns 0 if no coupon provided', () => {
    const result = calculateDiscount(100);
    expect(result).toBe(0);
  });
  
  it('applies 10% discount for SAVE10', () => {
    const result = calculateDiscount(100, 'SAVE10');
    expect(result).toBe(10);
  });
  
  it('applies 25% discount for NEWUSER', () => {
    const result = calculateDiscount(100, 'NEWUSER');
    expect(result).toBe(25);
  });
  
  it('returns 0 for invalid coupon', () => {
    const result = calculateDiscount(100, 'INVALID');
    expect(result).toBe(0);
  });
  
  it('handles negative subtotal (edge case)', () => {
    const result = calculateDiscount(-100, 'SAVE10');
    expect(result).toBe(-10); // Mathematically correct even if weird
  });
});
```

Good unit tests:
- Test one thing per test
- Cover happy path and edge cases
- Use descriptive names ("returns 0 for invalid coupon", not "test1")
- Run in milliseconds

## Integration Tests: The Bridge

Test how components interact. Usually test the API endpoint.

```typescript
// Integration test: test the full request-response cycle
describe('POST /api/checkout', () => {
  it('creates order and charges payment', async () => {
    // Setup: create test user
    const user = await createTestUser({ email: 'test@example.com' });
    
    // Setup: mock payment service
    jest.spyOn(stripeClient, 'charge').mockResolvedValue({
      id: 'ch_123',
      amount: 10000
    });
    
    // Execute
    const response = await request(app)
      .post('/api/checkout')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        items: [{ id: 'prod_1', quantity: 1 }],
        coupon: 'SAVE10'
      });
    
    // Assert
    expect(response.status).toBe(200);
    expect(response.body.orderId).toBeDefined();
    
    // Verify side effects
    expect(stripeClient.charge).toHaveBeenCalledWith({
      amount: 9000, // 10% discount applied
      customerId: user.stripeId
    });
    
    // Verify database
    const order = await db.orders.findById(response.body.orderId);
    expect(order.status).toBe('confirmed');
    expect(order.totalAmount).toBe(9000);
  });
});
```

Good integration tests:
- Test through the API (full request-response)
- Mock external services (Stripe, email, etc.)
- Verify side effects (database writes, external calls)
- Test error cases (payment declined, invalid coupon)

## E2E Tests: Minimal but Important

Test critical user flows in a real browser.

```typescript
// E2E test: user buys product
describe('User purchase flow', () => {
  it('user can browse products and complete purchase', async () => {
    // Navigate to homepage
    await page.goto('https://example.com');
    
    // Browse products
    await page.click('text=Products');
    await page.waitForSelector('.product-card');
    const products = await page.$$('.product-card');
    expect(products.length).toBeGreaterThan(0);
    
    // Click first product
    await page.click('.product-card:first-child');
    
    // Add to cart
    await page.click('button:has-text("Add to Cart")');
    expect(await page.textContent('.cart-badge')).toBe('1');
    
    // Checkout
    await page.click('button:has-text("Checkout")');
    
    // Login
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("Login")');
    
    // Enter payment info
    const frame = page.frameLocator('[title="Stripe payment form"]');
    await frame.locator('input[placeholder="Card number"]').fill('4111111111111111');
    await frame.locator('input[placeholder="MM/YY"]').fill('12/25');
    await frame.locator('input[placeholder="CVC"]').fill('123');
    
    // Submit
    await page.click('button:has-text("Complete Purchase")');
    
    // Verify success
    await page.waitForSelector('.success-message');
    expect(await page.textContent('.success-message')).toContain('Order confirmed');
  });
  
  it('shows error if payment fails', async () => {
    // Similar setup...
    // Use test card that always fails: 4000000000000002
    
    // Submit payment
    // Should show error: "Card declined"
  });
});
```

E2E test best practices:
- Test critical paths only (purchase, login, signup)
- Don't test every detail (that's unit tests)
- Use real browser (Puppeteer, Playwright, Cypress)
- Run on schedule, not every commit (too slow)

## Test Coverage: The Right Amount

Don't chase 100% coverage. Aim for 70-80%.

```
High-priority (test thoroughly):
- Payment processing
- User authentication
- Data validation
- Critical business logic

Medium-priority (test moderately):
- UI components (if complex)
- API endpoints
- Error handling

Low-priority (don't test):
- Simple getters/setters
- Logging statements
- Third-party library calls
- Configuration loading
```

Coverage tools tell you what's untested. Use them to find gaps, not to hit a number.

```bash
# Run tests with coverage
npm test -- --coverage

# Output:
# Statements: 75%
# Branches: 60%
# Functions: 80%
# Lines: 76%
```

## Testing Strategies

### Strategy 1: Test Behavior, Not Implementation

BAD:
```typescript
it('calls calculateDiscount function', () => {
  // Tests implementation detail, not behavior
  expect(calculateDiscount).toHaveBeenCalled();
});
```

GOOD:
```typescript
it('applies 10% discount when valid coupon provided', () => {
  // Tests behavior: given input, expect output
  expect(calculateDiscount(100, 'SAVE10')).toBe(10);
});
```

### Strategy 2: Use Test Fixtures

Reuse test data instead of creating it in every test.

```typescript
// BAD: Repeated setup
it('test 1', () => {
  const user = { name: 'John', email: 'john@example.com' };
  // test...
});

it('test 2', () => {
  const user = { name: 'John', email: 'john@example.com' };
  // test...
});

// GOOD: Fixture setup
beforeEach(() => {
  user = createTestUser();
});

it('test 1', () => {
  // user already created
});

it('test 2', () => {
  // user already created
});
```

### Strategy 3: Test Edge Cases

```typescript
// Test boundaries and edge cases
it('handles zero quantity', () => {
  expect(calculateTotal(items, 0)).toBe(0);
});

it('handles null items', () => {
  expect(() => calculateTotal(null, 1)).toThrow('Items required');
});

it('handles very large quantity', () => {
  expect(calculateTotal(items, 999999)).toBe(expectedTotal);
});
```

## Continuous Integration

Run tests automatically on every commit.

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test -- --coverage
      - run: npm run lint
      - run: npm run build
```

Benefits:
- Catch bugs before merge
- Prevent broken code in main branch
- Enforce test discipline

## Testing Checklist

- [ ] Unit tests for complex logic (70%+ coverage)
- [ ] Integration tests for critical paths (payment, auth, core features)
- [ ] E2E tests for happy path (user signup, purchase, login)
- [ ] Error cases tested (invalid input, failures)
- [ ] Edge cases tested (null, empty, large values)
- [ ] Async operations tested properly (promises, awaits)
- [ ] External services mocked (not hitting real APIs in tests)
- [ ] Tests run in CI/CD on every commit
- [ ] Failed tests block merge (required status check)
- [ ] Test maintenance kept up (no obsolete tests)

## Conclusion

Testing is insurance. You pay a small cost now (writing tests) to prevent big disasters later (bugs in production).

Test what matters: critical business logic, user flows, error handling.

Don't test everything. Be strategic. Aim for confidence, not coverage.

The best test suite is one you actually maintain and trust.
