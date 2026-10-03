# Farol Tático: painel do técnico

Frontend montado antes do backend, com dados de exemplo. Sem build: abra `index.html` no navegador
ou rode `python3 -m http.server` na raiz.

## Telas

- **Periodização** (`#treinos-periodizacao`): macrociclo, mesociclo e microciclo, mais o assistente de novo plano.
  O microciclo integra o registro do treino de cada sessão.
- **Competições** (`#planejamento-competicoes`): duplas, viagem, orçamento, professores e resultados.
- **Registro do treino** (`#treino-registro`): presença, PSE e PSR por atleta, anotações ditadas ou digitadas.
- **Quadro técnico** (`#treino-quadro`) e a gaveta **Quadro rápido**, que abre sobre qualquer tela sem sair dela.
- **Página do atleta** (`atleta.html?t=TOKEN`): link único por turma; o atleta escolhe o nome e responde PSE, PSR e dor.
  Dentro do painel há uma prévia (`#atleta-previa`).
- As demais entradas do menu aparecem como "em breve".

## Código

- `js/util.js`, `js/elenco.js`, `js/calendario.js`, `js/registros.js`, `js/dados.js`: dados de exemplo e regras.
  É aqui que o Supabase (schema `ft`) entra no lugar do mock.
- `js/periodizacao.js` (casca), `js/macro.js`, `js/meso.js`, `js/micro.js`, `js/criar.js`, `js/pauta.js`.
- `js/registro.js`, `js/competicoes.js`, `js/quadro.js`, `js/atleta.js`, `js/app.js` (menu, rotas e gaveta do quadro).
- `css/farol.css`: tokens de cor e tipografia (claro e escuro) e componentes.
