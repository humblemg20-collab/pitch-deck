# AfriGreen24 Pitch Studio V2 — free access release gates

## Validated commercial decision

Pitch Studio is **free**. It must not call Selar, request a payment token, activate a paid access code, or create a payment record. The only code in the normal user journey is a **private project-resume code**, not a purchase code.

## Canonical flow

1. User provides project name, email, and processing consent.
2. The server validates those fields, checks per-email and global daily quotas, creates a project, persists its token hash and recovery hash, and sends recovery details by email.
3. The user completes the questionnaire, optionally uploads documents/images, and may explicitly consent to an OpenAI document analysis.
4. The user approves proposed field values; server-side deterministic validation preserves human answers.
5. The system generates one Slides file and one PDF, grants viewing rights to the project email, records links and events, and preserves/reconciles failures.

## Source of truth / historical data

- Projects data: Projects sheet; source documents: private Drive; metadata: Assets; extraction runs: ImportRuns; events: Events.
- Legacy payment modules have been removed **from source control** and are explicitly retired **inside release staging**. Do not delete historical payment sheets or transactions; they are legacy records, not an active dependency.
- Never treat a merge/push to GitHub as proof of a production Apps Script deployment.

## Security and CI

- Browser-accessible server functions: doGet and explicitly approved api* wrappers only. Operator/setup/test functions and content builders end in an underscore.
- Anonymous projects are subject to 3 creations/email/day and a global 250 creations/day cap, enforced under LockService.
- Document analysis requires server-validated consent and logs the document identity with the import event.
- CI runs Node.js contracts for free enrollment, RPC surface, private assets, document analysis, resume compatibility, and daily limits, plus PowerShell comparisons/staging/conflict tests.

## RELEASE BLOCKERS (runtime evidence required)

- [ ] Confirm deployed Apps Script backup SHA and scriptId; preserve Script Properties, Drive files, and Sheets.
- [ ] Stage against live backup; inspect clean 3-way merges; verify legacy payment files were retired from the **staging payload**.
- [ ] Verify free creation and recovery flow in a private Apps Script test deployment; preserve old recovery links.
- [ ] Verify formerly reachable setup/test/generation functions cannot be called using google.script.run.
- [ ] Verify anti-abuse limits against a test Sheet and check anonymous execution quotas.
- [ ] Verify Drive permissions, PDF and DOCX upload, private image access, OpenAI explicit consent, suggested-field approval, Slides+PDF output, and file-sharing to the project's email.
- [ ] Inject failed Google Drive/Sheets/OpenAI requests; confirm status, recovery, no duplicate final artifacts, and no previous-data loss.
- [ ] Verify that deployed Apps Script files match the approved GitHub source snapshot; record release SHA, health checks, and rollback plan.

**No automatic production rollout is authorized by this file.**
