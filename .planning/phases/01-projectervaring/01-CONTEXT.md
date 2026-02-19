# Phase 1: Projectervaring - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Mappen toevoegen aan de projectenlijst, projectdashboard bouwen met Stand van Zaken en overzichten, en de upload flow polijsten. Subprojecten-concept wordt vervangen door mappen. Gebruikers vinden hun projecten georganiseerd en zien direct de stand van zaken bij het openen van een project.

</domain>

<decisions>
## Implementation Decisions

### Mappenweergave
- Uitklapbare boom in de projectenlijst: mappen als uitklapbare items met projecten eronder
- Huidige subprojecten-concept wordt verwijderd — mappen vervangen dit als organisatielaag
- Drag-and-drop om projecten naar mappen te verplaatsen
- "+ Nieuwe map" knop naast de bestaande "+ Nieuw project" knop
- Contextmenu (rechtermuisklik) voor hernoemen en verwijderen van mappen
- Bij verwijderen van een map met projecten: projecten worden losse projecten (terug naar root)

### Dashboard indeling
- Stand van Zaken als hero sectie bovenaan — groot en prominent, het eerste dat je ziet
- Top 10 open actiepunten en recente besluiten, met "Bekijk alle" link
- Recente vergaderingen als compacte lijst: titel, datum en korte samenvatting — klik voor detail

### Upload flow
- Verwerkingsopties als checkboxes direct op het upload scherm (geen wizard)
- Standaard alleen "Transcript opschonen" aangevinkt, overige opties (besluiten, actiepunten, verslag) uit
- Eén bestand per keer uploaden

### Projectenlijst
- Mappen bovenaan, losse projecten eronder
- Projecten tonen: naam, status badge en datum (vereenvoudigd — geen aantallen meer)
- Mappen tonen: map-icoon + naam + aantal projecten erin
- Geen zoek/filterfunctie nodig in deze fase

### Claude's Discretion
- Dashboard layout keuze (grid vs kolommen vs mix)
- Voortgangsfeedback na uploaden (inline vs redirect)
- Exacte styling en spacing van mappen en dashboard componenten

</decisions>

<specifics>
## Specific Ideas

- "Subprojecten werken niet want je kan er geen transcripties naar uploaden — die moeten eruit"
- Projectenlijst moet schoner en eenvoudiger (minder metadata per project)
- Stand van Zaken moet het meest prominente element zijn op het dashboard

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-projectervaring*
*Context gathered: 2026-02-19*
