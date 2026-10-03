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
- Navegação: barra fixa embaixo (Plano, Torneios, Registro, Quadro, Análise, Mais). O que ainda não existe fica em "Mais".

## Código

- `js/util.js`, `js/elenco.js`, `js/calendario.js`, `js/registros.js`, `js/dados.js`: dados de exemplo e regras.
  É aqui que o Supabase (schema `ft`) entra no lugar do mock.
- `js/periodizacao.js` (casca), `js/macro.js`, `js/meso.js`, `js/micro.js`, `js/criar.js`, `js/pauta.js`.
- `js/medidas.js` (testes e métricas de treino), `js/analise-dados.js` (carga, ACWR, semáforo), `js/graficos.js` (gráficos em SVG), `js/analise.js` e `js/comparativos.js`.
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
