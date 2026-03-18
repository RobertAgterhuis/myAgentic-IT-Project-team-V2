# 02. Web UI Smoke And Navigation

This file validates whether a new user can understand the web application structure and navigate the main areas without training.

## Scenario 1: Verify Initial Screen And Layout

### Objective

Confirm that the initial screen is understandable and visually usable.

### Preconditions

- The application is running locally.

### Steps

1. Open the application in a desktop browser.
2. Observe the top navigation, sidebar, page title, and primary content area.
3. Resize the browser to a narrower width and observe whether the layout still works.

### Expected Outcome

- The application renders without broken layout regions.
- Navigation areas are visible and understandable.
- The page remains usable on a narrower viewport.

### Result

| Item                                  | Notes |
| ------------------------------------- | ----- |
| Pass / Partial / Fail                 |       |
| Layout issues                         |       |
| Accessibility or readability concerns |       |

### User Feedback

```

```

## Scenario 2: Navigate Through Main Sections

### Objective

Confirm that the sidebar navigation matches the product structure.

### Steps

1. Open each main navigation destination:
   - Overview
   - Sessions
   - Pipeline
   - Commands
   - Agents
   - Execution History
   - Decisions
   - Artifacts
   - Questionnaires
   - Metrics
   - Governance
   - Cockpit
2. On each page, wait for content to load.
3. Record any page that appears empty, confusing, or broken.

### Expected Outcome

- Every main route opens without a browser error.
- The active navigation item is clear.
- The user can distinguish the purpose of each page.

### Result

| Page              | Result | Notes |
| ----------------- | ------ | ----- |
| Overview          |        |       |
| Sessions          |        |       |
| Pipeline          |        |       |
| Commands          |        |       |
| Agents            |        |       |
| Execution History |        |       |
| Decisions         |        |       |
| Artifacts         |        |       |
| Questionnaires    |        |       |
| Metrics           |        |       |
| Governance        |        |       |
| Cockpit           |        |       |

### User Feedback

```

```

## Scenario 3: Check Helpfulness Of Labels And Terminology

### Objective

Determine whether a first-time user understands the wording used by the application.

### Steps

1. Review the labels used in the sidebar and main content.
2. Identify terms that are unclear without internal product knowledge.
3. Note whether you can tell where to begin the primary workflow.

### Expected Outcome

- The application makes it obvious where to start.
- Terms such as CREATE, AUDIT, CONTINUE, questionnaire, decision, governance, and cockpit are understandable or sufficiently explained.

### Result

| Item                  | Notes |
| --------------------- | ----- |
| Pass / Partial / Fail |       |
| Unclear labels        |       |
| Missing guidance      |       |

### User Feedback

```

```

## Scenario 4: Check Browser Refresh And Direct Link Behavior

### Objective

Confirm that route navigation is stable.

### Steps

1. Open a deep page such as `/questionnaires` or `/decisions`.
2. Refresh the browser.
3. Use the browser Back and Forward buttons.
4. Open the same route in a new tab.

### Expected Outcome

- The application still loads correctly after refresh.
- Browser history works as expected.
- The route remains stable when opened directly.

### Result

| Item                  | Notes |
| --------------------- | ----- |
| Pass / Partial / Fail |       |
| Route issues          |       |
| Unexpected redirects  |       |

### User Feedback

```

```
