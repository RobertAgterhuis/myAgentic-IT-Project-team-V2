---
layout: default
title: Contributing
nav_order: 6
description:
  How to contribute — branching, commit conventions, PR workflow, testing, and
  code style guidelines.
---

# Contributing

The canonical contribution guide lives at the repository root:
**[CONTRIBUTING.md](../CONTRIBUTING.md)**

That file covers:

- Development setup and prerequisites
- Architecture overview
- Coding standards (ESLint, security, style)
- Commit message conventions
- Pull request process and review checklist
- Webapp development cookbook

3. Add user-facing strings to `strings.js` if the response includes messages.

4. Add error codes to `utils/errors.js` if the endpoint can fail in new ways.

5. Write tests — use `InMemoryStore` (never real filesystem):
   ```js
   import { createTestServer } from './server.test-helpers.js';
   // Or follow the pattern in existing test files
   ```

### Adding a New Tab to the UI

The UI is a single-page app in `index.html`. Tabs are `<section>` elements
shown/hidden with CSS.

1. Add a `<button>` to the tab bar (search for `tab-bar` in index.html):

   ```html
   <button class="tab-btn" data-tab="my-tab">My Tab</button>
   ```

2. Add the content section:

   ```html
   <section id="my-tab" class="tab-content" hidden>
     <!-- Your HTML here -->
   </section>
   ```

3. The existing tab-switching JS handles visibility automatically based on
   `data-tab` matching the section `id`.

4. Fetch data from your API endpoint in a `loadMyTab()` function and call it
   when the tab activates.

### Adding a New Model Parser

Model parsers live in `models.js`. They transform raw file content into
structured data.

1. Export a new function from `models.js`:

   ```js
   function parseMyFormat(content) {
     // Parse the markdown/JSON content
     // Return structured data
   }
   ```

2. Write unit tests in a test file (follow the pattern in `models.test.js`).

3. Use the parser in your API handler via `store.readFile()` +
   `parseMyFormat()`.

### Adding Validation Schemas

JSON schemas live in `schemas.js`. Used by endpoints that accept POST bodies.

1. Add your schema to `schemas.js`:

   ```js
   const myThingSchema = { type: 'object', required: [...], properties: { ... } };
   ```

2. Validate in your handler:
   ```js
   const { valid, errors } = validateSchema(body, myThingSchema);
   if (!valid)
     return json(res, 400, errorResponse('VALIDATION_FAILED', errors));
   ```

### Key Patterns to Follow

| Pattern                    | Where                        | Why                                    |
| -------------------------- | ---------------------------- | -------------------------------------- |
| Use `store` abstraction    | All file I/O                 | Enables `InMemoryStore` in tests       |
| Use `safeWriteSync()`      | All writes                   | Atomic writes with backup              |
| Use `safePath()`           | All user-provided paths      | Prevents path traversal                |
| Use `detectSecrets()`      | All user input saved to disk | Prevents accidental credential storage |
| Use `setSecurityHeaders()` | All responses                | CSP, X-Frame-Options, etc.             |
| Use `strings.js`           | All user-facing text         | Externalized for maintainability       |
| Use `utils/errors.js`      | All error responses          | Consistent error codes                 |

---

## Questions?

Open a
[GitHub Issue](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team/issues)
for questions, bug reports, or feature requests.
