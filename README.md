# Assistente do Treinador · Vôlei de praia

Sistema para o técnico de vôlei de praia montar a periodização, registrar os treinos e acompanhar como cada atleta chega e sai.
Sem build e sem dependências: abra `index.html` no navegador ou rode `python3 -m http.server` na raiz e acesse `localhost:8000`.
Funciona bem no celular (barra de navegação embaixo, botões grandes para usar na beira da quadra) e tem tema claro e escuro.

## O que tem

- **Periodização**: temporada com linha do tempo, competições (prioridade A, B ou C) e **mesociclos**. Cada mesociclo tem fase, semanas, perfil de carga e a **ênfase**: um texto de objetivo e **tópicos de fundamentos** (saque, recepção, levantamento, ataque, bloqueio, defesa, transição, movimentação na areia, tática e mental), cada um com os tipos a trabalhar (ex.: saque viagem, ataque de largada), foco e prioridade. A página do mesociclo mostra em quantos treinos cada tópico já apareceu. "Sugerir estrutura" cria base, desenvolvimento, pré-competitivo e competitivo já com tópicos sugeridos.
- **Treinos**: semana a semana. Cada treino registra tipo, duração, fundamentos trabalhados (com atalho pela ênfase do mesociclo daquele dia), **o que foi feito** (atividades com minutos), treino físico inserido e observações. Pode ser planejado antes e marcado como realizado depois.
- **Chegada e saída (PSR e PSE)**: por atleta, de 0 a 10. **PSR** é a recuperação percebida ao chegar; **PSE** é o esforço percebido ao sair. Há presença/falta, observação por atleta e "preencher todos de uma vez". A carga é PSE × minutos.
- **Treino físico**: biblioteca de exercícios (peso do corpo, areia e material simples; edite e crie os seus) e **montagem** em blocos, com séries, repetições ou tempo, carga, pausa e observação. "**Inserir em treino**" copia o treino montado para o dia que você escolher, criando um treino novo ou juntando a um existente.
- **Atletas**: cadastro um a um ou **por lista colada** (uma linha por atleta, como `Beatriz Begondim, feminino, bloqueio`; sexo, ação, nascimento e telefone em qualquer ordem). A **função** é só a ação em quadra (bloqueio, defesa ou ambos) e o **sexo** é separado: o sistema monta "Bloqueadora" ou "Bloqueador", o naipe do atleta e o naipe da dupla (masculina, feminina ou mista). Histórico de PSR e PSE, carga semanal e ACWR.
- **Cadastro pelo próprio atleta**: o técnico envia um link (individual, já com nome, sexo e ação, ou um link geral). O atleta abre a **ficha pública** (sem menu nem acesso ao resto do sistema), completa nascimento, contato, lado preferido, responsável (menores de 18) e saúde, autoriza o uso dos dados e recebe um **código** para devolver ao técnico (por WhatsApp, por exemplo). O técnico cola em **Importar respostas**, confere e aplica. Como ainda não há servidor, a devolução é manual; com um servidor ela passa a ser automática.
- **Competições mandam na carga**: cada competição tem prioridade (A alvo, B importante, C treino) e situação da data (confirmada, a confirmar ou cancelada). A semana de cada mesociclo mostra **volume** (fator de carga), **intensidade** (PSE alvo) e **intenção**. A competição A pede polimento antes (menos volume, mesma intensidade) e recuperação depois; a B reduz só a própria semana; a C não muda nada. Quando uma data muda, aparece o aviso "Os mesociclos não acompanham as competições" com uma **proposta** (antes e depois) que refaz só o futuro. A página **Guia** traz o organograma da temporada e o fluxo de decisão.
- **Nova periodização numa tela**, na ordem: 1) ciclo (início e fim, com atalhos de 8 a 32 semanas), 2) competições (nome, data e prioridade, direto na lista), 3) equipe (categorias Sub-13, 15, 17, 19, 21 ou Adulto, dias de treino e duração padrão) e 4) prévia dos mesociclos, onde cada um pode ser mantido ou excluído antes de criar. A prévia mostra uma semana de exemplo e a semana do polimento, com tipo, intensidade e duração de cada treino.
- **Dias de treino e intensidade**: escolhendo os dias (2 a 6 por semana, por exemplo segunda, terça e quinta, ou segunda, quarta e sexta), cada semana passa a ter sessões previstas com **tipo** (técnico, tático, treino-jogo, físico…), **intensidade** (alta, moderada ou leve), PSE alvo, duração e fundamentos da ênfase. A semana de volume menor encurta os treinos e mantém os dias. As sessões previstas aparecem em Treinos e no Início, e um toque abre o registro já preenchido. A carga planejada da semana vem dessas sessões (PSE × minutos).
- **Quadro da temporada (semana em ordem)**: na página da periodização, uma onda de intensidade (PSE alvo de cada dia) com as semanas de 8 em 8, e embaixo, no computador, uma grade com o nome do dia na lateral (Segunda, Quarta, Sexta…) mostrando o treino de cada dia e o físico colado nele. No celular fica a onda e os botões das semanas. Tocando numa semana aparecem os dias, já abertos para detalhar: no **treino de quadra** o técnico muda intensidade e duração e marca o que vai trabalhar em cada fundamento (agrupados em K1, o side-out, e K2, saque e sistema defensivo); no **treino físico** o sistema sugere o estímulo pela fase (capacidade, intensidade e minutos), e o técnico troca a capacidade, ajusta e escolhe os exercícios da biblioteca. Os ajustes ficam em `perio.dias[data]` e já entram no registro do treino (fundamentos, anotação e físico montado).
- **Atletas da equipe**: a categoria sai do ano de nascimento (Sub-N para quem faz até N anos no ano; acima de 21, Adulto). A lista de presença e os resumos usam só os atletas das categorias da equipe; quem não tem nascimento entra sempre.
- **Início**: o dia, treinos sem registro, ênfase do mesociclo atual com a cobertura de cada fundamento, resumo da semana e atletas para olhar.
- **Dados**: exportar e importar backup em arquivo, carregar dados de exemplo e apagar tudo.

