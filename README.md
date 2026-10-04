# Farol Tático: painel do técnico

Frontend montado antes do backend, com dados de exemplo. Sem build: abra `index.html` no navegador
ou rode `python3 -m http.server` na raiz.

## Telas

- **Periodização** (`#treinos-periodizacao`): macrociclo, mesociclo e microciclo, mais o assistente de novo plano.
  O microciclo integra o registro do treino de cada sessão.
- **Competições** (`#planejamento-competicoes`): duplas, viagem, orçamento, professores e resultados.
- **Registro do treino** (`#treino-registro`): presença, PSE e PSR por atleta, anotações ditadas ou digitadas.
- **Análise** (`#analise`): Visão geral (indicadores, carga planejada × realizada, ACWR, PSE e PSR, atenção), Atletas (mapa de carga e semáforo), Comparativos (atleta e grupos, com evolução nos testes para comparar gêneros de forma justa) e Competições (resultados e preparo).
- **Quadro técnico** (`#treino-quadro`) e a gaveta **Quadro rápido**, que abre sobre qualquer tela pelo item Quadro da barra.
- **Página do atleta** (`atleta.html?t=TOKEN`): link único por turma; o atleta escolhe o nome e responde PSE, PSR e dor.
  Dentro do painel há uma prévia (`#atleta-previa`).
- Navegação: barra fixa com **4 portas** (Início, Plano, Jogos, Análise); veja "Navegação enxuta" abaixo.

## Código

- `js/util.js`, `js/elenco.js`, `js/calendario.js`, `js/registros.js`, `js/dados.js`: dados de exemplo e regras.
  É aqui que o Supabase (schema `ft`) entra no lugar do mock.
- `js/periodizacao.js` (casca), `js/macro.js`, `js/meso.js`, `js/micro.js`, `js/criar.js`, `js/pauta.js`.
- `js/medidas.js` (testes, peso e métricas de treino), `js/carga.js` (contas de carga e velocímetro), `js/analise-dados.js` (carga, ACWR, semáforo), `js/analise-carga.js` (aba Carga), `js/graficos.js` (gráficos em SVG), `js/analise.js` e `js/comparativos.js`.
- `js/registro.js`, `js/competicoes.js`, `js/quadro.js`, `js/atleta.js`, `js/app.js` (menu, rotas e gaveta do quadro).
- `css/farol.css`: tokens de cor e tipografia (claro e escuro) e componentes.


## Scout (etapa 10)

Item **Scout** na barra fixa. Duas telas: `analise-scout` (jogos, relatório e fundamento) e `scout-coleta` (coleta ao vivo).

- **Coleta ao vivo** (`js/scout.js`): escolhe quem fez (os dois atletas da dupla ou o adversário), o fundamento (saque, recepção, ataque, bloqueio, defesa) e o resultado. O sistema sugere o próximo passo (depois da recepção vem o ataque do parceiro), calcula placar, sets, sacador (alternando a cada saque recuperado), aviso de troca de lado (a cada 7 pontos, 5 no terceiro set) e tempo técnico. Tipo de saque/ataque e destino na quadra (3 × 3) são opcionais. Desfazer tira a última ação. O botão Quadro abre o quadro técnico por cima, sem sair do jogo.
- **Três usos do mesmo registro**: jogo de competição, treino-jogo (formatos de 1 set de 21 ou 15, ou livre) e treino de fundamento (acertos e erros por atleta num exercício, com meta e evolução).
- **Relatório de um jogo**: indicadores (pontos ganhos, side-out, break point, recepção, ataque, saque), saldo de pontos jogada a jogada, de onde vieram e para onde foram os pontos, tabela por atleta, mapas de saque e ataque e a lista de jogadas.
- **Relatório do período**: filtros por dupla, tipo e período; evolução jogo a jogo; **Foco para o treino**, com metas sugeridas a partir de referências do clube (editáveis em `REF`, em `js/scout-dados.js`) que abrem um treino de fundamento já preenchido.
- **Competições**: cada competição ganhou a seção "Scout dos jogos" para coletar jogos por dupla confirmada.
- Dados: `js/scout-dados.js` (modelo `jogos` / `acoes_scout`; estatísticas calculadas das ações). Jogos de exemplo gerados jogada a jogada; o que for coletado fica no navegador (`localStorage`, chave `ft.scout.v1`).


