# Decisions: Microsoft Purview (CAT-04)

> Stack: purview | Status: DEFERRED | Applicable: NO
> Deferred-Reason: No data classification, sensitivity labels, DLP, or
> compliance SDK usage detected. Activate when data governance or compliance
> features are introduced.
> GitHub Issue: #30

---

## Decided Items

| ID      | Priority | Scope                                | Decision                                                                                          | Notes                                                                                            | Date       |
| ------- | -------- | ------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------- |
| DEC-CAT-401 | HIGH | Phase 2 (Sensitivity Labels)         | Apply sensitivity labels to all generated documents; inherit parent label when creating child items | Labels drive encryption and access control; must be applied at creation time                      | 2026-03-18 |
| DEC-CAT-402 | HIGH | Phase 2 (DLP Policies)               | Application must not bypass or override DLP policies; surface DLP blocks to user with guidance     | DLP violations return specific error codes; application handles gracefully                        | 2026-03-18 |
| DEC-CAT-403 | MEDIUM | Phase 2 (Data Classification)       | Use auto-classification for structured data; manual classification for unstructured content        | Purview auto-classification for known sensitive info types; manual for project-specific content   | 2026-03-18 |
| DEC-CAT-404 | MEDIUM | Phase 5 (Audit Trail)               | All Purview API interactions must be logged with correlation IDs for compliance audit trail         | Required for compliance reporting and incident investigation                                      | 2026-03-18 |
| DEC-CAT-405 | LOW  | Phase 2 (Data Catalog Integration)    | Register application data assets in Purview data catalog when enterprise deployment is adopted      | Enables data discovery and lineage tracking across organization                                   | 2026-03-18 |

---

_Category created: 2026-03-18 | Implementation Agent | Sprint 5 SP-5-CAT_