## Como as contas funcionam

`js/calc.js` concentra as regras (roda no Node e no navegador):

- Carga da sessão = PSE × minutos, só para quem estava presente e informou PSE.
- **ACWR** = carga da semana ÷ média das semanas anteriores (até 4) que tiveram carga. Só aparece com 3 ou mais semanas de base. Faixas: abaixo de 0,8, ideal até 1,3, atenção até 1,5 e alto acima disso. É um sinalizador, não um diagnóstico.
- **Atletas para olhar** (últimos 7 dias): PSR 4 ou menos na chegada, PSE 9 ou 10, ACWR alto e observações com lesão ou dor.
- **Fase pela distância até a próxima A**: 0 semanas = competição, 1 = polimento, 2 a 3 = pré-competitivo, 4 a 7 = desenvolvimento, 8 ou mais = base; a semana depois da A é recuperação e a contagem recomeça. Sem A, a B vira o alvo. Fatores de volume: semana da A ×0,6, depois da A ×0,5, semana da B ×0,85, depois da B ×0,9. São pontos de partida iguais para todos, não calibrados por atleta.
- **Papéis de intensidade pelos dias da semana**: 2 dias = alta e moderada; 3 = alta, moderada e leve; 4 = alta, moderada, alta e leve; 5 = alta, moderada, alta, moderada e leve (na ordem dos dias). PSE alvo = a da fase, +1 no dia alto e −2 no leve. Véspera e dia seguinte de competição A ou B são leves.
- Perfis de carga do mesociclo: 3:1, 2:1, progressiva, plana e polimento. A carga planejada da semana é a referência × o fator da semana, comparada com a média real do grupo.

## Código

- `js/calc.js` regras · `js/catalogo.js` fundamentos, fases e exercícios · `js/store.js` dados (localStorage) · `js/ui.js` componentes e gráficos
- `js/ficha-dados.js` link, código e limpeza do cadastro pelo atleta · `js/v-*.js` telas (periodização, treinos, físico, atletas, ficha pública, guia, início e dados) · `js/app.js` rotas · `js/exemplo.js` dados de exemplo · `css/app.css`
- Testes das regras: `node tests/calc.test.js`

## Limites atuais

- Os dados ficam só no navegador do aparelho. Use **Dados › Exportar backup** com frequência. Login, vários técnicos e sincronização entre aparelhos exigem um servidor, e `js/store.js` é o ponto de troca.
- Dados de atletas (inclusive lesões) são sensíveis. Antes de ligar um servidor, é preciso tratar consentimento e acesso (LGPD).
- O treino físico inserido num treino é uma cópia; editar o modelo depois não muda o que já foi inserido.

## Sistema anterior

O sistema antigo (Farol Tático, com várias equipes, scout, competições e quadro tático) está em `legado/`, com o histórico preservado no git. Nada do sistema novo depende dele.