## Início e navegação de volta (etapas 11 e 12)

O **Início** (`js/inicio.js`) é o painel geral e o ponto de volta de todas as telas. Lê na ordem em que o técnico decide:

1. **Faixa do dia**, com paisagem de praia: data, sessões de hoje (toque para registrar), jogo em andamento e os atalhos para criar ou começar algo (registrar treino, coletar jogo, quadro técnico, fundamento, novo plano, nova competição). Quatro indicadores logo abaixo: atletas disponíveis, lesionados ou em retorno, sessões sem registro e dias até a próxima competição.
2. **Planejamento**: fase atual, semana, linha do ciclo com "hoje", bandeiras das competições e o alvo, mais as **prioridades da fase** (fundamentos de prioridade alta e as ideias da pauta). Seletor entre os planos. **Competições**: as três próximas, com contagem de dias e o preparo (duplas, viagem, equipe).
3. **Elenco e saúde**: um cartão por turma (disponíveis, atenção de carga, em retorno, lesionados, com os nomes) e a lista de **lesões e retornos** com local, conduta e data de volta. A situação de saúde vem de `SITUACAO` em `js/elenco.js` (dados de exemplo; em produção, o cadastro do atleta).
4. **Em seguida**: **últimos testes** (evolução média da turma por teste, quem mais evoluiu, quem olhar e a próxima avaliação sugerida), **treinos para rever** (sessões dos últimos 14 dias com esforço acima do alvo, recuperação baixa ou presença baixa) e **em atraso** (sessões sem registro, atletas sem responder, competições com preparo pendente, retornos de lesão próximos, reavaliação física).

**Voltar**: toda tela fora do Início mostra **‹ Início** logo abaixo do logotipo. O logotipo e o item Início da barra também levam para lá, e tocar no item da tela em que já está volta ao começo dela. A barra fixa é: Início, Plano, Torneios, Registro, Quadro, Análise, Scout.


## Cadastro de lesão e retorno (etapa 13)

Tela **Saúde do elenco** (`js/saude.js`, rota `saude`), aberta pelo Início (indicador de lesionados, botão "Registrar lesão ou queixa", atalho do painel do dia ou nome do atleta na lista).

- **Ocorrência por atleta**, uma ativa por vez: lesão (fora dos treinos), em retorno (treina com restrições) ou dúvida (relato a avaliar). Guarda região do corpo, diagnóstico ou queixa, início, retorno previsto, conduta, restrições (sem saltos, sem ataque forte, só físico adaptado…) e quem acompanha.
- **Fluxo**: lesão → **liberar para retorno** (com data de liberação total, conduta adaptada e restrições) → **dar alta**; dúvida → **confirmar lesão** ou **descartar**. Também **registrar evolução** (anotações datadas), **editar**, **reabrir** e **excluir** (com confirmação).
- **Histórico** com as ocorrências encerradas e o tempo afastado.
- **Relatos de dor sem ocorrência**: dores moderadas ou fortes que o atleta informou no PSE e PSR e que ainda não viraram ocorrência, com botão que abre o formulário já preenchido.
- **Impacto nas competições**: para cada dupla prevista ou confirmada nos próximos 75 dias com atleta em acompanhamento, mostra se deve jogar, se é preciso conferir ou se fica fora, comparando a data de retorno com a da competição.
- O Início (cartões das turmas, lista de lesões, indicadores e "em atraso") lê `Farol.elenco.situacaoDe`, que agora vem deste cadastro. Os dados ficam no navegador (`ft.saude.v1`) até o Supabase entrar (tabela prevista `ocorrencias_saude`).

## Resposta da semana (etapa 14)

Tela `treinos-microciclo` (`js/semana.js`), aberta pelo botão **Resposta da semana** do Registro do treino e pelo link no bloco Planejamento do Início. Mostra, para a semana escolhida do plano:

