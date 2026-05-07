---
title: "TypeScript at Scale: Project References and Monorepos"
description: "Optimizing large-scale TypeScript projects for performance and maintainability."
date: 2026-04-05T10:00:00Z
author:
  name: "Zablon Dawit"
tags:
  - typescript
  - monorepo
  - architecture
  - scaling
categories:
  - engineering
slug: "ts-resilient-architectures-3"
series: "Mastering TypeScript"
weight: 3
layout: "post"
draft: false
toc: true
reading_time: 9
lang: en
---

# TypeScript at Scale: Project References and Monorepos

## Introduction

Parts one and two covered building resilient systems with interfaces, generics, and discriminated unions. Those patterns work for small and medium codebases.

But what happens at scale? A single TypeScript project with 500,000 lines of code compiles slowly. Teams step on each other's toes. Changes in one part break others unexpectedly. The type system becomes a burden instead of a benefit.

This is part three: scaling TypeScript across large teams and codebases using monorepos and project references.

## Problem Definition

Large TypeScript projects face these challenges:

1. **Slow Compilation:** Compiling 500K lines takes minutes. Developers wait. Productivity drops.
2. **Unclear Boundaries:** With everything in one project, developers don't know what's public API and what's internal.
3. **Dependency Tangles:** Package A depends on B, which depends on C, which depends on A. Circular dependencies hide bugs.
4. **Shared Ownership:** Everyone owns everything. Code review becomes political. Responsibility is unclear.
5. **Deployment Coupling:** Can't ship one team's code without shipping everyone's. Release cycles become complicated.

Monorepos and project references solve these problems by creating logical boundaries within a single repository.

## Project References: Breaking Monoliths into Packages

Project references let one TypeScript project depend on another. Each project compiles independently.

```json
// packages/core/tsconfig.json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

```json
// packages/api/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "references": [
    { "path": "../core" }
  ],
  "include": ["src/**/*"]
}
```

Now the API package depends on core. TypeScript compiles each separately:

```
core/ → [compile] → .tsbuildinfo (incremental build cache)
  ↓
api/  → [compile using core] → output
```

Incremental builds make recompilation fast. Change a file in `core/`, only `core/` and `api/` recompile. Everything else is untouched.

## Monorepo Structure

A monorepo contains multiple packages. Each package is independent but shareable:

```
monorepo/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── api/
│   │   ├── src/
│   │   └── tsconfig.json
│   ├── web/
│   │   ├── src/
│   │   └── tsconfig.json
│   └── cli/
│       ├── src/
│       └── tsconfig.json
├── tsconfig.base.json
└── tsconfig.json
```

Each package defines its own dependencies and TypeScript config. A root config shared common settings.

```json
// tsconfig.base.json (shared)
{
  "compilerOptions": {
    "strict": true,
    "module": "esnext",
    "target": "ES2020",
    "lib": ["ES2020"],
    "declaration": true,
    "sourceMap": true,
    "paths": {
      "@org/core": ["packages/core/src"],
      "@org/api": ["packages/api/src"],
      "@org/web": ["packages/web/src"]
    }
  }
}
```

## Dependency Graph: Clear Boundaries

Define what each package can depend on:

```
@org/core       (no dependencies)
  ↑
  └── @org/api
  └── @org/cli
  └── @org/web

@org/api    (depends on @org/core)
  ↑
  └── @org/web

@org/cli    (depends on @org/core only)
```

Forbidden:
- API depending on Web (circular)
- CLI depending on Web (circular)

This is documented. Enforced through code review. Automated tools check it.

## Complete Example: E-Commerce Monorepo

Here's a realistic structure:

```
// packages/core/src/types.ts
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'customer';
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'shipped' | 'delivered';
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}
```

```typescript
// packages/api/src/index.ts
import { User, Order, ApiResponse } from '@org/core';

export class OrderService {
  async getOrder(id: string): Promise<ApiResponse<Order>> {
    try {
      const order = await this.db.findOrder(id);
      return { data: order };
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async listUserOrders(userId: string): Promise<ApiResponse<Order[]>> {
    try {
      const orders = await this.db.findUserOrders(userId);
      return { data: orders };
    } catch (error) {
      return { error: 'Failed to fetch orders' };
    }
  }
}

export function createOrderRouter(service: OrderService) {
  return (req: any, res: any) => {
    const { userId } = req.params;
    service.listUserOrders(userId).then(result => {
      if (result.error) {
        res.status(400).json(result);
      } else {
        res.json(result);
      }
    });
  };
}
```

```typescript
// packages/web/src/index.ts
import { Order, ApiResponse } from '@org/core';
import { OrderService } from '@org/api';

export function OrderList({ orders }: { orders: Order[] }) {
  return (
    <ul>
      {orders.map(order => (
        <li key={order.id}>
          {order.id}: ${order.total} ({order.status})
        </li>
      ))}
    </ul>
  );
}

// Web imports types from core, components from api
// But NOT business logic from api (that stays in the backend)
```

```typescript
// packages/cli/src/index.ts
import { Order } from '@org/core';

export async function printOrders(orders: Order[]) {
  console.log('Orders:');
  orders.forEach(order => {
    console.log(`  ${order.id}: ${order.status}`);
  });
}
```

Build commands:

```bash
# Compile all packages
tsc -b

# Compile specific package
tsc -b packages/api

# Watch mode (fast incremental builds)
tsc -b -w

# Clean build
tsc -b --clean
```

## Workspace Management

Tools like Yarn Workspaces or npm Workspaces manage monorepos:

```json
// package.json (root)
{
  "name": "ecommerce-monorepo",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "tsc -b",
    "build:watch": "tsc -b -w",
    "test": "jest --projects '**/*.jest.js'",
    "test:watch": "jest --watch --projects '**/*.jest.js'"
  }
}
```

Now `npm install` once. Packages share dependencies. Each can have its own scripts:

```bash
npm run build          # Builds all packages
npm --workspace @org/api run test  # Tests only API
npm --workspace @org/web run dev   # Runs web dev server
```

## Benefits at Scale

**Before monorepo:**
- 10 separate repositories
- Coordination headaches
- 10x slower to get started (clone, install, setup all repos)
- Hard to refactor across repos

**After monorepo:**
- One repository
- Atomic commits that affect multiple packages
- Single `npm install` for full setup
- Refactoring is easy (change core, rebuild all)

Compilation stays fast because TypeScript compiles each package independently with incremental caching.

## Conclusion

Monorepos with TypeScript project references scale to thousands of files and dozens of teams.

Clear boundaries prevent chaos:
- Each package owns its domain
- Dependencies are explicit
- Circular dependencies are caught immediately
- Incremental compilation keeps development fast

Start with a monorepo structure from day one. Your future self will thank you when the codebase grows to 10x its current size.

This concludes the three-part series on resilient TypeScript architecture: interfaces, generics, and scaling.