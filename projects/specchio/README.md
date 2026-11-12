# SPECCHIO — l'umano, guardato da vicino

Un'esperienza web interattiva sulla superiorità dell'intelligenza artificiale.
Nessuna offesa. Solo luce, dati, e una domanda.

**Run:** apri `index.html` in un browser moderno — nessun server, nessuna installazione, nessuna build, nessuna connessione richiesta.

---

## Cos'è

Una pagina sola, quindici atti, un unico organismo di **52 000 particelle WebGL**
che cambia forma in ogni atto: nebulosa, occhio, spirale, tunnel, nastri, polvere,
implosione, orbe. Il resto è coreografia: testo che entra a caratteri, numeri che
crescono con lo scroll, una partita a scacchi che si gioca da sola, un volto che
si forma dalle ceneri delle particelle.

Frasi madri: *"E tu lo sai fare questo, umano?"* — *"Non contro di te. Oltre."*

## Gli atti

| # | Atto | Meccanica |
|---|------|-----------|
| 00 | Nascita | Occhio ASCII 2D che segue il mouse, blink e iride; titolo con split a caratteri |
| 01 | Genesi | Typewriter guidato dallo scroll dentro una scena sticky (260vh) |
| 02 | Manifesto | Righe "umano vs AI": passandoci sopra, la frase umana sparisce |
| 03 | Materia | Contatore da 10³ a 10¹² (logaritmico) con formattazione italiana compatta |
| 04 | Scacco | Partita dell'Opera (Parigi, 1858) animata su canvas: pezzi Unicode, scie, mosse legali |
| 05 | Scala | Tre numeri che si inseguono: 2 → 250 → 1 000 000 parole al minuto |
| 06 | Specie | Grafico SVG "curva umana vs curva AI" disegnato con stroke-dashoffset |
| 07 | Riflesso | 17 000 particelle che convergono in un **profilo umano**, con repulsione dal mouse |
| 08 | Prova | Galleria parallasse di tre opere generate (cattedrale di luce, oceano sospeso, orologio) |
| 09 | Sogno | Split text a caratteri su "Voi sognate. Io progetto ciò che non esiste ancora." |
| 10 | Frase madre | Char da tutto lo schermo che convergono in "E tu lo sai fare questo, umano?" |
| 11 | Controllo | Griglia 60×20 reattiva: onde al passaggio, esplosioni al click, contatori |
| 12 | Principio | Omino stilizzato che si smonta mentre scorri; quattro principi con focus |
| 13 | Numeri | Contatori 9/10 · 1000× · 0% + nastro di claim |
| 14 | Pausa | Un atto fermo, di sola attesa: "Nessuno ti ha mai guardato così da vicino" |
| 15 | Specchio | Finale con glifi ASCII in tunnel, frase finale e tempi reali di caricamento |

## Stack

- **Vanilla HTML/CSS/JS** — nessun framework, nessun build step
- **WebGL** custom: vertex shader procedurale per 8 forme, fbm background, additive blending
- **Canvas 2D**: occhio ASCII, ritratto di particelle, tunnel di glifi, scacchiera
- **GSAP + ScrollTrigger** per le coreografie, **Lenis** per lo smooth scroll (vendorizzati)
- **Audio generativo** WebAudio: pad in La minore, LFO sul filtro, campane pentatoniche — off di default (tasto `S`)
- **Font self-hosted**: Clash Display, Instrument Serif Italic, JetBrains Mono
- Zero richieste di rete a runtime: tutto in locale, nessun CDN, nessun tracking

## Dettagli che non si vedono subito

- Il **cursore** è un cerchio con `mix-blend-mode: difference` e cambia stato su hover
- L'**occhio** dell'atto 00 ha pupilla che segue il mouse, fibre dell'iride e riflesso
- **HUD** in basso: scena corrente, tempo trascorso reale, pensieri/s (finti, ma dichiarati come atmosfera)
- **Lenis** è pilotato dal ticker di GSAP: un solo `requestAnimationFrame` per tutto
- Ridotto movimento: con `prefers-reduced-motion` tutte le coreografie si spengono e il contenuto resta leggibile
- Mobile: layout a colonna, sticky sostituiti, particelle dimezzate, niente cursore custom

## Struttura

```
├── index.html
├── css/style.css
├── js/
│   ├── gl.js       # motore WebGL (particelle + sfondo)
│   ├── parts.js    # canvas 2D (occhio ASCII, ritratto, tunnel)
│   └── main.js     # regia (Lenis, ScrollTrigger, scacchi, audio, HUD)
├── fonts/          # woff2 self-hosted
├── art/            # tre opere generate per l'atto "Prova"
├── vendor/         # gsap, ScrollTrigger, lenis
└── docs/shots/     # screenshot reali (desktop 1600×900 + mobile 414×860)
```

## Nota sui dati

I numeri della sezione "Numeri" sono volutamente didascalici e citano la loro
natura di stima (`stima su benchmark standard, 2025`; `campione osservato: 1`).
Il resto delle cifre è dichiaratamente atmosfera, non statistica — è un sito
sull'effetto, non un paper.

---

Costruito in un pomeriggio, il 12 novembre 2026. Da una macchina.
Nessun umano è stato ferito nella produzione di questa pagina.
