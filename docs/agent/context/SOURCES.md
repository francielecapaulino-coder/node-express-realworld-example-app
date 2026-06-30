# SOURCES — Conduit Backend

Fontes registradas para este projeto. ADR e DESIGN são `authoritative` por padrão.
SKILL: o `description` é o gatilho casado com a intenção das unidades de trabalho.

| Caminho | Tipo | Autoridade | Status | Escopo / gatilho |
|---|---|---|---|---|
| `documentação/GUIA-DE-REFATORACAO.md` | prd | authoritative | in-repo (não commitado) | Documento-fonte de verdade; governa todas as slices; §2 corrige premissas do documento-fonte externo |
| `src/prisma/schema.prisma` | outro | authoritative | in-repo | Schema de banco; toda mudança de entidade referencia este arquivo |
| `README.md` | outro | reference | in-repo | Setup, seed, deploy básico |
| `src/app/routes/article/article.controller.ts` | outro | reference | in-repo | Referência de padrão de controller (rotas, auth, envelopes) para §4.2 e §4.5 |
| `src/app/routes/article/article.service.ts` | outro | reference | in-repo | Referência de padrão de service + lógica de favoritos (linhas ~562–652) para §4.2 e §4.5 |
| `src/main.ts` | outro | reference | in-repo | Entry point; error handler global (3 ramificações); alvo de §4.3 e decisão §4.4 |

## ADRs (a criar conforme o projeto evolui)
Nenhuma ADR registrada ainda. Criar em `docs/adr/` quando uma decisão arquitetural
afetar >= 2 fases ou >= 2 módulos (ex.: separação app/server, estratégia de harness,
upgrade de framework).

## SKILLs disponíveis
Ver `docs/agent/context/SKILLS.md` — registry completo de skills Coda disponíveis,
mapeamento por fase do roadmap, skills ausentes e constraints de uso.

Registro detalhado por etapa (prompts + comentários): `documentação/PROMPTS-AND-SKILLS.md`
(não commitado — §13 do guia).

## DESIGN
Não aplicável — projeto backend sem frontend.
