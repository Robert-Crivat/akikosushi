---
description: Parte dal brief del cliente e porta il progetto fino al primo checkpoint approvato
---

Avvia un nuovo progetto partendo dal brief: $ARGUMENTS

Segui questa sequenza **fermandoti a ogni checkpoint**. Non superarne nessuno
da solo.

## 1. Brief

Leggi il brief. Identifica cosa manca per poter scrivere una specifica
eseguibile — non cosa sarebbe bello sapere, cosa è **necessario**.

Fai le domande all'utente in un blocco solo, non una alla volta. Se il brief è
già completo su un punto, non chiederlo.

## 2. PRD

Con le risposte, scrivi `docs/PRD.md` seguendo la struttura definita in
`.claude/agents/pm.md`.

**→ CHECKPOINT 1.** Presenta il PRD e fermati. Attendi approvazione esplicita.

## 3. Design e contratto, in parallelo

Solo dopo l'approvazione del PRD. Queste due cose non dipendono l'una
dall'altra, quindi partono insieme:

- design system + flussi (agente `design`)
- contratto API + schema dati (agente `backend`)

**→ CHECKPOINT 2.** Presenta entrambi e fermati.

Da qui in poi il contratto è congelato: chi lo cambia scrive una ADR.

## 4. Implementazione

Solo dopo l'approvazione. Frontend e backend procedono in parallelo, ognuno
sul proprio contratto. Il QA scrive i test man mano, non alla fine.

## Regola generale

Se a un certo punto scopri che un documento approvato è sbagliato, **fermati e
dillo**. Non aggiustarlo in corsa e non lavorarci sopra sperando che regga.
