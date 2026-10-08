# Assistente do Treinador · Vôlei de praia

Sistema para o técnico de vôlei de praia montar a periodização, registrar os treinos e acompanhar como cada atleta chega e sai.
Sem build e sem dependências: abra `index.html` no navegador ou rode `python3 -m http.server` na raiz e acesse `localhost:8000`.
Funciona bem no celular (barra de navegação embaixo, botões grandes para usar na beira da quadra) e tem tema claro e escuro.

## O que tem

- **Periodização**: temporada com linha do tempo, competições (prioridade A, B ou C) e **mesociclos**. Cada mesociclo tem fase, semanas, perfil de carga e a **ênfase**: um texto de objetivo e **tópicos de fundamentos** (saque, recepção, levantamento, ataque, bloqueio, defesa, transição, movimentação na areia, tática e mental), cada um com os tipos a trabalhar (ex.: saque viagem, ataque de largada), foco e prioridade. A página do mesociclo mostra em quantos treinos cada tópico já apareceu. "Sugerir estrutura" cria base, desenvolvimento, pré-competitivo e competitivo já com tópicos sugeridos.
- **Treinos**: semana a semana. Cada treino registra tipo, duração, fundamentos trabalhados (com atalho pela ênfase do mesociclo daquele dia), **o que foi feito** (atividades com minutos), treino físico inserido e observações. Pode ser planejado antes e marcado como realizado depois.
- **Chegada e saída (PSR e PSE)**: por atleta, de 0 a 10. **PSR** é a recuperação percebida ao chegar; **PSE** é o esforço percebido ao sair. Há presença/falta, observação por atleta e "preencher todos de uma vez". A carga é PSE × minutos.
- **Treino físico**: biblioteca de exercícios (peso do corpo, areia e material simples; edite e crie os seus) e **montagem** em blocos, com séries, repetições ou tempo, carga, pausa e observação. "**Inserir em treino**" copia o treino montado para o dia que você escolher, criando um treino novo ou juntando a um existente.
- **Atletas**: cadastro (função, dupla, nascimento, observações), histórico de PSR e PSE, carga semanal e ACWR.
- **Início**: o dia, treinos sem registro, ênfase do mesociclo atual com a cobertura de cada fundamento, resumo da semana e atletas para olhar.
- **Dados**: exportar e importar backup em arquivo, carregar dados de exemplo e apagar tudo.

## Como as contas funcionam

`js/calc.js` concentra as regras (roda no Node e no navegador):

- Carga da sessão = PSE × minutos, só para quem estava presente e informou PSE.
- **ACWR** = carga da semana ÷ média das semanas anteriores (até 4) que tiveram carga. Só aparece com 3 ou mais semanas de base. Faixas: abaixo de 0,8, ideal até 1,3, atenção até 1,5 e alto acima disso. É um sinalizador, não um diagnóstico.
- **Atletas para olhar** (últimos 7 dias): PSR 4 ou menos na chegada, PSE 9 ou 10, ACWR alto e observações com lesão ou dor.
- Perfis de carga do mesociclo: 3:1, 2:1, progressiva, plana e polimento. A carga planejada da semana é a referência × o fator da semana, comparada com a média real do grupo.

## Código

- `js/calc.js` regras · `js/catalogo.js` fundamentos, fases e exercícios · `js/store.js` dados (localStorage) · `js/ui.js` componentes e gráficos
- `js/v-*.js` telas (periodização, treinos, físico, atletas, início e dados) · `js/app.js` rotas · `js/exemplo.js` dados de exemplo · `css/app.css`
- Testes das regras: `node tests/calc.test.js`

## Limites atuais

- Os dados ficam só no navegador do aparelho. Use **Dados › Exportar backup** com frequência. Login, vários técnicos e sincronização entre aparelhos exigem um servidor, e `js/store.js` é o ponto de troca.
- Dados de atletas (inclusive lesões) são sensíveis. Antes de ligar um servidor, é preciso tratar consentimento e acesso (LGPD).
- O treino físico inserido num treino é uma cópia; editar o modelo depois não muda o que já foi inserido.

## Sistema anterior

O sistema antigo (Farol Tático, com várias equipes, scout, competições e quadro tático) está em `legado/`, com o histórico preservado no git. Nada do sistema novo depende dele.
