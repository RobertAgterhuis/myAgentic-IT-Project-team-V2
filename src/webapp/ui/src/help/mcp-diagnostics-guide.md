---
title: MCP Diagnostics Guide
description: How to use diagnostics to separate connectivity, configuration, and authorization problems.
keywords: [mcp, diagnostics, troubleshooting, health, permissions]
---

# MCP Diagnostics Guide

MCP Diagnostics exists to answer why a tool path is failing before you change permissions or blame the agent.

## What to do here

1. Read the failing signal and source.
2. Decide whether the issue is transport, config, or authorization.
3. Move to Matrix, Agent Inspector, or Overrides only after the failure type is clear.

## Why this matters

Different failure types require different fixes. Diagnostics keeps you from solving the wrong problem.
