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