- **Quadro atleta × sessão** com PSE / PSR de cada célula. Valores registrados pelo professor aparecem normais; relatos que o atleta mandou pelo link da turma, ainda sem registro, aparecem inclinados e com fundo tracejado. PSE bem acima do planejado e PSR baixo ficam sublinhados em âmbar; faltas, sessões sem resposta e sessões futuras têm marcação própria. Atletas lesionados aparecem marcados.
- **Por atleta**: carga da semana e quanto ela é do plano até agora, ACWR (só em semana completa, com 3 semanas anteriores), monotonia e **bem-estar** (dor, sono e disposição). O link do atleta ganhou duas perguntas opcionais, sono e disposição (1 a 5).
- **Indicadores**: respostas recebidas, PSE e PSR médios, carga por atleta, atletas em atenção e dor relatada. **Gráfico** do PSE e PSR médios de cada sessão contra o PSE planejado.
- **Semáforo** por atleta com os motivos à vista (regras na própria tela). Quem relatou dor e ainda não tem acompanhamento pode abrir o cadastro de saúde já preenchido.
- **Lançar em lote**: escolhe a sessão que aguarda registro, escolhe PSE, PSR ou presença, escolhe o valor e toca nos atletas. As respostas dos atletas entram sozinhas. Salvar grava o registro da sessão (notas, fundamentos e jogadas continuam no Registro do treino).

## Exercícios e prescrição (etapa 15)

Tela `treinos-biblioteca` (`js/biblioteca.js`, dados em `js/prescricao.js`), aberta pelas "Outras áreas" do Início e, na sessão física do microciclo, pelo botão **Prescrever treino físico**. A barra marca Plano. Três abas:

- **Prescrições**: um plano de treino aplicado a uma **turma** ou a **atletas**, numa data e, se quiser, ligado a uma sessão física do microciclo. Ao abrir, mostra o treino, os **conflitos com a saúde** de cada atleta (restrições e região do corpo do cadastro de Saúde do elenco) e, para cada conflito, uma lista de **trocas** só com exercícios sem conflito (o botão "Aplicar as trocas sugeridas" faz isso de uma vez). Há **cargas individuais** em kg e **Copiar para enviar** (texto da turma ou de cada atleta, já com as trocas). Marcar como feita, reabrir e excluir.
- **Planos de treino** (modelos): séries, repetições ou tempo, carga (peso do corpo, kg, % de 1RM ou PSE), descanso e observação, com barra de séries por categoria e tempo estimado. Prescrever, editar (reordenar, adicionar, remover), duplicar e excluir.
- **Catálogo**: 45 exercícios de exemplo com categoria, grupos musculares, equipamento, nível, vídeo (link) e dica técnica. Busca e filtros, criar, editar e excluir (quem está em um plano não pode ser excluído). Cada exercício diz o que **exige** (saltos, corrida, braço acima da cabeça, quedas) e onde **pesa** (tornozelo, joelho, ombro…), que é o que cruza com a saúde.
- **Página do atleta**: o atleta vê "Meu treino físico" com o treino dele, as trocas e as cargas individuais. Exercícios que ainda conflitam com a saúde dele aparecem marcados com "fale com o professor antes".
- Os dados ficam no navegador (`ft.prescricao.v1`) até o Supabase entrar (tabelas previstas `exercicios`, `planos_treino` e `treino_prescrito`).

## Scout por toque e pressão (etapas 16 e 17)

A coleta ao vivo (`js/scout-coleta.js`) usa o mesmo registro de ações, com poucos pontos para tocar:

- **Placar dividido**: azul é a nossa dupla e vermelho o adversário, com números enormes, o sacador, o relógio do jogo e **+** e **−** de cada lado. O **−** desfaz o último ponto do lado (só quando foi dele).
- **Uma roda só.** Tocar no **+** abre uma roda com **quatro opções nas laterais** e o centro sem nome (um **?**, que vale "outro"): nosso ponto = Ataque, Bloqueio, Ace, Erro deles; ponto deles = Ataque, Saque, Bloqueio, Erro nosso. **Erro nosso** abre outra roda com Saque, Recepção, Ataque e Defesa. Dá para tocar na fatia, ou **segurar o + e deslizar** até a opção e soltar. No teclado: Enter, setas e Esc.
- **A escolha já registra.** Os detalhes são opcionais e aparecem como **quatro botões** na "Última ação", que também servem para **corrigir**: tipo de ataque (diagonal, paralela, largada, usada), tipo de saque (viagem, flutuante), qual erro do adversário, qualidade da recepção (perfeita, boa, ruim, erro; trocar para erro refaz o ponto).
- **Jogada sem ponto**: um botão só, com a roda Recepção, Ataque (defendido), Saque (em jogo) e Defesa. Depois de recepção ou defesa, a vez passa para o parceiro.
- Os dois atletas ficam à vista (quem está na bola). O destino na quadra (3 × 3) fica recolhido na "Última ação". Troca de lado, tempo técnico e sacador continuam automáticos.
- **Relatório do jogo**: Linha da partida (uma bolinha por ponto, com o que o originou) e rosquinhas (origem dos pontos, ataques convertidos por tipo, erros cometidos, origem dos pontos do adversário). Os jogos gravados mudaram de chave (`ft.scout.v2`).

