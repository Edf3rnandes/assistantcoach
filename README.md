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


## Início e navegação de volta (etapa 11)

- **Início** (`js/inicio.js`) é a tela de abertura e o ponto de volta de todas as outras. Mostra o jogo em andamento (se houver), quatro indicadores (sessões de hoje, sessões para registrar, atletas em atenção, dias até a próxima competição), os atalhos **Criar ou começar** (registrar treino, coletar jogo, treino de fundamento, quadro técnico, novo plano, nova competição), **Hoje**, **Para registrar** (com quantos atletas já responderam), **Semana atual** por plano, **Atenção agora**, **Próximas competições** com o preparo e os atalhos **Acessar** para cada área, além do que vem em breve.
- **Voltar**: toda tela fora do Início mostra o botão **‹ Início** logo abaixo do logotipo. O logotipo e o item **Início** da barra também levam para lá. Tocar no item da tela em que já está volta ao começo dela (por exemplo, sai do relatório de um jogo).
- A barra fixa agora é: Início, Plano, Torneios, Registro, Quadro, Análise, Scout. O antigo item "Mais" foi para o Início ("Em breve").
