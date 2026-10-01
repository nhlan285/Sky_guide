# Sky Guide — Architecture v1

> **Status:** APPROVED  
> **Approved date:** 2026-10-01  
> **Editable visual source of truth:** [Figma — Sky Guide](https://www.figma.com/design/pWmhAgMtwUWZBttexqoT6R/Sky-Guide)  
> **Technical source of truth:** this repository  
> **Drive approved archive:** [Architecture_Approved / 2026-10-01](https://drive.google.com/drive/folders/1QIoyhlh_P7Bk6rDlq4G4NoXNLbpgt8YD)

This directory freezes the architecture set approved on 2026-10-01. The PNG files are review snapshots exported from the approved Figma frames. Figma remains the editable master; GitHub snapshots exist so implementation can be reviewed against the architecture version committed with the code.

## Approved diagrams

| Diagram | Figma page | Editable master | GitHub snapshot | Status |
|---|---|---|---|---|
| Project Overview | 00 - Overview | [Figma](https://www.figma.com/design/pWmhAgMtwUWZBttexqoT6R/Sky-Guide?node-id=11-2) | [snapshot](./diagrams/00-project-overview.png) | Approved |
| High-Level Architecture | 01 - Architecture | [Figma](https://www.figma.com/design/pWmhAgMtwUWZBttexqoT6R/Sky-Guide?node-id=5-2) | [snapshot](./diagrams/01-high-level-architecture.png) | Approved |
| Frontend Internal Architecture | 01 - Architecture | [Figma](https://www.figma.com/design/pWmhAgMtwUWZBttexqoT6R/Sky-Guide?node-id=15-2) | [snapshot](./diagrams/02-frontend-internal.png) | Approved |
| Deployment / Runtime / PWA | 01 - Architecture | [Figma](https://www.figma.com/design/pWmhAgMtwUWZBttexqoT6R/Sky-Guide?node-id=15-73) | [snapshot](./diagrams/03-deployment-runtime-pwa.png) | Approved |
| Hub Info Architecture | 02 - Hub Info | [Figma](https://www.figma.com/design/pWmhAgMtwUWZBttexqoT6R/Sky-Guide?node-id=16-2) | [snapshot](./diagrams/04-hub-info.png) | Approved |
| Wardrobe 2D Architecture | 03 - Wardrobe | [Figma](https://www.figma.com/design/pWmhAgMtwUWZBttexqoT6R/Sky-Guide?node-id=17-2) | [snapshot](./diagrams/05-wardrobe-2d.png) | Approved |
| Data Flow Architecture | 04 - Data Sources | [Figma](https://www.figma.com/design/pWmhAgMtwUWZBttexqoT6R/Sky-Guide?node-id=18-2) | [snapshot](./diagrams/06-data-flow.png) | Approved |
| Source Governance / Legal Boundary | 04 - Data Sources | [Figma](https://www.figma.com/design/pWmhAgMtwUWZBttexqoT6R/Sky-Guide?node-id=18-66) | [snapshot](./diagrams/07-source-governance-legal.png) | Approved |
| Evolution & Account Migration | 05 - Notes | [Figma](https://www.figma.com/design/pWmhAgMtwUWZBttexqoT6R/Sky-Guide?node-id=19-2) | [snapshot](./diagrams/08-evolution-account-migration.png) | Approved |

## Architecture rules frozen in v1

- Release 1 public features do not require login.
- Public Hub/domain logic stays independent of user identity.
- Wardrobe business logic/rendering stays independent of account storage.
- User state starts local-first through a storage abstraction; future cloud sync is additive.
- Public catalog uses versioned/validated data with provenance and review gates.
- K14 leak intake stays manual/reviewed; no automatic leak publishing.
- Full 3D/game assets remain behind the TGC permission/legal gate; self-created placeholders remain the fallback.
- Discord Bot is a planned read channel over approved/public data, not an ingestion path.
- Optional Auth/User DB/API/cache/workers are future growth paths, not Release 1 requirements.

## Change control

After this approval checkpoint, a material architecture change should:
1. be recorded in the Notion Decision Log,
2. update the editable Figma master,
3. refresh the affected snapshot(s) here,
4. update technical docs/tasks when the change affects implementation.

Do not treat a newer Figma edit as implementation-approved until the corresponding decision/status is recorded.

## Related technical docs

- [Architecture](../ARCHITECTURE.md)
- [Implementation Plan](../plan/IMPLEMENTATION_PLAN.md)
- [Legal Status](../LEGAL_STATUS.md)
