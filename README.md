# Farol Tático: painel do técnico

Frontend do painel do técnico, montado antes do backend. Sem build: abra `index.html` no navegador
ou rode `python3 -m http.server` na raiz.

- `index.html`: painel do profissional (navegação lateral e telas por hash, ex.: `#treinos-periodizacao`).
- `atleta.html`: página do atleta aberta por token (ainda não criada).
- `css/farol.css`: tokens de cor e tipografia (claro e escuro) e componentes.
- `js/dados.js`: dados de exemplo. É o único arquivo a trocar quando o Supabase (schema `ft`) entrar.
- `js/app.js`: shell, menu e roteamento. Telas ainda não feitas aparecem como "em breve".
- `js/periodizacao.js`: Treinos > Periodização.
