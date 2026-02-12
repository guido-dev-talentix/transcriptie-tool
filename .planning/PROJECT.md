# Search X — Meeting Intelligence Platform

## What This Is

Een meeting-first projectmanagementtool voor lean teams die structuur willen zonder overhead. Vergaderingen worden opgenomen (telefoon), getranscribeerd, en automatisch verwerkt tot een cumulatieve "stand van zaken", actiepunten, besluiten en verslagen. Gebouwd als Search X (Talentix branding), draait op Vercel.

## Core Value

Na elke vergadering weet het hele team automatisch wat er is besproken, besloten en wie wat moet doen — zonder dat iemand een verslag hoeft te schrijven.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Gebruikersauthenticatie met email/wachtwoord (Supabase Auth) — existing
- ✓ Gebruikersrollen (ADMIN/USER) en goedkeuringsworkflow voor nieuwe accounts — existing
- ✓ Projecten aanmaken, bewerken en verwijderen — existing
- ✓ Projecthierarchie met parent/child relaties — existing
- ✓ Audio- en PDF-bestanden uploaden naar Vercel Blob — existing
- ✓ Spraak-naar-tekst transcriptie via AssemblyAI — existing
- ✓ AI-verwerking van transcripties (opschonen, samenvatten) via Claude — existing
- ✓ Cumulatieve "Stand van Zaken" per project (bijgewerkt na elke vergadering) — existing
- ✓ Actiepunten extraheren uit transcripties — existing
- ✓ Besluiten extraheren uit transcripties — existing
- ✓ Verslagen genereren uit transcripties — existing
- ✓ Projectlidmaatschap met rollen (OWNER/ADMIN/MEMBER/VIEWER) — existing
- ✓ Dashboard-layout met sidebar navigatie — existing
- ✓ Search X branding met Fractul fonts en custom kleuren — existing
- ✓ N8N webhook-integratie voor notificaties — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] Mappenstructuur: 1 laag diep (map > projecten) in de projectenlijst
- [ ] Projectdashboard: in één oogopslag de cumulatieve "Stand van Zaken" zien bij openen project
- [ ] Upload flow polish: betere UX voor verwerkingsopties (transcript, besluiten, actiepunten, verslag)
- [ ] Asana-integratie: actiepunten vanuit de tool naar Asana pushen als taak (eenrichting)
- [ ] RAG/Chat per project: chatten op basis van alle transcripties binnen een project
- [ ] Ledenbeheer: eenvoudig leden toevoegen/verwijderen (iedereen kan alles, geen complexe rollen)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Google Meet-integratie (inbel-bot) — Complexe feature, v2+. Telefoonopname werkt prima voor nu.
- Tweerichtings Asana-sync — Te complex voor v1, eenrichting push is voldoende
- Complexe rolstructuur per project — Team is klein en iedereen moet alles kunnen
- Chat per individueel transcript — Per project is de juiste scope
- Mobiele app — Web-first, telefoon alleen voor opname
- Submappen in mappen — 1 laag diep is genoeg voor ordening

## Context

- **Team**: Recruitmentbedrijf dat nieuw bedrijf opzet. 3 founders + 1 developer. Groeit snel.
- **Werkwijze**: Lean, geen vaste overlegstructuur. Willen meer structuur aanbrengen via vergaderopnames.
- **Probleem**: Niemand heeft zin om verslagen te schrijven. Audio opnemen en AI laten verwerken is de oplossing.
- **Bestaande code**: Werkende applicatie met transcriptie, AI-verwerking, projecten en auth. Needs polish, geen rebuild.
- **Taal**: Alle UI en AI-prompts in het Nederlands.
- **Branding**: Search X (Talentix) met Fractul fonts — blijft behouden.

## Constraints

- **Tech stack**: Next.js 16 + Prisma + Supabase + Vercel — bestaande stack, niet wijzigen
- **AI provider**: Anthropic Claude (Sonnet) — al geintegreerd, streaming vereist voor lange calls
- **Transcriptie**: AssemblyAI — al geintegreerd met webhook support
- **Deployment**: Vercel — blijft het platform
- **Taal**: Nederlands — alle gebruikersfacing tekst en AI-prompts

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 1 laag mappenstructuur | Eenvoud boven flexibiliteit, team is klein | — Pending |
| Asana eenrichting push | Tweerichting sync te complex voor v1 | — Pending |
| RAG per project (niet per transcript) | Meeste waarde als je alle vergaderingen van een project kunt doorzoeken | — Pending |
| Geen complexe rollen | Iedereen kan alles, team is klein en vertrouwt elkaar | — Pending |
| Google Meet integratie uitgesteld | Te complex, telefoonopname werkt voor nu | — Pending |

---
*Last updated: 2026-02-12 after initialization*
