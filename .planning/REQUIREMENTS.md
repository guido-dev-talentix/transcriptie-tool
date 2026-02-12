# Requirements: Search X — Meeting Intelligence Platform

**Defined:** 2026-02-12
**Core Value:** Na elke vergadering weet het hele team automatisch wat er is besproken, besloten en wie wat moet doen — zonder dat iemand een verslag hoeft te schrijven.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Organisatie

- [ ] **ORG-01**: Gebruiker kan mappen aanmaken om projecten te groeperen (1 laag diep)
- [ ] **ORG-02**: Gebruiker kan projecten verplaatsen naar een map
- [ ] **ORG-03**: Gebruiker kan mappen hernoemen en verwijderen
- [ ] **ORG-04**: Gebruiker kan full-text zoeken over alle transcripties binnen een project
- [ ] **ORG-05**: Zoekresultaten tonen transcriptnaam, datum en relevante tekstfragmenten

### Dashboard

- [ ] **DASH-01**: Gebruiker ziet bij openen project direct de cumulatieve "Stand van Zaken"
- [ ] **DASH-02**: Dashboard toont aantal en lijst van open actiepunten
- [ ] **DASH-03**: Dashboard toont recente besluiten (laatste 5-10)
- [ ] **DASH-04**: Dashboard toont overzicht van recente transcripties/vergaderingen

### Verwerking

- [ ] **VERW-01**: Upload flow toont duidelijke verwerkingsopties (transcript, besluiten, actiepunten, verslag) met verbeterde UX
- [ ] **VERW-02**: Gebruiker kan actiepuntstatus wijzigen (open/in behandeling/afgerond)
- [ ] **VERW-03**: Gebruiker kan actiepunt toewijzen aan een projectlid
- [ ] **VERW-04**: Overzicht toont actiepunten gefilterd op status en toegewezen persoon

### Integraties

- [ ] **INTG-01**: Gebruiker kan een actiepunt naar Asana pushen als taak (eenrichting)
- [ ] **INTG-02**: Asana-taak bevat beschrijving, deadline en link terug naar bron-transcriptie
- [ ] **INTG-03**: Gebruiker kan Asana-workspace en -project selecteren als bestemming

### Samenwerking

- [ ] **SAME-01**: Gebruiker kan leden eenvoudig toevoegen aan en verwijderen uit een project
- [ ] **SAME-02**: Gebruiker kan een deelbare link genereren voor een transcriptie of verslag
- [ ] **SAME-03**: Deelbare link werkt voor ontvangers met of zonder account (configureerbaar)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### RAG Chat

- **CHAT-01**: Gebruiker kan chatten op basis van alle transcripties binnen een project
- **CHAT-02**: Chat geeft bronverwijzingen naar specifieke transcripties
- **CHAT-03**: Chat kent de cumulatieve "Stand van Zaken" als context

### Audio & Media

- **AUDI-01**: Audio playback met transcript-synchronisatie (klik op regel, hoor audio)
- **AUDI-02**: Woordniveau timestamps opslaan van AssemblyAI

### Kalender

- **KALE-01**: Google Calendar read-only koppeling voor meeting-context
- **KALE-02**: Automatisch vergaderingtitel en deelnemers koppelen aan transcriptie

### Geavanceerd

- **GEVR-01**: Project hierarchy rollups (parent aggregeert child-status)
- **GEVR-02**: Smart meeting templates (standup, retro, etc.)
- **GEVR-03**: Export polish (PDF, samenvatting inclusief)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Google Meet inbel-bot | Enorme infrastructuurcomplexiteit, GDPR-zorgen, telefoonopname werkt |
| Video opname/playback | Dure opslag, waarde zit in transcript niet in video |
| Sales intelligence | Ander persona, drukke markt |
| Sentiment analyse | Privacyzorgen, niet actionable voor projectmanagement |
| Meeting scheduling | Andere productcategorie, goed bediend door bestaande tools |
| Real-time collaborative notes | Extreme complexiteit, AI-samenvattingen dienen zelfde doel |
| Tweerichting Asana sync | Te complex voor v1, eenrichting push is voldoende |
| Complexe rolstructuur | Team is klein, iedereen moet alles kunnen |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ORG-01 | Phase 1 | Pending |
| ORG-02 | Phase 1 | Pending |
| ORG-03 | Phase 1 | Pending |
| ORG-04 | Phase 2 | Pending |
| ORG-05 | Phase 2 | Pending |
| DASH-01 | Phase 1 | Pending |
| DASH-02 | Phase 1 | Pending |
| DASH-03 | Phase 1 | Pending |
| DASH-04 | Phase 1 | Pending |
| VERW-01 | Phase 1 | Pending |
| VERW-02 | Phase 2 | Pending |
| VERW-03 | Phase 2 | Pending |
| VERW-04 | Phase 2 | Pending |
| INTG-01 | Phase 3 | Pending |
| INTG-02 | Phase 3 | Pending |
| INTG-03 | Phase 3 | Pending |
| SAME-01 | Phase 4 | Pending |
| SAME-02 | Phase 4 | Pending |
| SAME-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-02-12*
*Last updated: 2026-02-12 after roadmap creation*
