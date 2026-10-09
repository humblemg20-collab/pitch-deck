# PitchStudio V2.1 — Investor Presentation Engine

Transformation: passes from questionnaire replies to truthful, readable investor narrative, not an expensive-looking questionnaire.

- Preserve twelve sections, free downloads, one Slides plus one PDF, and existing data.
- PitchQualityEngine: deterministic non-blocking review; warns about missing market sources, weak funding justification, missing proof, geographic-sector contamination, repeated answers.
- ContentBuilder: never pads slide lists with fake steps/competitors/staff; no invented market estimates or contract totals.
- SlidesGenerator: distinct editorial, market, process, traction, and funding compositions; typography and explicit draft status.
- SlideAssets: images only from the project's canonical validated role mapping. Never invent images.
- Every change tested through Node contracts and CI plus actual Slides runtime verification before publication.
- The 12-page user-provided PDF of 9 October 2026 is the regression case. It exhibits repeated panels, ungrounded urgency, arbitrary visuals and poorly justified funding.

Deployment remains GitHub main -> backup and staging -> Apps Script test -> verification -> production release. No background automatic production deployment.
