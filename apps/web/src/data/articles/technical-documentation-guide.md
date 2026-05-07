---
title: "Writing Effective Technical Documentation"
description: "How to document your codebase so developers actually use it."
date: 2026-01-20T13:15:00Z
author:
  name: "Zablon Dawit"
tags:
  - documentation
  - communication
  - best-practices
categories:
  - strategy
slug: "technical-documentation-guide"
series: "Developer Experience"
weight: 1
layout: "post"
draft: false
toc: true
reading_time: 6
lang: en
---

# Writing Effective Technical Documentation

## Introduction

Undocumented code is unmaintainable code. New team members can't onboard. Users don't understand your API. Future you curses past you for mysterious function names and missing edge cases.

But documentation is often the first thing neglected under deadline pressure. "We'll document it later." Later never comes.

The most successful projects have documentation as good as their code. This article covers documentation patterns that developers actually read and use.

## Documentation Layers

Think of documentation as concentric circles, each serving a different audience:

```
        Users (API docs, guides)
           Developers (getting started)
              Contributors (architecture)
                 Maintainers (internals)
```

Each layer builds on the previous one.

## Layer 1: README (First 2 Minutes)

Your README answers: "What is this? Why should I use it? How do I get started?"

```markdown
# ProjectName

One-sentence description. Make it count.

## Features

- Feature 1
- Feature 2
- Feature 3

## Installation

\`\`\`bash
npm install projectname
\`\`\`

## Quick Start

\`\`\`typescript
import { ProjectName } from 'projectname';

const project = new ProjectName();
const result = project.doSomething();
console.log(result);
\`\`\`

## API Reference

See [API.md](./API.md)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

MIT
\`\`\`

Rules for READMEs:
1. **One sentence summary:** Tell me what this is in 10 words
2. **Show, don't tell:** Working code examples, not marketing
3. **Link out:** Point to detailed docs elsewhere
4. **Keep it short:** README is triage, not tutorial

## Layer 2: API Documentation

This is where the real content lives. Document every public function.

**Bad API docs:**

```typescript
// Sends a request to the server
export function sendRequest(url: string, data: any): Promise<any> {
  // ...
}
```

Problems:
- "Request" is vague (HTTP? WebSocket?)
- What does `data` contain?
- What errors can it throw?
- What's the response format?

**Good API docs:**

```typescript
/**
 * Send an HTTP GET request to fetch user data.
 *
 * @param userId - The numeric ID of the user (e.g., 42)
 * @param options - Optional configuration
 * @param options.timeout - Request timeout in milliseconds (default: 5000)
 * @param options.retries - Number of retry attempts on failure (default: 3)
 * @returns Promise resolving to user object with fields: id, name, email
 * @throws NetworkError if network is unavailable
 * @throws NotFoundError if user does not exist
 *
 * @example
 * const user = await getUser(42);
 * console.log(user.name);
 *
 * @example
 * // With timeout
 * const user = await getUser(42, { timeout: 10000 });
 */
export async function getUser(
  userId: number,
  options?: { timeout?: number; retries?: number }
): Promise<User> {
  // ...
}
```

Elements of good API docs:
- **Purpose:** What does this do?
- **Parameters:** What goes in? Types? Constraints? Examples?
- **Return value:** What comes out?
- **Errors:** What can fail? How to handle?
- **Examples:** Real working code

## Layer 3: Architecture Documentation

New contributors need to understand the system design, not just individual functions.

Structure:

```
docs/
├── ARCHITECTURE.md
├── DATABASE.md
├── API_DESIGN.md
└── DEPLOYMENT.md
```

Example ARCHITECTURE.md:

```markdown
# System Architecture

## Overview

[ASCII diagram showing components]

```
User → API Gateway → Services → Database
          ↓
      Cache (Redis)
          ↓
      Message Queue
```

## Components

### API Gateway
- Role: Route requests, authenticate users
- Technology: Express.js
- Config: See `.env` for port/auth keys

### User Service
- Role: Manage user accounts, profiles
- Database: PostgreSQL (users table)
- Cache: Redis (session store)

