# Decisions: Microsoft SharePoint (CAT-06)

> Stack: sharepoint | Status: DEFERRED | Applicable: NO
> Deferred-Reason: No SPFx, PnP, SharePoint Graph endpoints, or site
> provisioning references detected. Activate when SharePoint integration is
> introduced.
> GitHub Issue: #32

---

## Decided Items

| ID          | Priority | Scope                         | Decision                                                                                       | Notes                                                                                     | Date       |
| ----------- | -------- | ----------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------- |
| DEC-CAT-601 | HIGH     | Phase 2 (API Strategy)        | Use Microsoft Graph SharePoint endpoints for data access; SPFx only for in-page customizations | Graph API preferred for backend operations; SPFx for client-side web parts and extensions | 2026-03-18 |
| DEC-CAT-602 | HIGH     | Phase 2 (Permissions)         | Use Sites.Selected application permission for targeted site access; no Sites.ReadWrite.All     | Granular site-level access prevents over-privileged access to all SharePoint sites        | 2026-03-18 |
| DEC-CAT-603 | MEDIUM   | Phase 2 (PnP Library)         | Use PnP/PnPjs for SharePoint-specific operations not covered by Graph API                      | PnP provides higher-level abstractions; version-pin and update quarterly                  | 2026-03-18 |
| DEC-CAT-604 | MEDIUM   | Phase 5 (Site Provisioning)   | Use site scripts/designs for repeatable site provisioning; no manual site configuration        | Ensures consistency across environments; version-controlled site templates                | 2026-03-18 |
| DEC-CAT-605 | LOW      | Phase 2 (Large File Handling) | Use Graph upload session API for files > 4MB; chunked upload with resume capability            | Prevents timeout on large files; upload session handles retry                             | 2026-03-18 |

---

_Category created: 2026-03-18 | Implementation Agent | Sprint 5 SP-5-CAT_