## Quadro rápido e fluidez (etapa 18)

- **Gaveta do quadro** fecha sozinha ao trocar de tela, então o botão **Quadro** volta a abrir em qualquer página (antes ela ficava aberta sobre a página nova e o toque seguinte a fechava). No celular ela é uma **aba**: ocupa toda a área acima da barra e some ao tocar em qualquer outro item; o botão **Reduzir** devolve uma folha baixa (a tela de trás continua visível) e **Ampliar** volta à aba (a escolha fica salva). No computador é um painel lateral. Os dois entram com uma animação curta.
- **Arrastar** peças e traçar setas ficou mais leve: a matriz de tela é lida uma vez por gesto, o movimento é aplicado uma vez por quadro de tela e, ao soltar, só a quadra, a faixa de quadros e os botões são atualizados (a tela não é remontada, salvo quando a seleção muda).
- **Reproduzir** a sequência monta a quadra uma vez por passo e só move as peças a cada quadro, em vez de refazer o SVG inteiro.
- Na gaveta do celular a quadra abre na horizontal (no painel lateral do computador, em pé); dá para girar no menu.

## Quadro: mexer em atleta e seta (etapa 19)

- **Mover atleta**: halo que acende ao passar o mouse, pulsa quando selecionado; ao arrastar aparece um **fantasma** na posição de origem e um **rastro** tracejado até a posição atual; a quadra ganha contorno enquanto algo é movido. Desfazer volta ao ponto de partida.
- **Mexer em seta**: toque na seta para selecioná-la; surgem duas **alças nas pontas** (arraste para ajustar só aquela ponta) e dá para **arrastar a seta inteira** pelo corpo. As pontas **encaixam** em atletas, bola e cones próximos (o alvo acende em verde). Cada ajuste é um passo de desfazer.
- Ao traçar uma seta nova, a prévia já mostra a ponta da seta e o encaixe.
- Limites: sem teste em aparelho real (só toque simulado); alças e encaixe valem para o quadro atual, não para a reprodução.

## Carga interna e avaliação corporal (etapa 20)

Inspirada em planilha de controle de carga interna (Foster e Gabbett); só a lógica foi reescrita, nada copiado.

- **Contas num lugar só** (`js/carga.js`): carga = duração × PSE; ACWR = carga da semana ÷ média das **semanas anteriores** (até 4, sem contar a própria semana); monotonia com desvio **amostral**; strain = carga × monotonia. O ACWR já aparece na 2ª semana, mas é **provisório** até haver 4 semanas de base e só **dispara alerta** no semáforo com 3 ou mais semanas de base.
- **Velocímetro do ACWR**: destreino (< 0,8), ótimo (0,8 a 1,3), risco (1,3 a 1,5) e risco alto (> 1,5), sempre com número e nome da faixa (não só cor). Aparece na Visão geral (turma) e na nova aba **Análise › Carga**.
- **Análise › Carga** (`js/analise-carga.js`): por atleta e semana, com velocímetro, carga (quadra + físico), tempo treinado, monotonia, strain, PSE e PSR; carga por dia; **comparação de duas semanas do mesmo atleta** (A × B, com diferença) e as últimas 8 semanas. O ACWR da tabela de Atletas abre essa aba.
- **Dois treinos no mesmo dia**: já existia (turnos manhã, tarde e noite no microciclo); a carga do dia soma todas as sessões.
- **Carga total (quadra + físico)**: em *Exercícios e prescrição*, o cartão **Como foi o treino** pede duração e PSE por atleta; ao salvar, a prescrição vira feita e a carga entra no ACWR, na monotonia e no strain. Prescrição ligada a uma sessão do microciclo não é somada de novo (a carga já vem do registro da sessão). O comparativo "planejado × realizado" continua só de quadra.
- **Peso nas avaliações** (Análise › Comparativos › atleta): cartão **Avaliação corporal** com peso atual, variação desde a avaliação anterior e desde o primeiro registro, histórico e lançamento de novo peso (`ft.avaliacao.v1`). Peso **não tem ranking nem lado melhor**: só a evolução do próprio atleta.
- Limites: o atleta ainda não informa PSE do treino físico pela própria página; o velocímetro não aparece no Início nem na página do atleta; tudo continua com dados de exemplo e salvo só no navegador.

