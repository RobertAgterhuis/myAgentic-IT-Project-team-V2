---
title: Agents Operations Guide
description: How to interpret agent status, retries, and confidence signals before intervening.
keywords: [agents, retries, confidence, failures, operations]
---

# Agents Operations Guide

The Agents area tells you how the specialized agents are behaving, not whether the whole workflow is healthy by itself.

## What this page is for

Use Agents when you need to determine whether a problem belongs to one agent, one provider, or the broader orchestration flow.

## What to do here

1. Check active status and recent failures.
2. Compare retry count with outcome quality.
3. Read confidence and uncertainty before trusting the output.
4. Open Execution History when you need trend evidence instead of one-off status.

## Why this matters

Not every agent failure is equally important. Some are transient provider issues. Others indicate broken assumptions, missing context, or contract violations.

## When to intervene

Intervene when failures repeat, confidence is low, or an agent is blocking a required handoff. Do not intervene simply because a retry happened.
