---
title: "Advanced Type Safety: Generics and Discriminated Unions"
description: "Moving beyond basic interfaces to create zero-runtime-error applications."
date: 2026-01-28T10:00:00Z
author:
  id: "zablondawit"
tags:
  - typescript
  - patterns
  - generics
category: "engineering"
slug: "ts-resilient-architectures-2"
series: "Mastering TypeScript"
weight: 2
layout: "post"
draft: false
toc: true
reading_time: 8
lang: en
---


## Introduction

You've mastered interfaces and basic type annotations. Now it's time to handle the real world: multiple states, reusable components, and unpredictable external data. Generics and Discriminated Unions are the tools that separate junior TypeScript developers from architects who design bulletproof systems.

This article builds on part one. If you haven't read "Building Resilient Architectures with TypeScript," start there first.

## Problem Definition

Interfaces solve structural typing. But two problems remain:

1. **State Management:** Your API can return success, loading, or error. How do you force developers to handle all three cases? Generics alone don't prevent forgotten edge cases.

2. **Code Reusability:** Write a function once that works for any data type, but still maintains type safety across every call site.

Without proper patterns, developers write defensive code with excessive `if` checks and `any` types—the worst enemy of reliability.

## Discriminated Unions: Exhaustive State Handling

A Discriminated Union (also called Tagged Union) is a type that uses a literal value to distinguish between multiple types.

```typescript
type APIResponse<T> = 
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };
```

The `status` field is the discriminant. TypeScript narrows the type based on its value.

```typescript
function handleResponse(res: APIResponse<{ id: string; name: string }>) {
  if (res.status === 'success') {
    // TypeScript KNOWS data exists here
    console.log(res.data.id);
    console.log(res.data.name);
  } else if (res.status === 'error') {
    // TypeScript KNOWS error exists here
    console.error(res.error.message);
  } else if (res.status === 'loading') {
    console.log('Still fetching...');
  }
}
```

**Why this matters:** Forgetting the `error` case? TypeScript yells at you during compilation, not during runtime in production.

## Generics: Write Once, Type Everywhere

Generics let you write flexible functions without sacrificing type safety.

```typescript
// Without generics: duplicate code for each type
function fetchUsers(url: string): Promise<APIResponse<User[]>> {
  // implementation
}

function fetchProducts(url: string): Promise<APIResponse<Product[]>> {
  // implementation
}

// With generics: one function for all types
function fetchAPI<T>(url: string): Promise<APIResponse<T>> {
  return fetch(url)
    .then(res => res.json())
    .then(data => ({ status: 'success' as const, data }))
    .catch(error => ({ status: 'error' as const, error }));
}
```

Now you call it once:

```typescript
const userResponse = await fetchAPI<User[]>('/api/users');
const productResponse = await fetchAPI<Product>('/api/products/1');
```

TypeScript knows `userResponse.data` is `User[]` and `productResponse.data` is `Product`.

## Constraining Generics

Unrestricted generics can be too loose. Use `extends` to enforce minimum requirements:

```typescript
function getLabel<T extends { label: string }>(item: T) {
  return item.label;
}

getLabel({ label: 'Button', color: 'blue' }); // ✓ Works
getLabel({ color: 'blue' }); // ✗ Error: missing 'label'
```

This prevents accidental misuse.

## Complete Example: Resilient API Client

Here's a production-ready pattern combining everything:

```typescript
// Define the response envelope
type APIResponse<T> = 
  | { status: 'success'; data: T; statusCode: 200 | 201 }
  | { status: 'error'; error: Error; statusCode: 400 | 401 | 500 };

// Define what every entity must have
interface Entity {
  id: string;
  createdAt: Date;
}

// The generic API client
class APIClient {
  async fetch<T extends Entity>(
    endpoint: string,
    options?: RequestInit
  ): Promise<APIResponse<T>> {
    try {
      const response = await fetch(`https://api.example.com${endpoint}`, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Validate minimum requirements
      if (!data.id || !data.createdAt) {
        throw new Error('Invalid entity structure');
      }
      
      return {
        status: 'success',
        data: data as T,
        statusCode: response.status as 200 | 201,
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error : new Error(String(error)),
        statusCode: 500,
      };
    }
  }
}

// Usage
interface User extends Entity {
  name: string;
  email: string;
}

const client = new APIClient();
const userResponse = await client.fetch<User>('/users/123');

// Must handle both cases
if (userResponse.status === 'success') {
  console.log(`User: ${userResponse.data.name}`);
} else {
  console.error(`Failed: ${userResponse.error.message}`);
}
```

This pattern guarantees:
- **Type safety:** Mismatched types caught at compile time.
- **Exhaustiveness:** Every code path handled.
- **Reusability:** One client for all entity types.

## Conclusion

Generics and Discriminated Unions are the bridge between safe, rigid code and flexible, dangerous code. They let you write reusable functions while maintaining type guarantees.

Master these patterns, and you'll design systems where bugs are impossible, not just unlikely.

The next article covers TypeScript at scale: Project References, monorepos, and optimizing build times.