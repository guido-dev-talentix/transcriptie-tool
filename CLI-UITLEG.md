# Transcripties ophalen in de terminal

Met het `transcriptie`-commando haal je transcripties op zonder de app te openen
en zonder knippen en plakken. Handig in de terminal, en vooral handig in een
Claude Code-sessie: je kunt Claude vragen "pak de laatste transcriptie erbij"
en dan heeft hij de tekst meteen.

Je hebt twee dingen nodig: het script en een persoonlijk token.

## Eenmalig instellen

### 1. Token aanmaken

Ga naar https://transcriptie-tool-liard.vercel.app/profile → **CLI-tokens** →
**Nieuw token**. Geef het een naam waaraan je later herkent waar het draait
(bijvoorbeeld "laptop Tess").

Het token wordt één keer getoond. Kopieer het meteen — daarna is het niet meer
op te vragen. Kwijt? Dan trek je het oude in en maak je een nieuw token aan.

### 2. Script neerzetten

Kopieer `scripts/cli.mjs` uit deze repo naar je eigen machine, bijvoorbeeld naar
`~/bin/transcriptie.mjs`. Meer heb je niet nodig: geen repo, geen database,
geen `npm install`. Node 18 of nieuwer volstaat.

### 3. Token en commando instellen

Zet dit in je `~/.zshrc`:

```bash
export TRANSCRIPTIE_TOKEN=txt_hier_jouw_token
alias transcriptie='node ~/bin/transcriptie.mjs'
```

Daarna `source ~/.zshrc` (of een nieuw terminalvenster openen). Klaar.

## Gebruik

```bash
transcriptie list                    # de 20 meest recente transcripties
transcriptie list -n 50              # meer resultaten
transcriptie laatste                 # tekst van de nieuwste transcriptie
transcriptie zoek "onboarding"       # zoekt ook binnen de transcripttekst zelf
transcriptie get cmsndip2m           # tekst van één transcriptie
```

Bij `list` en `zoek` krijg je per regel het id, de datum, de duur, de status en
de titel. Dat id gebruik je bij `get` — een paar tekens is genoeg, je hoeft niet
het hele id over te typen.

`get` heeft een paar varianten:

```bash
transcriptie get cmsndip2m --samenvatting   # alleen de AI-samenvatting
transcriptie get cmsndip2m --raw            # ruwe tekst, vóór het opschonen
transcriptie get cmsndip2m --srt            # ondertitels met tijdcodes
transcriptie get cmsndip2m --meta           # alleen titel, datum en project
```

De tekst gaat naar stdout en de titelregel naar stderr. Daardoor kun je de
uitvoer doorsluizen zonder rommel ertussen:

```bash
transcriptie laatste > gesprek.txt
transcriptie get cmsndip2m | pbcopy
```

## Wat je te zien krijgt

Een token geeft precies toegang tot wat jij ook in de app ziet — niet meer.
Transcripties die iemand als privé heeft gemarkeerd blijven voor jou onzichtbaar
in de lijst, en direct opvragen levert "niet gevonden" op. Je eigen privé-
transcripties zie je wel, herkenbaar aan het slotje.

## Als het niet werkt

**"Geen verbinding mogelijk"** — `TRANSCRIPTIE_TOKEN` is niet gezet. Controleer
met `echo $TRANSCRIPTIE_TOKEN` of je terminal het token kent; zo niet, open een
nieuw venster of doe `source ~/.zshrc`.

**"Token ongeldig of ingetrokken"** — het token bestaat niet meer, of er is een
tikfout in geslopen. Maak een nieuw token aan onder Mijn Profiel.

**"Meerdere transcripties matchen"** — je id-prefix is te kort. Neem een paar
tekens meer.

## Voor beheerders

Een token is gekoppeld aan één gebruiker en werkt alleen zolang dat account
goedgekeurd is. In de database staat uitsluitend een SHA-256-hash van het token,
dus het token zelf is niet uit de database terug te halen. Intrekken kan direct
onder Mijn Profiel → CLI-tokens → Intrekken; dat werkt onmiddellijk.

Op Guido's machine draait de CLI zonder token rechtstreeks tegen de database
(via `DATABASE_URL` uit `.env.local`). Zodra `TRANSCRIPTIE_TOKEN` gezet is,
gebruikt de CLI altijd de API. Wijst de tool ooit naar een andere omgeving, dan
kan dat met `TRANSCRIPTIE_URL`.
