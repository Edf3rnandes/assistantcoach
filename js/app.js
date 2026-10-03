/* Shell do painel do profissional: navegação lateral e roteamento por hash (#treinos-periodizacao).
   Cada tela é uma função registrada em Farol.views[rota](elemento). */
(function () {
  const ICONS = {
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    lista: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    halter: '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
    graf: '<path d="M3 20h18M6 16l4-5 3 3 5-7"/>',
    corpo: '<circle cx="12" cy="5" r="2.5"/><path d="M12 8v7M8 11h8M9 21l3-6 3 6"/>',
    chama: '<path d="M12 3c3 4 5 6.5 5 10a5 5 0 0 1-10 0c0-3.5 2-6 5-10z"/>',
    prato: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>',
    pulso: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
    olho: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    pessoas: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M18 20a6 6 0 0 0-3-5"/>',
    bola: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    teste: '<path d="M10 3h4M11 3v6l-5 9a2 2 0 0 0 2 3h8a2 2 0 0 0 2-3l-5-9V3"/>',
    placar: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16M7 9h2M15 9h2"/>',
  };
  const icon = (nome) =>
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[nome]}</svg>`;

  // `pronta` indica se a tela já foi construída; as demais mostram o que entra nela.
  const GRUPOS = [
    {
      titulo: 'Tático-físico',
      itens: [
        { id: 'ex-atletas', nome: 'Atletas e turmas', icone: 'pessoas', existente: true },
        { id: 'ex-sessoes', nome: 'Sessões de quadra', icone: 'bola', existente: true },
        { id: 'ex-testes', nome: 'Testes físicos', icone: 'teste', existente: true },
        { id: 'ex-scout', nome: 'Scout e jogos', icone: 'placar', existente: true },
      ],
    },
    {
      titulo: 'Treinos',
      itens: [
        { id: 'treinos-periodizacao', nome: 'Periodização', icone: 'cal', pronta: true },
        {
          id: 'treinos-biblioteca', nome: 'Exercícios', icone: 'lista',
          resumo: 'Catálogo global de exercícios, com grupo muscular, categoria e vídeo.',
          bullets: ['Busca e filtro por grupo muscular e categoria (força, mobilidade, potência).', 'Cadastro de exercício com link de vídeo.'],
          tabelas: ['exercicios'],
        },
        {
          id: 'treinos-prescricao', nome: 'Prescrição', icone: 'halter',
          resumo: 'Monte o template de treino e aplique a atletas ou turmas.',
          bullets: ['Lista de exercícios com séries, repetições, carga (kg ou % de 1RM) e descanso.', 'Aplicar o template a uma turma inteira ou a um atleta.', 'Vínculo do treino com o mesociclo do plano.'],
          tabelas: ['planos_treino', 'treino_prescrito'],
        },
        {
          id: 'treinos-execucao', nome: 'Execução', icone: 'check',
          resumo: 'O que cada atleta fez de fato: carga real, repetições e PSE do treino.',
          bullets: ['Visão do profissional sobre o que foi registrado em atleta.html.', 'Comparação entre prescrito e executado.'],
          tabelas: ['treino_executado'],
        },
        {
          id: 'treinos-carga', nome: 'Carga e progressão', icone: 'graf',
          resumo: 'ACWR, alertas das regras e ajustes de carga para o profissional confirmar.',
          bullets: ['Carga aguda:crônica com faixa segura de 0,8 a 1,3.', 'Sugestões do motor de regras: reduzir volume, liberar aumento de carga.', 'Botões para confirmar ou descartar cada ajuste.'],
          tabelas: ['pse_sessao', 'resultados_testes'],
        },
      ],
    },
    {
      titulo: 'Nutrição',
      itens: [
        {
          id: 'nutricao-perfil', nome: 'Perfil antropométrico', icone: 'corpo',
          resumo: 'Peso, altura, percentual de gordura e dobras cutâneas ao longo do tempo.',
          bullets: ['Histórico por atleta com gráfico de evolução.', 'Registro de nova avaliação.'],
          tabelas: ['perfis_antropometricos'],
        },
        {
          id: 'nutricao-plano', nome: 'Metas e plano', icone: 'chama',
          resumo: 'Meta calórica e de macros por atleta, ajustada pela fase do mesociclo.',
          bullets: ['Cálculo por Mifflin-St Jeor com fator de atividade do esporte.', 'Ajuste pela fase: superávit leve na base, nunca déficit em semana de prova.', 'Refeições do dia com meta de proteína, carboidrato e gordura.'],
          tabelas: ['planos_nutricionais', 'refeicoes_prescritas'],
        },
        {
          id: 'nutricao-registros', nome: 'Refeições registradas', icone: 'prato',
          resumo: 'O que o atleta logou na página dele, comparado ao plano.',
          bullets: ['Registro por dia com estimativa de calorias e macros.', 'Adesão ao plano na semana.'],
          tabelas: ['registros_alimentares'],
        },
        {
          id: 'nutricao-acompanhamento', nome: 'Acompanhamento', icone: 'pulso',
          resumo: 'Peso e composição cruzados com adesão e carga de treino.',
          bullets: ['Alerta de risco quando o peso cai rápido junto com PSE alto.', 'Linha do tempo única de treino, peso e alimentação.'],
          tabelas: ['perfis_antropometricos', 'registros_alimentares', 'pse_sessao'],
        },
      ],
    },
    {
      titulo: 'Revisão',
      itens: [
        {
          id: 'revisao', nome: 'Rascunhos para revisar', icone: 'olho',
          resumo: 'Sugestões em texto geradas a partir dos dados. Nada vai ao atleta sem aprovação.',
          bullets: ['Cada rascunho pode ser aprovado, editado ou descartado.', 'Só o motor de regras roda sozinho; a camada assistida nunca aplica nada direto.'],
          tabelas: [],
        },
      ],
    },
  ];

  const ROTAS = {};
  GRUPOS.forEach((g) => g.itens.forEach((i) => { ROTAS[i.id] = i; }));
  const PADRAO = 'treinos-periodizacao';

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function montarNav() {
    return GRUPOS.map((g) => `
      <div class="nav-group">
        <div class="nav-title">${esc(g.titulo)}</div>
        ${g.itens.map((i) => i.existente
          ? `<span class="nav-link" aria-disabled="true" title="Já existe no sistema atual, fora desta etapa">${icon(i.icone)}${esc(i.nome)}<span class="nav-tag">atual</span></span>`
          : `<a class="nav-link" href="#${i.id}" data-rota="${i.id}">${icon(i.icone)}${esc(i.nome)}${i.pronta ? '' : '<span class="nav-tag">em breve</span>'}</a>`).join('')}
      </div>`).join('');
  }

  function pendente(item) {
    return `
      <header class="page-head">
        <div>
          <h1>${esc(item.nome)}</h1>
          <p class="lead">${esc(item.resumo)}</p>
        </div>
      </header>
      <section class="card pending">
        <span class="label">Próxima etapa do frontend</span>
        <p>Esta tela ainda não foi montada. Ela vai conter:</p>
        <ul>${item.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
        ${item.tabelas.length ? `<p>Tabelas no schema <code>ft</code>: ${item.tabelas.map((t) => `<code>${esc(t)}</code>`).join(' ')}</p>` : ''}
      </section>`;
  }

  function rotear() {
    const id = location.hash.slice(1);
    const rota = ROTAS[id] && !ROTAS[id].existente ? id : PADRAO;
    const item = ROTAS[rota];
    const main = document.getElementById('conteudo');

    document.querySelectorAll('.nav-link[data-rota]').forEach((a) => {
      if (a.dataset.rota === rota) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    const view = window.Farol.views && window.Farol.views[rota];
    if (item.pronta && view) view(main);
    else main.innerHTML = pendente(item);

    document.title = `${item.nome} | Farol Tático`;
    const nav = document.getElementById('nav');
    if (nav.dataset.open === 'true' && matchMedia('(max-width: 860px)').matches) fecharMenu();
  }

  function fecharMenu() {
    document.getElementById('nav').dataset.open = 'false';
    document.getElementById('menu-btn').setAttribute('aria-expanded', 'false');
  }

  function iniciar() {
    const nav = document.getElementById('nav');
    nav.innerHTML = montarNav();

    const btn = document.getElementById('menu-btn');
    btn.addEventListener('click', () => {
      const aberto = nav.dataset.open === 'true';
      nav.dataset.open = aberto ? 'false' : 'true';
      btn.setAttribute('aria-expanded', String(!aberto));
    });

    window.addEventListener('hashchange', rotear);
    rotear();
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
