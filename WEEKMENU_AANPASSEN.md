# Weekmenu aanpassen

Je hebt nu twee bestanden:

- `/Users/suzannescheerens/Documents/Website aan tafel bij san/weekmenu.txt`
- `/Users/suzannescheerens/Documents/Website aan tafel bij san/weekmenu-next.txt`

Zo werkt het:

1. Pas `weekmenu.txt` aan als je het huidige live menu wilt wijzigen
2. Pas `weekmenu-next.txt` aan als je alvast het volgende menu wilt klaarzetten
3. Vul in `weekmenu-next.txt` bij `publishAt` het moment in waarop het menu live moet gaan
4. Sla het bestand op
5. De website zet het volgende menu automatisch live zodra `publishAt` is bereikt

Handig om te weten:

- De vaste gegevens staan in `weekmenu-next.txt` al voor je ingevuld
- Je hoeft meestal alleen `publishAt`, `weekLabel`, `servingDate`, `tagline`, `dishTitle`, `dishDescription`, `invitation` en `priceText` aan te passen

Voorbeeld:

```txt
weekLabel: Weekmenu 17
servingDate: woensdag 15 april
dishTitle: Lasagne bolognese
dishDescription: met frisse salade en kruidenboter
priceText: € 13,50 per persoon
```

Voorbeeld van automatisch live zetten op zondag 11:00:

```txt
publishAt: 2026-04-12T11:00:00+02:00
```

Belangrijk:

- Laat de woorden links van de `:` staan
- Laat elke regel op een nieuwe regel staan
- Gebruik voor `whatsappNumber` alleen cijfers, zonder spaties of `+`
- Laat een regel in `weekmenu-next.txt` leeg als die gelijk moet blijven aan het huidige menu

De website leest automatisch `weekmenu.txt` in en schakelt automatisch over naar `weekmenu-next.txt` zodra `publishAt` is bereikt.
