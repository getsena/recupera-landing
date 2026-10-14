---
name: progress-tracker
description: Cierra una sesión en recupera-landing. Commitea, sube la rama, abre el PR contra dev, pide review a los owners y deja el progreso en el issue. Usar al terminar o cuando se pida guardar el progreso.
---

# Progress Tracker — recupera-landing

El progreso vive en GitHub (issue y PR). NO escribas archivos de progreso locales ni memoria local.

## Paso 1: Verifica antes de commitear

1. `git branch --show-current` — debe ser una rama de trabajo (`feat/`, `fix/`, `chore/`, `hotfix/`). Si es `main` o `dev`, DETENTE.
2. `git status --short` — revisa que solo estén los archivos esperados del work-item.
3. Un PR cubre un solo tema. Si la rama mezcla temas (por ejemplo, un post de blog junto con cambios de copy), propón dividirla antes de abrir el PR.

## Paso 2: Commit

Formato `tipo(scope): descripción #N`. El subject va en minúscula (commitlint rechaza la mayúscula inicial), el header no pasa de 100 caracteres y las líneas del cuerpo, de 100. Tipos válidos: feat, fix, hotfix, refactor, docs, test, chore, perf, ci, build, style, revert.

Los hooks de husky validan el mensaje (commitlint) y corren chequeos antes del push. Si el pre-push se cuelga o falla, NO uses `--no-verify`: detente y repórtalo (el mismo chequeo corre en CI).

## Paso 3: Push y PR

```bash
git push -u origin <rama>
gh pr create --base dev --title "<tipo(scope): descripción>" --body-file <cuerpo>
```

El cuerpo sigue `.github/pull_request_template.md`, incluye `Closes #N` y, si hay cambios visuales, el enlace al preview de Vercel.

## Paso 4: Confirma que el PR es visible para los owners

```bash
gh pr view --json number,url,reviewRequests,mergeStateStatus
```

- `reviewRequests` debe listar a los owners (lo asigna CODEOWNERS). Si está vacío, avisa al dev: algo falla en CODEOWNERS.
- NO mergees el PR. Solo los owners mergean, y aunque la interfaz lo permitiera, no lo hagas.
- NUNCA uses `--no-verify`. Si un hook se cuelga o falla, detente y repórtalo en el PR.

## Paso 5: Comenta el progreso en el issue

```bash
gh issue comment <N> --body "<qué se hizo, qué falta, enlace al PR>"
```

Sé honesto con lo incompleto. Incluye lo suficiente para que otra sesión continúe sin adivinar.

## Paso 6: Aprendizajes

Si surgió algo que debe persistir (convención, gotcha), agrégalo al `CLAUDE.md` del repo EN EL MISMO PR. No lo guardes como memoria local.
