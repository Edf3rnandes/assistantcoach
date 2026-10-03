/* Planejamento > Periodização
   Casca da tela: escolha do plano, faixa de situação e as três escalas de zoom
   (macrociclo, mesociclo, microciclo), cada uma num módulo próprio (macro.js, meso.js, micro.js). */
(function () {
  const { dados, util } = window.Farol;
  const { DIA, dd } = util;
  const P = (window.Farol.periodo = window.Farol.periodo || {});

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const estado = {
    planoId: dados.planos[0].id,
    nivel: 'macro',
    ciclo: null,
    mesoId: null,
    semana: null,
    editor: null,
    confirmaCopia: false,
    noite: false,
    focoEditor: false,
  };

  const NIVEIS = [
    { id: 'macro', nome: 'Macrociclo' },
    { id: 'meso', nome: 'Mesociclo' },
    { id: 'micro', nome: 'Microciclo' },
  ];

  function status(plano) {
    const ciclo = plano.cicloAtual >= 0
      ? plano.ciclos[plano.cicloAtual]
      : plano.ciclos.find((c) => c.estado === 'planejado') || plano.ciclos[plano.ciclos.length - 1];
    const sem = plano.semanaAtual >= 0 ? plano.semanas[plano.semanaAtual] : null;
    const meso = plano.mesos.find((m) => m.id === plano.mesoAtual);
    const dias = Math.round((ciclo.alvo.data - dados.HOJE) / DIA);

    return `
      <div class="status-item">
        ${sem
          ? `<strong class="num">Semana ${sem.n - ciclo.semanaIni} de ${ciclo.semanas}</strong>
             <span class="sub">${esc(ciclo.nome)} · ${dd(sem.inicio)} a ${dd(sem.inicio + 6 * DIA)}</span>`
          : `<strong>Fora do período</strong><span class="sub">${dd(plano.inicioMs)} a ${dd(plano.fimMs)}</span>`}
      </div>
      <div class="status-item">
        <strong>${meso ? `<span class="dot" style="background:var(${meso.cor})"></span>${esc(meso.nome)}` : 'Sem fase ativa'}</strong>
        <span class="sub">Fase atual${sem ? ` · microciclo ${esc(dados.TIPOS_MICRO[sem.microTipo].nome.toLowerCase())}` : ''}</span>
      </div>
      <div class="status-item">
        <strong class="num">${dias >= 0 ? `${dias} dias` : 'Concluída'}</strong>
        <span class="sub">Até o alvo do ciclo: ${esc(ciclo.alvo.nome)}, ${dd(ciclo.alvo.data)}</span>
      </div>`;
  }

  function render(root, foco) {
    const plano = dados.plano(estado.planoId);
    if (estado.ciclo == null) estado.ciclo = plano.cicloAtual >= 0 ? plano.cicloAtual : 0;
    estado.ciclo = Math.min(estado.ciclo, plano.ciclos.length - 1);

    const rotuloNivel = {
      macro: plano.temporada,
      meso: plano.ciclos[estado.ciclo].nome,
      micro: `Semana ${(estado.semana != null ? estado.semana : Math.max(0, plano.semanaAtual)) + 1}`,
    };

    root.innerHTML = `
      <header class="page-head">
        <div>
          <span class="chip" style="margin-bottom:10px">Dados de exemplo</span>
          <h1>Periodização</h1>
          <p class="lead">Planeje a temporada em três escalas. A competição alvo define o fim de cada ciclo, e a carga de cada semana é a soma das suas sessões.</p>
        </div>
        <div class="field">
          <label class="label" for="plano-sel">Plano</label>
          <select class="select" id="plano-sel">
            ${dados.planos.map((p) => `<option value="${p.id}" ${p.id === plano.id ? 'selected' : ''}>${esc(p.nome)} (${esc(p.detalhe)})</option>`).join('')}
          </select>
        </div>
      </header>

      <section class="status" aria-label="Situação do plano">${status(plano)}</section>

      <div class="tabs" role="tablist" aria-label="Escala do planejamento">
        ${NIVEIS.map((n) => `
          <button class="tab" role="tab" id="tab-${n.id}" data-nivel="${n.id}" aria-selected="${n.id === estado.nivel}" aria-controls="corpo" tabindex="${n.id === estado.nivel ? 0 : -1}">
            <span class="tab-nome">${n.nome}</span><span class="tab-sub">${esc(rotuloNivel[n.id])}</span>
          </button>`).join('')}
      </div>

      <div id="corpo" class="corpo" role="tabpanel" aria-labelledby="tab-${estado.nivel}"></div>`;

    const ctx = {
      plano,
      estado,
      ir(nivel, patch, seletor) {
        Object.assign(estado, { nivel }, patch || {});
        render(root, seletor);
      },
    };

    P[estado.nivel](root.querySelector('#corpo'), ctx);

    root.querySelector('#plano-sel').addEventListener('change', (e) => {
      Object.assign(estado, { planoId: e.target.value, ciclo: null, mesoId: null, semana: null, editor: null, confirmaCopia: false });
      render(root, '#plano-sel');
    });

    const abas = [...root.querySelectorAll('.tab')];
    const abrir = (b) => ctx.ir(b.dataset.nivel, { editor: null, confirmaCopia: false }, `#tab-${b.dataset.nivel}`);
    abas.forEach((b, i) => {
      b.addEventListener('click', () => abrir(b));
      b.addEventListener('keydown', (e) => {
        const passo = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!passo) return;
        e.preventDefault();
        abrir(abas[(i + passo + abas.length) % abas.length]);
      });
    });

    if (foco) {
      const el = root.querySelector(foco);
      if (el && !el.disabled) el.focus({ preventScroll: true });
    }
  }

  window.Farol.views = window.Farol.views || {};
  window.Farol.views['treinos-periodizacao'] = (root) => render(root);
})();
