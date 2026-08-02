---
description: Verifica che tutto sia pronto per il rilascio e prepara la release. Non rilascia da solo.
---

Prepara il rilascio. Argomenti: $ARGUMENTS

## 1. Stato del repo

Verifica ed elenca: branch corrente, modifiche non committate, commit da
rilasciare rispetto all'ultimo tag.

Se ci sono modifiche non committate, fermati e segnalalo.

## 2. Gate automatici

Esegui, in quest'ordine, **riportando l'output reale**:

- lint
- type-check
- test unitari
- test di integrazione
- test end-to-end
- regressione visiva
- accessibilità (axe)
- build di produzione

Se anche uno solo fallisce: **fermati qui**. Riporta l'errore così com'è, non
riassunto e non addolcito. Non proporre di saltarlo.

## 3. Rapporto pre-rilascio

Se tutti i gate passano, presenta:

- versione proposta e perché (dai commit: patch / minor / major)
- changelog leggibile da un umano, non l'elenco dei commit
- cosa cambia per l'utente finale
- migrazioni database presenti? sono reversibili?
- cosa fare se va storto (dal `docs/runbook.md`)

## 4. Fermati

**→ CHECKPOINT 3.** Il rilascio in produzione lo autorizza l'umano, sempre.
Anche per un hotfix. Anche se "è solo un CSS".

Dopo l'autorizzazione: tag, push, e la pipeline fa il resto. Non fare deploy a
mano.
