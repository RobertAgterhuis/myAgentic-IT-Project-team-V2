# approval-center-page

## Page Purpose

- Decision workbench for pending approvals with inline detail context and final approve/reject actions.

## Page-Specific Layout Deviations

- Primary split layout: queue list plus fixed-width detail rail (`420px` on desktop).
- Includes action-critical rejection form inline in detail panel.

## Page-Specific Component Usage Rules

- Approval list items should use a single interactive row primitive; avoid styling full-width buttons as generic cards.
- Rejection reason input must use standardized textarea primitive and validation/error handling pattern.

## Content Density Guidance

- Keep queue rows compact and scannable.
- Preserve readable spacing in detail panel for risk context, quality signals, and action controls.

## Hierarchy Notes

- Page hierarchy: strategic context -> pending triage -> metrics -> queue/detail execution workspace.
- Decision controls should always appear after contextual evidence blocks.

## Page-Specific Warnings / Anti-Patterns

- Avoid custom local control implementations for core form fields.
- Do not permit action buttons without explicit disabled/loading semantics.
- Ensure keyboard users can traverse queue -> detail -> decision controls predictably.