## Navegação enxuta (etapa 21)

- **Barra com 4 portas**: Início, Plano, Jogos e Análise. Cada porta tem uma linha de abas (Plano: Periodização e Exercícios; Jogos: Competições e Scout). Registro, Quadro, Saúde e Resposta da semana não têm mais item na barra: ficam dentro da equipe e da sessão.
- **Início por equipes** (`inicio`): saudação, cartões das equipes (fase, semana, bolinhas das sessões registradas, quem está fora, treinos sem registro e próxima competição), as sessões de **hoje**, três pendências (sem registro, lesionados e próxima competição) e quatro atalhos (Quadro, Coletar jogo, Registrar lesão, Exercícios).
- **Equipe** (`equipe`, parâmetro `turmaId`): faixa da fase, **semana com os dias de treino e as sessões de cada dia** (navegável de semana em semana), painel da sessão escolhida com **Registrar treino**, **Abrir quadro**, **Prescrever físico** e **Editar sessão**, atletas por situação, foco da fase, próxima competição e atalhos para o plano, a análise, a resposta da semana e o link dos atletas.
- O botão "‹" de cada tela volta para a tela de origem (Registro e Resposta da semana voltam à Equipe; a coleta do Scout volta ao Scout).
- Mudança nos dados de exemplo: só uma semana de **choque** por fase específica, para o semáforo não marcar quase todo o elenco.

## Conta, equipes e atletas (etapa 22)

- **Entrada** (`js/entrar.js`): sem sessão, o app mostra só a tela de **Entrar / Criar conta**, com a opção **Ver com dados de exemplo**. O menu da conta fica no canto do topo (nome, modo e saída).
- **Conta local** (`js/conta.js`): cadastro com nome, e-mail e senha (mínimo de 8 caracteres), senha guardada com **hash PBKDF2** e mensagem de erro igual para e-mail e senha errados. **Não é segurança de verdade**: tudo fica neste navegador, separado por conta (`ft.u.<id>.*`). A interface (`usuario`, `criar`, `entrar`, `sair`, `chave`) é o ponto de troca pelo **Supabase Auth** quando o backend entrar.
- **Dados por conta**: uma conta cadastrada começa **sem nada de exemplo** (sem equipes, atletas, planos, competições, lesões, jogos ou prescrições) e guarda no aparelho: elenco, planos (inclusive sessões editadas), registros e respostas, competições e planejamento, saúde, scout, prescrições, peso e quadro. A demonstração segue como antes (nada do núcleo é guardado).
- **Equipes e atletas** (`#equipes-nova`, `#equipes-editar`): nome, faixa e gênero da equipe; atletas um a um (Enter adiciona) ou **colando uma lista**; editar, remover e excluir (só equipe sem plano). Rascunho: sair sem salvar não muda nada.
- **Primeiro uso**: Início vazio com 3 passos → cadastrar equipe → criar o plano (o assistente agora deixa **cadastrar a competição alvo na hora** e já distribui as fases) → semana e sessões na tela da equipe.
- **Estados vazios**: Plano, Registro, Resposta da semana, Análise e Comparativos mostram o caminho (cadastrar equipe ou criar plano) em vez de erro.
- Limites: o **link dos atletas** (`atleta.html?t=…`) de uma conta cadastrada só abre neste mesmo navegador, porque os dados ainda não estão num servidor; os **testes físicos** de uma conta nova ainda não têm tela de lançamento (o peso tem); não há recuperação de senha nem troca de e-mail.
