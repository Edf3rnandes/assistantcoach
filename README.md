# Farol Tático: painel do técnico

Frontend montado antes do backend, com dados de exemplo. Sem build: abra `index.html` no navegador
ou rode `python3 -m http.server` na raiz.

## Telas

- **Periodização** (`#treinos-periodizacao`): macrociclo, mesociclo e microciclo, mais o assistente de novo plano.
  O microciclo integra o registro do treino de cada sessão.
- **Competições** (`#planejamento-competicoes`): duplas, viagem, orçamento, professores e resultados.
- **Registro do treino** (`#treino-registro`): presença, PSE e PSR por atleta, anotações ditadas ou digitadas.
- As demais entradas do menu aparecem como "em breve".

## Código

- `js/util.js`, `js/elenco.js`, `js/calendario.js`, `js/registros.js`, `js/dados.js`: dados de exemplo e regras.
  É aqui que o Supabase (schema `ft`) entra no lugar do mock.
- `js/periodizacao.js` (casca), `js/macro.js`, `js/meso.js`, `js/micro.js`, `js/criar.js`, `js/pauta.js`.
- `js/registro.js`, `js/competicoes.js`, `js/app.js` (menu e rotas).
- `css/farol.css`: tokens de cor e tipografia (claro e escuro) e componentes.
