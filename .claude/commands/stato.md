---
description: Aggiorna docs/STATO.md e dice a ogni agente cosa può fare adesso
---

Aggiorna la bacheca del progetto. Contesto aggiuntivo: $ARGUMENTS

## 1. Leggi la realtà, non la bacheca

Non fidarti di quello che `docs/STATO.md` dice già. Verifica sul campo:

- quali file esistono in `docs/` e se sono completi o abbozzati
- cosa c'è in `src/`
- `git log` degli ultimi commit
- se i test esistono e se passano

## 2. Determina la fase reale

`BRIEF → PRD → DESIGN+CONTRATTO → BUILD → QA → RILASCIO`

Una fase è completa solo se il suo artefatto esiste **ed è stato approvato**
(i checkpoint li segna l'umano, non tu: se non risulta approvato, non darlo
per approvato).

## 3. Riscrivi `docs/STATO.md`

Compila in particolare le due sezioni che contano:

**Sbloccati adesso** — per ogni agente che può procedere, una riga con il
ruolo e il task concreto, riferito a un documento. Non "continua il frontend",
ma "implementa le schermate 1-4 di `docs/flussi.md`".

**Bloccati** — chi è fermo e su cosa esattamente. Se qualcuno è bloccato per
colpa di un documento incompleto, scrivi quale riga manca.

Aggiungi una riga al Registro con la data di oggi.

## 4. Riporta

Mostra all'utente, in forma breve: fase corrente, chi può partire e con che
comando, chi è bloccato e perché.

Se un agente è sbloccato, ricorda all'utente che gli basta aprire quel
riquadro e scrivere "procedi": l'agente leggerà da solo `docs/STATO.md`.
