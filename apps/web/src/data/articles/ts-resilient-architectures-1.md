---
title: "Building Resilient Architectures with TypeScript"
description: "Master interfaces and structural typing to create self-documenting, refactor-safe code."
date: 2025-12-15T10:00:00Z
author:
  name: "Zablon Dawit"
tags:
  - typescript
  - architecture
  - interfaces
categories:
  - engineering
slug: "ts-resilient-architectures-1"
series: "Mastering TypeScript"
weight: 1
layout: "post"
draft: false
toc: true
reading_time: 6
lang: en
---

# Building Resilient Architectures with TypeScript

## Introduction

JavaScript ships code to production without checking if variables exist, if functions accept the right arguments, or if objects have the properties you expect. Teams discover bugs in production. Users suffer crashes.

TypeScript fixes this by adding a compile-time type system. But it's not just about catching typos. TypeScript's interface-first design forces you to think about architecture before writing implementation.

This is part one of a three-part series on building systems that fail loudly during development, not silently in production.

## Problem Definition

JavaScript developers often hit these runtime errors:

1. **Type Mismatches:** Passing a string where a number is expected. No error until the function runs.
2. **Missing Properties:** Accessing `user.email` when sometimes `user` doesn't have an `email` field.
3. **Function Signature Changes:** Refactoring a function to accept three parameters instead of two breaks callers, but no tooling warns you.
4. **Unclear Contracts:** Is this function parameter required? Can it be null? The code doesn't say.

Without types, developers write defensive code:

```javascript
function processUser(user) {
  if (user && user.id && user.role) {
    // Maybe it's safe now?
  }
}
```

TypeScript forces clarity upfront. Contracts are explicit. The compiler enforces them everywhere.

## Interfaces: Designing by Contract

An interface describes the shape of an object. It's a contract.

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}
```

Now, any function that works with users receives this contract:

```typescript
function sendWelcomeEmail(user: User) {
  console.log(`Email sent to ${user.email}`);
  // TypeScript KNOWS user.email exists. No runtime check needed.
}

sendWelcomeEmail({ name: 'Alice' }); // ✗ Error: missing id, email, role
sendWelcomeEmail({ 
  id: '123', 
  name: 'Alice', 
  email: 'alice@example.com', 
  role: 'user' 
}); // ✓ Correct
```

## Structural Typing: The Power of Interfaces

TypeScript uses **structural typing**. If an object has the required properties, it matches the interface. It doesn't care about the class name.

```typescript
interface Account {
  id: string;
  balance: number;
}

class BankAccount {
  id: string;
  balance: number;
  
  constructor(id: string, balance: number) {
    this.id = id;
    this.balance = balance;
  }
}

function withdraw(account: Account, amount: number) {
  account.balance -= amount;
}

const myAccount = new BankAccount('123', 5000);
withdraw(myAccount, 100); // ✓ Works! myAccount is structurally an Account
```

This flexibility is powerful. You don't need inheritance hierarchies. If it walks like a duck and quacks like a duck, it's a duck.

## Optional and Readonly Properties

Real-world types aren't always required:

```typescript
interface User {
  id: string;           // Required
  name: string;         // Required
  email?: string;       // Optional (can be undefined)
  readonly createdAt: Date; // Required but immutable
}

const user: User = {
  id: '1',
  name: 'Alice',
  // email is optional, so omitting it is fine
  createdAt: new Date(),
};

user.createdAt = new Date(); // ✗ Error: readonly
```

## Complete Example: User Management System

Here's a realistic system:

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: Date;
}

interface CreateUserInput {
  email: string;
  name: string;
  role?: 'user'; // Users can't create admins
}

class UserService {
  private users: Map<string, User> = new Map();

  create(input: CreateUserInput): User {
    const user: User = {
      id: crypto.randomUUID(),
      email: input.email,
      name: input.name,
      role: input.role || 'user',
      createdAt: new Date(),
    };
    
    this.users.set(user.id, user);
    return user;
  }

  getById(id: string): User | undefined {
    return this.users.get(id);
  }

  update(id: string, updates: Partial<User>): User {
    const user = this.users.get(id);
    if (!user) throw new Error('User not found');
    
    const updated: User = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }
}

// Usage
const service = new UserService();
const newUser = service.create({
  email: 'alice@example.com',
  name: 'Alice',
});

const retrieved = service.getById(newUser.id);
if (retrieved) {
  console.log(retrieved.name); // Safe: TypeScript knows it exists
}
```

This pattern guarantees:
- **Self-documenting:** Anyone reading `create(input: CreateUserInput)` understands what fields are required.
- **Refactor-safe:** Changing `User.email` to optional breaks all callers—TypeScript forces updates.
- **No defensive checks:** No `if (user && user.name)` pollution.

## Strict Mode is Mandatory

Enable this in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

Strict mode forces you to handle `null` and `undefined`:

```typescript
function getName(user: User | null) {
  return user.name; // ✗ Error: user might be null
}

function getName(user: User | null) {
  return user?.name; // ✓ Safe: uses optional chaining
}
```

## Conclusion

Interfaces aren't bureaucracy. They're insurance. They document your system's expectations and enforce them everywhere—before code reaches users.

The next article advances to **Generics and Discriminated Unions**, where you'll handle complex states and write reusable, type-safe functions.