---
title: Workspace Operator Guide
description: How to set up and validate workspace context before you execute commands.
keywords: [workspace, projects, repositories, credentials, context]
---

# Workspace Operator Guide

The Workspaces page defines what the platform is allowed to operate on and which project context downstream pages should assume.

## What this page is for

Use Workspaces to make sure commands are aimed at the correct repositories, projects, and credentials.

## What to do here

1. Create or select the correct workspace for the workstream.
2. Register the repositories the platform should inspect or modify.
3. Confirm project associations and access prerequisites.

## Why this matters

If workspace context is wrong, every downstream page can still look healthy while acting on the wrong project boundary.

## Common sign of bad workspace context

Commands look valid, but results appear in the wrong repository, the wrong project, or not at all.

## Good operator habit

When a command result looks inconsistent, validate workspace context before you debug agents or prompts.
