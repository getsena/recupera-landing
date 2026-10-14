---
name: session-start
description: Inicia una sesión de trabajo en recupera-landing. Verifica entorno e identidad, orienta sobre el estado del repo y corre el chequeo de salud antes de elegir tarea. Usar al comienzo de cada sesión.
---

# Session Start — recupera-landing

Sigue los pasos EN ORDEN. No saltes ninguno.

## Paso 1: Entorno e identidad

1. `pwd` — confirma que estás en la raíz de recupera-landing.
2. `git branch --show-current` y `git status --short`. Si hay cambios sin commitear, pregunta qué hacer antes de seguir.
3. Identidad. Ambas deben ser TUYAS, no las de otra persona ni las del equipo:
   ```bash
   git config user.name && git config user.email
   gh auth status
   ```
   Si `user.email` está vacío o es un correo `.local`, configúralo: `git config user.email "<tu correo>"`.
4. Versiones: si el repo tiene `.nvmrc`, `node -v` debe coincidir. El gestor de paquetes es **yarn** (hay `yarn.lock`; formato Berry).

## Paso 2: Estado del repo

1. `git fetch origin` y `git log --oneline -10 origin/dev`.
2. Si estás en `main` o `dev`, NO trabajes ahí: crea una rama de trabajo desde `dev` (ver CLAUDE.md, "Flujo de trabajo").
3. PRs y issues propios:
   ```bash
   gh pr list --author @me --state open
   gh issue list --assignee @me --state open --json number,title,labels
   ```
   Si tienes PRs abiertos hace más de una semana, avísalo antes de abrir uno nuevo.

## Paso 3: Chequeo de salud

1. `yarn install` si cambió `yarn.lock`.
2. `yarn tsc` (tipos) y `yarn lint`.

Si algo falla, DETENTE y repórtalo. No empieces trabajo nuevo sobre un repo roto.
NO ejecutes `yarn test:e2e` completo: apunta al sitio de producción (ver CLAUDE.md, "Gotchas").

## Paso 4: Reporte y confirmación

Presenta: rama actual, PRs propios abiertos, issues asignados y resultado del chequeo.
Pregunta qué tarea tomar. No empieces hasta que confirme. Un work-item por sesión.
