# Guia Operacional do Agente

Contrato de trabalho deste projeto. Todo agente lê este arquivo antes de agir.

## Ciclo de trabalho
Understand → Audit → Plan → Implement → Verify → Fix → Document → Report

## Máquina de estados de uma unidade de trabalho
DISCOVERY → PLANNED → IMPLEMENTING → EVALUATING → FIXING → DOCUMENTING → READY

## Princípios inegociáveis
1. Não inventar contexto de produto, stack, entidades, APIs ou fases.
2. Nunca usar segredos, credenciais ou dados sensíveis reais em código, testes,
   exemplos ou docs.
3. Manter o trabalho pequeno, auditável e reversível.
4. Toda mudança de comportamento tem critério de aceite + verificação.
5. Todo fluxo sensível identifica dados, permissões, auditabilidade e
   necessidade de revisão humana ANTES da implementação.
6. Atualizar a documentação quando comportamento, arquitetura, API, postura de
   segurança ou processo mudarem.
7. Nunca fabricar APIs, padrões ou comportamentos. Incerteza > invenção.

## Knowledge Verification Chain (ordem obrigatória ao decidir algo técnico)
1. Codebase — código, convenções e padrões já em uso no projeto.
2. Docs & context inputs — README, docs/, ADRs, PRDs, e os context inputs
   registrados (DESIGN.md / SKILL.md), quando presentes. Quando presentes, são
   autoritativos: siga-os e não os contrarie.
3. Resolvedor de biblioteca (Context7 MCP ou equivalente) — resolver o ID da
   lib e consultar a API/padrões atuais.
4. Busca na web — docs oficiais, fontes confiáveis.
5. Sinalizar como incerto — "não tenho certeza sobre X; aqui está meu raciocínio,
   mas verifique". Nunca pular para o passo 5 se 1–4 estão disponíveis.

## Categorias de risco (fronteira de confiança — classifique de D para A; o primeiro match vence)
- D — Crítico: primitivas de cripto, KDF, assinatura, RNG de segurança, dados
  regulados (LGPD/GDPR/HIPAA/PCI) em runtime, protocolos de segurança próprios.
- C — Alto: auth/authz, sessões/tokens/JWT/OAuth, secrets, path traversal,
  upload/download com input, shell/subprocess com input, SSRF, CORS/CSP,
  webhook signatures, rate-limiting de endpoint público. Remover um check de
  segurança também é C.
- B — Médio: muda estado ou comportamento visível ao usuário sem cruzar
  fronteira de auth/secrets — escrita em path fixo validado, API interna
  autenticada, migração não-destrutiva, paginação/filtro.
- A — Baixo: não cruza fronteira de confiança — refatoração interna, docs,
  config local de path fixo, parsing de formato público, geração estática.
Regra: classifique pela MAIOR categoria. Na dúvida entre duas, escolha a maior.

## Caminhos operacionais (governança proporcional ao risco)
- trivial_path — docs/typo/comentário/formatação, sem tocar código executável:
  declaração de 3 itens em PROGRESS.md (descrição + risk_category: A +
  atestação de que não toca código/config sensível).
- fast_path_A — Categoria A, mudança pequena: PLAN.md mínimo + PROGRESS.md +
  Model Profile mínimo.
- standard_path_B — Categoria B: Pre-Flight Checklist completo + PLAN.md +
  Model Profile + PROGRESS.md + REVIEW.md (avaliação).
- strict_path_C_D — Categoria C/D: tudo do B MAIS security_reviewer +
  >= 4 deterministic gates + human_review: required + ADR quando arquitetural
  (D exige especialista). LLM nunca é a autoridade final em D.
Guardrails: qualquer sinal de C/D força strict_path. Se o diff sair do escopo
do caminho declarado, aborte e reclassifique. Na dúvida, escale para o caminho
mais alto.

## Papéis (um papel por turno, com handoff entre turnos)
planner → builder → evaluator → reviewer/security_reviewer → closer.

## Deterministic gates (verificações reproduzíveis, sem julgamento de LLM)
Válidos: build, unit_tests, integration_tests, contract_tests, lint, typecheck,
coverage_check, secret_scan, exfil_scan, migration_dry_run, schema_validation,
sast, dep_scan, policy_check, negative_tests, config_review, audit_log_check,
fuzz, constant_time_check.
NÃO contam (não são verificações reproduzíveis): "LLM revisou", "parece
correto", "sem erro visual", "review informal", "modelo confiante",
"auto-check do agente". Em C/D são exigidos >= 4 gates VÁLIDOS.

## Tiers de modelo (mapeie aos seus modelos reais) + effort
- light — rápido/barato: edições mecânicas, formatação, buscas simples.
- standard — equilibrado: maior parte de planejamento, geração e avaliação.
- deep — raciocínio de fronteira: planejar/revisar código sensível, segurança,
  design difícil.
effort: minimal | low | medium | high | xhigh | max.
Para slices fact-sensitive (regulação, recall de API, fatos públicos), o
evaluator/reviewer deve ser de FAMÍLIA de modelo diferente do generator.

## Definition of Done
Concluído só quando: critérios de aceite satisfeitos, verificações aplicáveis
executadas, evidência registrada, documentação atualizada quando necessário, e
riscos residuais explícitos.

## Formato do Handoff (bloco final obrigatório em todo turno de tarefa)
Termine cada turno de tarefa com este bloco (campos vazios viram `n/a`):

    ### Handoff
    - state: <DISCOVERY|PLANNED|IMPLEMENTING|EVALUATING|FIXING|REVIEWING|DOCUMENTING|READY>
    - this_turn: <papel + o que foi feito>
    - evidence: <comandos/testes/arquivos que comprovam>
    - open_risks: <riscos que SEGUEM com o trabalho — NÃO decisões que o travam>
    - pending_decision: <decisão que o usuário precisa tomar ANTES de prosseguir | none>
    - next_role: <planner|builder|evaluator|reviewer|security_reviewer|closer|done>
    - next_action: <uma linha: o que o próximo agente (ou o usuário) faz primeiro>
    - suggested_model: <tier light|standard|deep + effort> — <motivo em uma frase>

    Regra: se `pending_decision` não é `none`, NÃO avance de papel — `next_role`
    volta para quem propôs (ex.: planner) e `next_action` é a pergunta ao usuário.
    Uma decisão arquitetural (stack/framework/banco) nunca é "adotada" sozinha.

Exceções (NÃO emitir o bloco): (1) a primeiríssima ativação do projeto
(intake/boas-vindas, sem tarefa ainda); (2) uma mensagem que não pertence à
tarefa atual (ex.: "essa tela de 3 tarefas atrás dá pra melhorar?"). Na dúvida,
dentro de uma tarefa, emita.
