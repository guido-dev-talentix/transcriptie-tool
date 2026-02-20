# Roadmap: Search X — Meeting Intelligence Platform

## Overview

Search X is a working meeting intelligence tool that needs polish, not a rebuild. The 19 v1 requirements cluster into four delivery phases: first making project navigation and dashboards excellent, then building out action item management and search, then connecting to Asana, and finally enabling collaboration through member management and sharing. Each phase delivers a complete, usable capability on top of the existing codebase.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (e.g., 2.1): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Projectervaring** - Folders, dashboard en upload UX zodat gebruikers direct overzicht hebben
- [ ] **Phase 2: Actiepunten & Zoeken** - Actiepunten beheren door hun lifecycle heen en transcripties doorzoeken
- [ ] **Phase 3: Asana-integratie** - Actiepunten naar Asana pushen als taken
- [ ] **Phase 4: Samenwerking** - Leden beheren en content delen via links

## Phase Details

### Phase 1: Projectervaring
**Goal**: Gebruikers openen de app en vinden hun projecten georganiseerd in mappen, met een dashboard dat direct de volledige stand van zaken toont
**Depends on**: Nothing (first phase)
**Requirements**: ORG-01, ORG-02, ORG-03, DASH-01, DASH-02, DASH-03, DASH-04, VERW-01
**Success Criteria** (what must be TRUE):
  1. Gebruiker kan een map aanmaken, hernoemen en verwijderen, en projecten erin plaatsen (1 laag diep)
  2. Bij openen van een project ziet de gebruiker direct de cumulatieve "Stand van Zaken", open actiepunten, recente besluiten en recente vergaderingen op het dashboard
  3. De upload flow toont duidelijke verwerkingsopties (transcript, besluiten, actiepunten, verslag) met verbeterde UX ten opzichte van de huidige situatie
  4. Projectenlijst toont mappen met hun projecten erin, en losse projecten daarbuiten
**Plans**: 2 plans

Plans:
- [ ] 01-01-PLAN.md -- Folder data model, API endpoints, projects list with folders/drag-and-drop/context menu
- [ ] 01-02-PLAN.md -- Project dashboard restructured with SVZ hero, upload flow with pre-upload processing options

### Phase 2: Actiepunten & Zoeken
**Goal**: Gebruikers kunnen actiepunten beheren (status, toewijzing, filtering) en full-text zoeken over alle transcripties binnen een project
**Depends on**: Phase 1 (dashboard toont actiepunten, projectstructuur staat)
**Requirements**: VERW-02, VERW-03, VERW-04, ORG-04, ORG-05
**Success Criteria** (what must be TRUE):
  1. Gebruiker kan de status van een actiepunt wijzigen (open / in behandeling / afgerond)
  2. Gebruiker kan een actiepunt toewijzen aan een projectlid en filteren op status en persoon
  3. Gebruiker kan full-text zoeken over alle transcripties binnen een project en ziet transcriptnaam, datum en relevante fragmenten in de resultaten
**Plans**: TBD

Plans:
- [ ] 02-01: Actiepuntbeheer (status, toewijzing, filtering)
- [ ] 02-02: Full-text zoeken over transcripties

### Phase 3: Asana-integratie
**Goal**: Gebruikers kunnen actiepunten als taken naar Asana pushen zonder de tool te verlaten
**Depends on**: Phase 2 (actiepunten moeten status en toewijzing hebben)
**Requirements**: INTG-01, INTG-02, INTG-03
**Success Criteria** (what must be TRUE):
  1. Gebruiker kan een Asana-workspace en -project selecteren als bestemming voor actiepunten
  2. Gebruiker kan een actiepunt naar Asana pushen; de Asana-taak bevat beschrijving, deadline en link terug naar de bron-transcriptie
  3. Gebruiker ziet of een actiepunt al naar Asana is gepusht (sync-status zichtbaar)
**Plans**: TBD

Plans:
- [ ] 03-01: Asana OAuth en configuratie (workspace/project selectie)
- [ ] 03-02: Actiepunt-naar-Asana push met sync-status

### Phase 4: Samenwerking
**Goal**: Gebruikers kunnen teamleden beheren en content delen via links, ook met mensen zonder account
**Depends on**: Phase 1 (projectstructuur moet staan)
**Requirements**: SAME-01, SAME-02, SAME-03
**Success Criteria** (what must be TRUE):
  1. Gebruiker kan leden toevoegen aan en verwijderen uit een project
  2. Gebruiker kan een deelbare link genereren voor een transcriptie of verslag
  3. Deelbare link werkt voor ontvangers met en zonder account (configureerbaar per link)
**Plans**: TBD

Plans:
- [ ] 04-01: Ledenbeheer (toevoegen/verwijderen projectleden)
- [ ] 04-02: Deelbare links voor transcripties en verslagen

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Projectervaring | 0/2 | Not started | - |
| 2. Actiepunten & Zoeken | 0/2 | Not started | - |
| 3. Asana-integratie | 0/2 | Not started | - |
| 4. Samenwerking | 0/2 | Not started | - |
