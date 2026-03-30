---
title: Pipeline Operator Guide
description: How to read phase progression, gate status, and blockers on the Pipeline page.
keywords: [pipeline, phases, gates, blockers, readiness]
---

# Pipeline Operator Guide

The Pipeline page explains where a run is, what evidence exists, and why progression is allowed or blocked.

## What this page is for

Use Pipeline when you need to understand progression logic, not just runtime symptoms.

## What to do here

1. Confirm the current phase and owning agents.
2. Review every failing or warning gate before retrying anything.
3. Open linked pages such as Sessions, Approvals, or Decisions to resolve the actual blocker.

## Why this matters

Operators often lose time by retrying a run that is correctly blocked by governance or missing input. Pipeline shows whether the issue is structural, not incidental.

## What a healthy use pattern looks like

- Read current phase.
- Read gate status.
- Check whether the blocker is human, policy, or technical.
- Resolve the cause in the correct page.
- Return here to confirm readiness.

## Do not do this

Do not treat a retry as a fix. A retry is only useful after the underlying reason for failure has changed.
