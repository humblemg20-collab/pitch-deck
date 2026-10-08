# AfriGreen24 Pitch Deck — Asset Engine V1

## State and source of truth

- Canonical project identity: existing `Projects.projectId` and token hash.
- Canonical file metadata: the `Assets` spreadsheet tab. Twelve fixed columns:
  `assetId, projectId, role, kind, fileId, name, mimeType, bytes, sha256, status, createdAt, updatedAt`.
- Canonical file bytes: Google Drive, under one project folder. `images/`, `source-files/`, `generated/`.
- Files are never stored as base64 inside `Projects.dataJson` or in event logs.
- Active asset records are additive and immutable except for status and timestamps. A deletion is a soft-delete, followed by Drive trash.
- A file belongs to its project. Endpoints authorize with the **current** project token, not an arbitrary Drive file ID.
- Resume rotates the project token as before. Asset listings are reloaded from canonical storage.

## Supported surface

| Kind | Extensions | Limit | Roles | Render |
|---|---|---|---|---|
| Image | png, jpg, jpeg | 2 MiB | LOGO, COVER_HERO, PRODUCT, SOLUTION, TRACTION_PROOF, FOUNDER, TEAM, IMPACT | COVER_HERO or LOGO on cover, PRODUCT or SOLUTION on solution slide, FOUNDER or TEAM on team slide |
| Document | pdf, doc, docx | 8 MiB | SOURCE_DOCUMENT | Stored as source evidence only (no extraction or prefill in V1) |

The UI intentionally exposes the first four image roles and source documents. Other registry roles are reserved for later slide-layout work, with no automatic placement contract today.

## Call contracts

- `apiListProjectAssets(projectId, token)` → `{assets: [...]}`
- `apiUploadProjectAsset({projectId,token,fileName,mimeType,size,base64,role})` → `{asset,deduplicated}`
- `apiGetProjectImageData(projectId,token,assetId)` → `{assetId,dataUrl}`
- `apiDeleteProjectAsset({projectId,token,assetId})` → `{deleted,alreadyAbsent?,cleanupPending?}`

All endpoints use the existing `safeApi_` envelope. No endpoint accepts an unscoped Drive ID from the browser. Uploads reject invalid formats, signatures, declared-size mismatch, oversize files and unknown roles.

## Generation transaction

1. Validate the current project token and project declaration.
2. Resolve canonical assets and generate a new Slides file. Embed image blobs from authorized Drive files.
3. Move Slides into the project `generated/` folder and grant viewer access to the project contact.
4. Export exactly one PDF into the same folder and grant viewer access.
5. Commit new links in `Projects` and log `DECK_GENERATED`.
6. On generation/Drive/Sheet failure, trash only the newly created artifacts, preserve the last published links and log failure.
7. Changing questionnaire answers or an asset clears the current links and marks the existing generated deck stale, while preserving historical files.

## Secure resume-link compatibility (8 October 2026)

- New resume links use `/exec#project=<projectId>&token=<sessionToken>`; the fragment is not sent as an HTTP query parameter.
- The client resolves the fragment using the official Apps Script `google.script.url.getLocation` API, which works in an IFRAME web app.
- Historical `/exec?project=...&token=...` links are retained via server-provided `initialState` and query compatibility, without requiring customers to recreate their projects.
- The existing server-generated `template.initialState` is now interpolated in `Index.html`, fixing an earlier initialization mismatch.
- Security follow-up: short resume access codes remain rate-limited; links should be kept private and must not appear in analytics, logs, or third-party redirects.
- CI guard: `node --test tests/resume-link.test.cjs`.


## Idempotence and recovery

- Same `sha256 + role` upload in an existing project returns an existing asset (deduplicated); it does not create another file.
- If a file's metadata write fails, the new file is trashed as compensating action.
- A deleted asset is excluded immediately; if trashing fails, `cleanupPending` is returned and an identical delete request retries Drive cleanup.
- Existing project folder IDs remain authoritative. A missing historical folder does not silently produce a replacement with divergent data.
- Do **not** execute one-time `setup` with incompatible Sheets headers. The setup now rejects header drift rather than wiping historical rows.
- Autosaves serialize across navigation, preventing a step transition from silently skipping an in-flight write.

## Audit events

`ASSET_UPLOADED`, `ASSET_DEDUPLICATED`, `ASSET_DELETED`,
`DECK_INVALIDATED_BY_ASSET_CHANGE`, `DECK_INVALIDATED_BY_EDIT`,
`PROJECT_RESUMED`, `RESUME_CREDENTIALS_REJECTED`, `DECK_GENERATED`,
`DECK_GENERATION_FAILED`.

No raw access codes, tokens, base64, image blobs or PDF contents belong in logs.

## Deployment gate (not yet executed)

- CI: `node --test tests/asset-engine.test.cjs` (isolated mocks + source contracts).
- Apps Script smoke: backup current Properties and sheet headers, run `setupAfriGreen24PitchDeck()` only after confirming existing configuration; validate the `Assets` tab and previously generated project records.
- With a paid synthetic project, test upload, dedup, list, access denial, resume, delete, stale-deck invalidation, image placement and Slides/PDF viewing as the recipient.
- Inject a Drive sharing failure and verify that the canonical output URLs remain unchanged.
- Review Drive root permissions and sharing policies (Drive may inherit access from parent folders).
- No direct push/deploy to production without a separate release validation.

## Known limits and next phases

- V1 **does not** parse uploaded PDF/DOC/DOCX or perform OCR. Add a separately gated import/extraction workflow with evidence, preview and user confirmation.
- Images are mapped to three slide layouts. Extending traction, impact and gallery layouts requires explicit design and tests.
- Signature verification is a file-type guard, **not** antivirus or content disarm. Scan untrusted documents before any conversion/extraction.
- Asset digest dedup is scoped to one project and role; changing the role is intentionally a separate asset.
- A short project resume code is protected by throttling; long-term authentication should adopt the platform's canonical user identity before public scale.
- V1 archives superseded generated files; a future retention policy can garbage-collect only after ownership and audit checks.
- Current uploader sends one small file per RPC, not resumable multipart uploads.

## Release policy

Branch: `feature/asset-engine-v1-20261008`.

The changes must be reviewed and tested via PR before any Apps Script deployment. A merged GitHub commit is not evidence of runtime deployment success.