### Payment Service
- Role: Process payments, handle webhooks
- External: Stripe API (key in env)
- Failures: Fallback to pending state, retry daily

### Message Queue
- Role: Decouple services, handle async work
- Technology: RabbitMQ
- Failure handling: Dead letter queue after 3 retries

## Data Flow: User Registration

1. User submits form (frontend)
2. API Gateway validates input
3. User Service creates account in PostgreSQL
4. Message Queue publishes "user.created" event
5. Email Service picks up event, sends welcome email
6. Analytics Service tracks signup metric

## Consistency Guarantees

- User data is strongly consistent (PostgreSQL)
- Email delivery is eventually consistent (may take hours)
- Analytics are eventually consistent (may lag by 1 hour)
```

## Layer 4: Runbooks (How to Operate)

When things break at 3 AM, your team needs quick answers.

```markdown
# Runbook: Database Connection Pool Exhaustion

## Symptoms

- API returns "connection pool exhausted" errors
- Response times spike
- Error rate increases 10x

## Root Causes

1. Service has query leak (opens connections, doesn't close)
2. Database maintenance running (blocking connections)
3. Unexpected traffic spike (legitimate)

## Diagnosis

\`\`\`bash
# Check current connections
psql -U admin -d production -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
psql -U admin -d production -c "
  SELECT query, calls, mean_time
  FROM pg_stat_statements
  ORDER BY mean_time DESC LIMIT 10;
"
\`\`\`

## Immediate Actions (Priority: NOW)

1. **Scale up database connections**
   - Edit `pool.max` in config (currently 20)
   - Restart API service
   - Monitor for 5 minutes

2. **Kill long-running queries**
   \`\`\`bash
   # Find the query taking > 5 minutes
   SELECT pid, query, query_start 
   FROM pg_stat_activity 
   WHERE (NOW() - query_start) > '5 minutes';
   
   # Kill the process
   SELECT pg_terminate_backend(123456); -- Replace 123456 with PID
   \`\`\`

## Long-Term Fix

- Run profiler on API service to find connection leak
- Add integration test that validates all connections close
- Set alert on "connections > 15" (80% of pool)
```

## Documentation Anti-Patterns

**Anti-Pattern 1: Outdated Docs**

```markdown
# WRONG
// Last updated: 2023-05-15
Setup instructions:
1. npm install
2. npm start
// These instructions are now broken!
```

**Solution:** Link docs to code.

```markdown
# RIGHT
See [setup.sh](./setup.sh) for current install instructions.
// Automated tests verify setup.sh works every build
```

**Anti-Pattern 2: Copy-Paste Errors**

```markdown
# WRONG
Our API supports three endpoints:
1. POST /users - Create a user
2. GET /users/:id - Get user data
3. DELETE /users/:id - Delete user
4. PUT /users/:id - Update user (missing from list!)
```

**Solution:** Generate docs from code.

```typescript
// Use JSDoc comments + tools like TypeDoc
// Tools auto-generate docs from code
// Less chance of drift
```

## Documentation Tools

- **Code documentation:** JSDoc, Docstrings, Javadoc
- **API docs:** Swagger/OpenAPI, Postman, Stoplight
- **Guides:** Markdown + GitHub Pages, Docusaurus, Gitbook
- **Architecture:** Miro, Excalidraw, PlantUML
- **Change tracking:** Changelog, ADRs (Architecture Decision Records)

## Documentation Checklist

- [ ] README answers: What? Why? How?
- [ ] Every public function has docstring
- [ ] Return types documented (with examples)
- [ ] Errors/exceptions documented
- [ ] Architecture diagram exists
- [ ] Setup instructions are tested (automated)
- [ ] API documentation is generated from code
- [ ] Runbooks exist for common failures
- [ ] Docs are in version control (same repo as code)
- [ ] Docs have a maintenance owner

## Conclusion

Documentation isn't a chore—it's a product. Users of your code are your customers. Good docs reduce support burden, faster onboarding, fewer bugs.

Document as you code. Link docs to code so they don't decay. Invest in architecture docs for new team members.

The code you're writing today will be read by many people tomorrow. Make their lives easier.
