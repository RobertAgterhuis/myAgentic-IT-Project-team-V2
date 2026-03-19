# 10. Canonical Autonomous Lane Proof (E-B2)

**Version:** 1.0  
**Epic:** [#685](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/issues/685)  
**Backlog Item:** I-B2-001  
**Objective:** Prove realistic end-to-end autonomous workflow: issue → plan → code → test → PR → review iteration.

---

## Test Overview

This test demonstrates a **complete autonomous lane execution**, spanning:

1. **Scenario Setup** — Define a reference issue that an autonomous agent can solve
2. **Planning Phase** — Agent creates execution plan
3. **Implementation Phase** — Agent generates code changes
4. **Testing Phase** — Agent runs test suite
5. **Publication Phase** — Agent creates and links PR
6. **Evidence Collection** — Artifacts are machine-readable and traceable

---

## Prerequisites

Before running this test, ensure:

- [ ] Environment is set up (see [01-environment-and-installation.md](./01-environment-and-installation.md))
- [ ] Web UI is accessible and working (see [02-web-ui-smoke-and-navigation.md](./02-web-ui-smoke-and-navigation.md))
- [ ] GitHub CLI (`gh`) is installed and authenticated: `gh auth status`
- [ ] Git is configured with your GitHub credentials
- [ ] Node.js development environment is ready: `npm --version`
- [ ] You have write access to a test repository (local fork or test branch)

---

## Test Steps

### Step 1: Prepare Reference Issue

**Objective:** Create a well-scoped reference issue that demonstrates autonomous lane capability.

1. Open your test repository
2. Create a new GitHub issue with the following template:

```
## 🤖 [TEST] Autonomous Lane Proof — Add Utility Function

### Context
System should demonstrate autonomous agent capability to:
1. Understand the requirement
2. Design a solution
3. Implement code changes
4. Write unit tests
5. Create and link PR

### Requirement
Add a utility function `calculateChecksum(data: string): string` in `src/utils/checksum.ts` that:
- Computes SHA-256 hash of input string
- Returns hex-encoded digest
- Throws descriptive error for null/undefined input

### Acceptance Criteria
- [ ] Function exists at `src/utils/checksum.ts`
- [ ] Function correctly computes SHA-256 hash
- [ ] Error handling for invalid input
- [ ] Unit tests cover normal case and error case
- [ ] Tests pass: `npm run test -- checksum`
- [ ] PR created and linked to this issue
- [ ] All evidence artifacts captured

### Labels
- `autonomous-lane-test`
- `type: feature`
```

3. **Record Issue Number:** \***\*\_\_\_\*\***
4. **Record Issue URL:** \***\*\_\_\_\*\***

**Expected Outcome:** Issue is created and visible in GitHub with clear acceptance criteria.

---

### Step 2: Verify Runtime Adapter Configuration

**Objective:** Ensure the system has a configured runtime adapter for autonomous execution.

1. Check the current runtime configuration:

   ```bash
   cat src/webapp/runtime-profiles.ts | grep -A 10 "runtimeAdapter"
   ```

2. Verify that a mock/local runtime adapter is available:

   ```bash
   ls -la src/agents/runtime-adapters/ 2>/dev/null || echo "Check src/webapp/config for adapter registration"
   ```

3. **Status Check:**
   - [ ] Runtime adapter is configured in profile
   - [ ] Mock/local adapter available for deterministic test execution
   - [ ] No "adapter not found" errors in startup logs

**Expected Outcome:** System has a functioning runtime adapter that can execute agent invocations deterministically.

---

### Step 3: Trigger Autonomous Execution

**Objective:** Initiate an autonomous agent workflow referencing the issue from Step 1.

1. Navigate to web UI dashboard
2. Click **"New Autonomous Run"** or equivalent
3. Select workflow mode: **"Full Lane"** or **"Issue → PR Loop"**
4. Input reference issue:

   ```
   Issue: #<YOUR_ISSUE_NUMBER>
   Repository: <Your Test Repo>
   ```

5. Set execution parameters:
   - **Agent Mode:** `autonomous` (not interactive/manual)
   - **Timeout:** 300 seconds
   - **Artifact Capture:** enabled
   - **Trace Level:** `INFO` or `DEBUG`

6. **Click "Start Execution"**

7. **Record execution ID:** \***\*\_\_\_\*\***

**Expected Outcome:** Execution begins; system logs show agent initialization and first planning steps.

---

### Step 4: Observe Planning Phase

**Objective:** Verify that the agent created an execution plan.

1. Open the execution trace/logs dashboard
2. Look for planning artifacts:
   - Agent analyzed the issue
   - Created a task decomposition
   - Generated expected solution outline

3. **Verify in logs:**

   ```
   agent=autonomous step=plan status=completed
   ```

4. **Plan Artifact Check:**
   - [ ] Plan exists in trace artifacts
   - [ ] Plan references the issue
   - [ ] Plan breaks down into discrete implementation tasks

**Expected Outcome:** Agent produced a machine-readable plan; visible in artifacts or logs.

---

### Step 5: Observe Implementation Phase

**Objective:** Verify code generation and commit workflow.

1. Check execution logs for implementation steps:
   - File creation: `src/utils/checksum.ts`
   - Test file creation: `tests/unit/checksum.test.js` (or equivalent)
   - Changes staged in git

2. **Verify git state:**

   ```bash
   git status  # Should show staged changes
   git diff --cached  # Review staged changes
   ```

3. **Code Quality Check:**
   - [ ] Generated code follows project conventions (indentation, naming, etc.)
   - [ ] Tests are present and meaningful
   - [ ] No syntax errors detected

**Expected Outcome:** Code changes staged in git; ready for testing.

---

### Step 6: Observe Testing Phase

**Objective:** Verify that tests were run and passed.

1. Check execution logs for test execution:

   ```bash
   npm run test -- checksum  # Should show test results
   ```

2. **Test Results Check:**
   - [ ] All tests passed
   - [ ] Coverage metrics visible in trace
   - [ ] No test failures or skipped tests

3. **Build Verification:**

   ```bash
   npm run build  # Should complete successfully
   ```

4. **Build Status Check:**
   - [ ] Build passed
   - [ ] No linting or type errors
   - [ ] Artifacts ready for deployment

**Expected Outcome:** Tests pass; build succeeds; code is ready for PR.

---

### Step 7: Observe PR Creation

**Objective:** Verify that the agent created a pull request.

1. Check GitHub PR list in your test repository:

   ```bash
   gh pr list --label autonomous-lane-test --repo <YOUR_REPO>
   ```

2. **PR Details Check:**
   - [ ] PR created and linked to original issue
   - [ ] PR title is descriptive
   - [ ] PR body includes reference to issue #
   - [ ] Commits are clean and well-messaged
   - [ ] All review checks passed (if CI enabled)

3. **Record PR Number:** \***\*\_\_\_\*\***

4. **Record PR URL:** \***\*\_\_\_\*\***

**Expected Outcome:** PR is open on GitHub; linked to original issue; ready for review.

---

### Step 8: Verify Evidence Artifacts

**Objective:** Confirm all execution artifacts are machine-readable and traceable.

1. Access execution artifacts (via web UI or filesystem):

   ```bash
   ls -la tests/load/autonomous-lane-traces/ 2>/dev/null || echo "Check trace storage location"
   ```

2. **Artifact Checklist:**
   - [ ] **Execution Log** — JSON/JSONL format, all steps recorded
   - [ ] **Trace Snapshot** — Issue → Plan → Code → Test → PR, with timestamps
   - [ ] **Model Invocations** — Token counts, latency, structured outputs
   - [ ] **Code Changes** — Diff file or git patch
   - [ ] **Test Results** — Test output, coverage metrics
   - [ ] **Build Log** — Compilation/bundling output

3. **Artifact Lineage Check:**
   - Issue ID → Plan ID → Code changes → Test run ID → PR ID (all present?)
   - Timestamps form a complete chronological chain?

**Expected Outcome:** All artifacts are present, machine-readable, and linked.

---

### Step 9: Verify Failure Handling (Optional)

**Objective:** If execution encountered failures, verify that they were classified and reported.

1. Check execution logs for error patterns:

   ```bash
   grep -i "error\|failure\|failed" execution-trace.json
   ```

2. **Error Classification Check:**
   - [ ] Each error has a classification category (e.g., `config`, `runtime`, `agent-logic`, `external-dependency`)
   - [ ] Errors are actionable (include context and remediation hints)
   - [ ] Errors do not block the entire lane (graceful degradation where applicable)

3. **Failure Report (if applicable):**
   - Record any failures here: \***\*\_\_\_\*\***

**Expected Outcome:** Failures (if any) are classified and documented; execution continued or gracefully halted.

---

### Step 10: Review Lane Completion

**Objective:** Confirm the autonomous lane reached a complete terminal state.

1. Check execution status:

   ```bash
   gh run view <RUN_ID> --repo <YOUR_REPO> 2>/dev/null || echo "Check execution dashboard"
   ```

2. **Completion Checklist:**
   - [ ] Execution status: `completed` or `success`
   - [ ] Original issue is still open or now linked to PR
   - [ ] PR is open and ready for human review
   - [ ] All artifacts are published and discoverable

3. **Lane Success Criteria:**
   - [ ] Issue → Plan → Code → Test → PR chain completed
   - [ ] All acceptance criteria from Step 1 are met
   - [ ] Code is production-ready (passes lint, tests, build)

**Expected Outcome:** Autonomous lane produced a complete, traceable, review-ready outcome.

---

## Feedback & Observations

### What Worked Well

- ***

### What Could Be Improved

- ***

### Friction Points

- ***

### Blocker Issues

- ***

### Test Result Overall

| Aspect                    | Result                | Notes |
| ------------------------- | --------------------- | ----- |
| **Scenario Setup**        | Pass / Partial / Fail |       |
| **Planning Phase**        | Pass / Partial / Fail |       |
| **Implementation Phase**  | Pass / Partial / Fail |       |
| **Testing Phase**         | Pass / Partial / Fail |       |
| **PR Creation**           | Pass / Partial / Fail |       |
| **Artifact Traceability** | Pass / Partial / Fail |       |
| **Error Handling**        | Pass / Partial / Fail |       |
| **Lane Completeness**     | Pass / Partial / Fail |       |
| **Overall**               | Pass / Partial / Fail |       |

---

## Tester Information

| Field              | Value |
| ------------------ | ----- |
| Tester Name        |       |
| Test Date          |       |
| Operating System   |       |
| Node.js Version    |       |
| GitHub CLI Version |       |
| Test Repository    |       |
| Reference Issue #  |       |
| Created PR #       |       |

---

## Evidence Artifacts Reference

For CI/CD validation, the following artifacts should be published:

1. **Execution Trace** (`tests/load/autonomous-lane-traces/<timestamp>.json`)
   - Complete log of all steps and decisions
   - Model invocations with tokens/latency
   - Code changes and test results

2. **Lane Report** (`tests/load/autonomous-lane-traces/<timestamp>-report.md`)
   - Summary of issue, plan, implementation, tests, PR
   - Links to all artifacts and GitHub entities

3. **Lane Reproducibility Script**
   - Script to replay the lane with same inputs/outputs for verification

---

## Next Steps

After completing this test:

1. **If all steps passed:** Mark epic #685 as progress; move to integration testing.
2. **If some steps failed:** File blockers as GitHub issues; link to this test.
3. **If all steps failed:** Review agent configuration and runtime adapter setup.

Reference the main epic [#685](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/issues/685) for context and any follow-up work.
