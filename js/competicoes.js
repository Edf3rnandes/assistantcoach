/* Planejamento > Competições
   Cada competição do calendário tem um planejamento próprio: duplas (previstas e confirmadas),
   viagem e orçamento, equipe de professores, bate-bola pré-torneio e resultados.
   As competições são do clube: a mesma pode ser alvo de um plano e etapa de outro. */
(function () {
  const { dados, util, elenco, calendario: CAL } = window.Farol;
  const { DIA, dd, ano, brl, esc, plural, iso, ms, HOJE } = util;
  const { ATLETAS, ATLETAS_LISTA, TURMAS, PROFS } = elenco;

  const estado = { sel: null, filtro: 'proximas', aviso: '', nova: false, editar: false };

  const CAD = window.Farol.elenco.cadastro;
  const ANO = (c) => new Date(c.data).getUTCFullYear();
  const nomeDupla = (d) => `${ATLETAS[d.a].nome} e ${ATLETAS[d.b].nome}`;
  const periodo = (c) => (CAL.fimDe(c) > c.data ? `${dd(c.data)} a ${dd(CAL.fimDe(c))}` : dd(c.data));
  const periodoAno = (c) => `${periodo(c)}/${ano(c.data)}`;

  function usadaPor(id) {
    const lista = [];
    dados.planos.forEach((p) => {
      p.ciclos.forEach((c) => { if (c.comps.some((q) => q.id === id)) lista.push({ plano: p, ciclo: c, alvo: c.alvo.id === id }); });
    });
    return lista;
  }

  const pill = (p) => `<span class="pill pill-${p.estado}" title="${esc(p.nome)}: ${esc(p.texto)}"><span class="pill-dot"></span><b>${esc(p.nome)}</b> ${esc(p.texto)}</span>`;

  /* ---------- Lista ---------- */

  function lista(root) {
    const todas = CAL.lista();
    const futuras = todas.filter((c) => !CAL.passada(c));
    const passadas = todas.filter((c) => CAL.passada(c)).reverse();
    const mostrar = estado.filtro === 'proximas' ? futuras : estado.filtro === 'passadas' ? passadas : todas;

    root.innerHTML = `
      <header class="page-head">
        <div>
          ${window.Farol.conta.guardaDados() ? '' : '<span class="chip" style="margin-bottom:10px">Dados de exemplo</span>'}
          <h1>Competições</h1>
          <p class="lead">Planeje cada campeonato: quais duplas vão, quem está confirmado, viagem e custos, professores acompanhando e o resultado depois.</p>
        </div>
        <button class="btn btn-primary" id="nova-comp">Nova competição</button>
      </header>

      ${estado.aviso ? `<div class="aviso-ok" role="status">${esc(estado.aviso)}</div>` : ''}
      ${estado.nova ? formNova() : ''}

      <div class="seg-ctl" role="group" aria-label="Período">
        ${[['proximas', `Próximas (${futuras.length})`], ['passadas', `Já realizadas (${passadas.length})`], ['todas', 'Todas']].map(([k, n]) => `<button class="seg-btn" data-filtro="${k}" aria-pressed="${estado.filtro === k}">${n}</button>`).join('')}
      </div>

      <div class="comp-lista">
        ${mostrar.map((c) => {
          const uso = usadaPor(c.id);
          const dias = Math.round((c.data - HOJE) / DIA);
          return `
          <button class="comp-card" data-abrir="${c.id}">
            <span class="comp-data num"><b>${dd(c.data)}</b><small>${ano(c.data)}</small></span>
            <span class="comp-corpo">
              <span class="comp-titulo">${esc(c.nome)}${uso.some((u) => u.alvo) ? ' <span class="chip chip-beam">alvo</span>' : ''}${c.status === 'provisional' ? ' <span class="chip">provisória</span>' : c.status === 'cancelled' ? ' <span class="chip">cancelada</span>' : ''}</span>
              <span class="comp-sub">${esc(c.local)} · ${esc(c.nivel)} · ${periodo(c)} · ${CAL.passada(c) ? 'realizada' : dias === 0 ? 'hoje' : `em ${dias} dias`}</span>
              <span class="comp-cats">${c.categorias.map((k) => `<span class="chip">${esc(k)}</span>`).join('')}</span>
              <span class="pills">${CAL.prontidao(c.id).map(pill).join('')}</span>
            </span>
          </button>`;
        }).join('') || '<p class="vazio">Nenhuma competição neste filtro.</p>'}
      </div>`;

    root.querySelectorAll('[data-filtro]').forEach((b) => b.addEventListener('click', () => { estado.filtro = b.dataset.filtro; lista(root); }));
    root.querySelectorAll('[data-abrir]').forEach((b) => b.addEventListener('click', () => { estado.sel = b.dataset.abrir; estado.aviso = ''; detalhe(root); window.scrollTo({ top: 0 }); }));
    root.querySelector('#nova-comp').addEventListener('click', () => { estado.nova = !estado.nova; lista(root); if (estado.nova) root.querySelector('#nc-nome').focus(); });

    const f = root.querySelector('#form-nova');
    if (f) {
      root.querySelector('#nc-cancelar').addEventListener('click', () => { estado.nova = false; lista(root); });
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const nome = root.querySelector('#nc-nome').value.trim();
        const data = root.querySelector('#nc-data').value;
        const fim = root.querySelector('#nc-fim').value || data;
        const cats = [...f.querySelectorAll('input[name="nc-cat"]:checked')].map((i) => i.value);
        const erro = root.querySelector('#nc-erro');
        let msg = '';
        if (!nome) msg = 'Dê um nome à competição.';
        else if (!data) msg = 'Informe a data de início.';
        else if (fim < data) msg = 'A data final não pode ser antes da inicial.';
        else if (!cats.length) msg = 'Marque ao menos uma categoria.';
        if (msg) { erro.textContent = msg; erro.hidden = false; return; }
        const id = CAL.criar({ nome, data: ms(data), fim: ms(fim), local: root.querySelector('#nc-local').value.trim() || 'A definir', nivel: root.querySelector('#nc-nivel').value, status: root.querySelector('#nc-status').value, categorias: cats });
        estado.nova = false; estado.sel = id; estado.aviso = 'Competição criada. Monte o planejamento abaixo.';
        detalhe(root);
        window.scrollTo({ top: 0 });
      });
    }
  }

  function formNova() {
    return `
      <form class="card editor" id="form-nova" novalidate>
        <div class="card-head"><h2>Nova competição</h2></div>
        <div class="form-grid">
          <div class="field field-wide"><label class="label" for="nc-nome">Nome</label><input class="input" id="nc-nome" type="text" maxlength="80" placeholder="Ex.: Etapa Estadual de Areia"></div>
          <div class="field"><label class="label" for="nc-data">Início</label><input class="input" id="nc-data" type="date"></div>
          <div class="field"><label class="label" for="nc-fim">Fim</label><input class="input" id="nc-fim" type="date"></div>
          <div class="field"><label class="label" for="nc-nivel">Nível</label><select class="select" id="nc-nivel" style="min-width:0">${CAL.NIVEIS.map((n) => `<option>${n}</option>`).join('')}</select></div>
          <div class="field"><label class="label" for="nc-status">Situação</label><select class="select" id="nc-status" style="min-width:0"><option value="confirmed">Confirmada</option><option value="provisional">Provisória (data incerta)</option></select></div>
          <div class="field field-wide"><label class="label" for="nc-local">Local</label><input class="input" id="nc-local" type="text" maxlength="60" placeholder="Cidade/UF"></div>
        </div>
        <fieldset class="reg-fund"><legend class="label">Categorias</legend>
          <div class="checks">${CAL.categorias().map((k) => `<label class="check chipcheck"><input type="checkbox" name="nc-cat" value="${k}"><span>${k}</span></label>`).join('')}</div>
        </fieldset>
        <p class="form-erro" id="nc-erro" role="alert" hidden></p>
        <div class="actions"><button class="btn btn-primary" type="submit">Criar competição</button><button class="btn" type="button" id="nc-cancelar">Cancelar</button></div>
      </form>`;
  }

  /* ---------- Detalhe ---------- */

  function secaoDados(c) {
    if (!estado.editar) return '';
    return `
      <form class="card editor" id="form-dados" novalidate>
        <div class="card-head"><h2>Dados da competição</h2></div>
        <div class="form-grid">
          <div class="field field-wide"><label class="label" for="dc-nome">Nome</label><input class="input" id="dc-nome" type="text" maxlength="80" value="${esc(c.nome)}"></div>
          <div class="field"><label class="label" for="dc-data">Início</label><input class="input" id="dc-data" type="date" value="${iso(c.data)}"></div>
          <div class="field"><label class="label" for="dc-fim">Fim</label><input class="input" id="dc-fim" type="date" value="${iso(CAL.fimDe(c))}"></div>
          <div class="field"><label class="label" for="dc-nivel">Nível</label><select class="select" id="dc-nivel" style="min-width:0">${CAL.NIVEIS.map((n) => `<option ${n === c.nivel ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <div class="field"><label class="label" for="dc-status">Situação</label><select class="select" id="dc-status" style="min-width:0">${[['confirmed', 'Confirmada'], ['provisional', 'Provisória (data incerta)'], ['cancelled', 'Cancelada']].map(([k, n]) => `<option value="${k}" ${(c.status || 'confirmed') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <div class="field field-wide"><label class="label" for="dc-local">Local</label><input class="input" id="dc-local" type="text" maxlength="60" value="${esc(c.local)}"></div>
        </div>
        <fieldset class="reg-fund"><legend class="label">Categorias</legend>
          <div class="checks">${CAL.categorias().map((k) => `<label class="check chipcheck"><input type="checkbox" name="dc-cat" value="${k}" ${c.categorias.includes(k) ? 'checked' : ''}><span>${k}</span></label>`).join('')}</div>
        </fieldset>
        <p class="form-erro" id="dc-erro" role="alert" hidden></p>
        <div class="actions"><button class="btn btn-primary" type="submit">Salvar dados</button><button class="btn" type="button" id="dc-cancelar">Cancelar</button></div>
      </form>`;
  }

  function secaoDuplas(c, p) {
    const conf = p.duplas.filter((d) => d.status === 'confirmada').length;
    const prev = p.duplas.filter((d) => d.status === 'prevista').length;
    const res = p.duplas.filter((d) => d.status === 'reserva').length;
    const porCat = c.categorias.map((k) => ({ k, duplas: p.duplas.filter((d) => d.cat === k) })).filter((x) => x.duplas.length);
    const catPadrao = c.categorias[0];

    return `
      <section class="card" aria-labelledby="h-duplas">
        <div class="card-head">
          <h2 id="h-duplas">Duplas</h2>
          <span class="label num">${conf} confirmadas · ${prev} previstas · ${res} reserva</span>
        </div>
        ${p.duplas.length ? porCat.map(({ k, duplas }) => `
          <h3 class="sub-h">${esc(k)}</h3>
          <div class="table-scroll">
          <table class="mesos duplas">
            <thead><tr><th>Dupla</th><th>Situação</th><th></th></tr></thead>
            <tbody>
              ${duplas.map((d) => `
                <tr>
                  <td>${esc(nomeDupla(d))}${(() => { const A = ATLETAS[d.a], B = ATLETAS[d.b]; if (!A || !B) return ''; const ac = [A, B].some((x) => CAD.podeJogar(x, d.cat, ANO(c)).acima); return `<small class="sub-linha">${esc(A.faixa)}${A.faixa === B.faixa ? '' : ` e ${esc(B.faixa)}`}${ac ? ' · <b class="dupla-acima">joga acima</b>' : ''}</small>`; })()}</td>
                  <td>
                    <select class="select sm st-${d.status}" data-dupla-status="${d.id}" aria-label="Situação da dupla ${esc(nomeDupla(d))}">
                      ${Object.entries(CAL.STATUS_DUPLA).map(([s, v]) => `<option value="${s}" ${s === d.status ? 'selected' : ''}>${v.nome}</option>`).join('')}
                    </select>
                  </td>
                  <td class="r"><button class="link-btn" style="margin:0" data-dupla-rem="${d.id}" aria-label="Remover a dupla ${esc(nomeDupla(d))}">Remover</button></td>
                </tr>`).join('')}
            </tbody>
          </table></div>`).join('') : '<p class="vazio">Nenhuma dupla ainda. Monte as duplas abaixo.</p>'}

        <form class="add-linha" id="form-dupla" novalidate>
          <div class="field"><label class="label" for="fd-cat">Categoria</label>
            <select class="select" id="fd-cat" style="min-width:0">${c.categorias.map((k) => `<option>${k}</option>`).join('')}</select></div>
          <div class="field"><label class="label" for="fd-filtro">Atletas de</label>
            <select class="select" id="fd-filtro" style="min-width:0">${CAD.filtrosAtletas().map((o) => `<option value="${o.v}">${esc(o.n)}</option>`).join('')}</select></div>
          <div class="field"><label class="label" for="fd-a">Atleta 1</label><select class="select" id="fd-a" style="min-width:0"></select></div>
          <div class="field"><label class="label" for="fd-b">Atleta 2</label><select class="select" id="fd-b" style="min-width:0"></select></div>
          <div class="field"><label class="label" for="fd-st">Situação</label>
            <select class="select" id="fd-st" style="min-width:0">${Object.entries(CAL.STATUS_DUPLA).map(([s, v]) => `<option value="${s}" ${s === 'prevista' ? 'selected' : ''}>${v.nome}</option>`).join('')}</select></div>
          <button class="btn btn-primary" type="submit">Adicionar dupla</button>
        </form>
        <p class="form-erro" id="fd-erro" role="alert" hidden></p>
        <p class="hint" id="fd-info" role="status" style="margin-bottom:6px"></p>
        <p class="hint"><b>Prevista</b> é a dupla que queremos levar. <b>Confirmada</b> é a que já tem inscrição feita. Só as confirmadas entram na conta de quem viaja. Categoria inicial: ${esc(catPadrao)}.</p>
      </section>`;
  }

  function secaoViagem(c, p) {
    const v = p.viagem;
    const qv = CAL.quemVai(c.id);
    const pessoas = qv.atletas.length + qv.equipe.length;
    return `
      <section class="card" aria-labelledby="h-viagem">
        <div class="card-head">
          <h2 id="h-viagem">Viagem e logística</h2>
          <span class="label num">${plural(qv.atletas.length, 'atleta', 'atletas')} · ${plural(qv.equipe.length, 'professor', 'professores')} · ${plural(pessoas, 'pessoa', 'pessoas')}</span>
        </div>
        <form id="form-viagem" novalidate>
          <label class="check" style="margin-bottom:14px"><input type="checkbox" id="fv-nec" ${v.necessaria ? 'checked' : ''}><span><b>Há viagem</b> para esta competição</span></label>
          <div id="fv-campos" ${v.necessaria ? '' : 'hidden'}>
            <div class="form-grid">
              <div class="field"><label class="label" for="fv-saida">Saída</label><input class="input" id="fv-saida" type="date" value="${esc(v.saida)}"></div>
              <div class="field"><label class="label" for="fv-ret">Retorno</label><input class="input" id="fv-ret" type="date" value="${esc(v.retorno)}"></div>
              <div class="field"><label class="label" for="fv-cheg">Chegada (data e hora)</label><input class="input" id="fv-cheg" type="text" maxlength="30" value="${esc(v.chegada)}" placeholder="26/11 às 12h"></div>
              <div class="field field-wide"><label class="label" for="fv-trans">Transporte</label><input class="input" id="fv-trans" type="text" maxlength="120" value="${esc(v.transporte)}" placeholder="Ex.: duas vans locadas, saída às 5h"></div>
              <div class="field field-wide"><label class="label" for="fv-hosp">Hospedagem</label><input class="input" id="fv-hosp" type="text" maxlength="120" value="${esc(v.hospedagem)}" placeholder="Hotel, diárias e tipo de quarto"></div>
              <div class="field field-wide"><label class="label" for="fv-alim">Alimentação</label><input class="input" id="fv-alim" type="text" maxlength="160" value="${esc(v.alimentacao)}" placeholder="O que está incluso e o que o clube paga"></div>
            </div>
          </div>
          <h3 class="sub-h">Bate-bola pré-torneio</h3>
          <div class="form-grid">
            <div class="field"><label class="label" for="fv-bb-data">Data</label><input class="input" id="fv-bb-data" type="date" value="${esc(v.bateBola.data)}"></div>
            <div class="field"><label class="label" for="fv-bb-hora">Hora</label><input class="input" id="fv-bb-hora" type="time" value="${esc(v.bateBola.hora)}"></div>
            <div class="field"><label class="label" for="fv-bb-local">Local</label><input class="input" id="fv-bb-local" type="text" maxlength="80" value="${esc(v.bateBola.local)}" placeholder="Quadra ou praia"></div>
          </div>
          <div class="actions"><button class="btn btn-primary" type="submit">Salvar logística</button></div>
        </form>
        ${pessoas ? `<div class="detail-block"><span class="label">Quem vai</span>
          <p><b>Atletas confirmados:</b> ${qv.atletas.length ? qv.atletas.map((a) => esc(ATLETAS[a].nome)).join(', ') : 'nenhum ainda'}.</p>
          <p><b>Professores:</b> ${qv.equipe.length ? qv.equipe.map((a) => esc(PROFS[a].nome)).join(', ') : 'nenhum ainda'}.</p></div>` : ''}
      </section>`;
  }

  function secaoOrcamento(c, p) {
    const t = CAL.orcamentoTotais(c.id);
    const qv = CAL.quemVai(c.id);
    const pessoas = qv.atletas.length + qv.equipe.length;
    const dif = t.comReal ? t.real - t.previsto : null;
    return `
      <section class="card" aria-labelledby="h-orc">
        <div class="card-head">
          <h2 id="h-orc">Roteiro financeiro</h2>
          <span class="label">Valores em reais</span>
        </div>
        ${p.orcamento.length ? `
        <div class="table-scroll">
          <table class="mesos orc">
            <thead><tr><th>Item</th><th>Tipo</th><th class="r">Previsto</th><th class="r">Real</th><th></th></tr></thead>
            <tbody>
              ${p.orcamento.map((i) => `
                <tr data-item="${i.id}">
                  <td><input class="input sm" data-oi="item" value="${esc(i.item)}" aria-label="Descrição do item" maxlength="80"></td>
                  <td><select class="select sm" data-oi="cat" aria-label="Tipo do item" style="min-width:0">${Object.entries(CAL.CATEGORIAS_ORCAMENTO).map(([k, n]) => `<option value="${k}" ${k === i.cat ? 'selected' : ''}>${n}</option>`).join('')}</select></td>
                  <td class="r"><input class="input sm num" data-oi="previsto" type="number" min="0" step="10" value="${i.previsto}" aria-label="Valor previsto"></td>
                  <td class="r"><input class="input sm num" data-oi="real" type="number" min="0" step="10" value="${i.real == null ? '' : i.real}" placeholder="–" aria-label="Valor real"></td>
                  <td class="r"><button class="link-btn" style="margin:0" data-orc-rem="${i.id}" aria-label="Remover ${esc(i.item)}">Remover</button></td>
                </tr>`).join('')}
            </tbody>
            <tfoot><tr>
              <td colspan="2">Total</td>
              <td class="r num" id="orc-prev">${brl(t.previsto)}</td>
              <td class="r num" id="orc-real">${t.comReal ? brl(t.real) : '–'}</td>
              <td></td></tr></tfoot>
          </table>
        </div>
        <div class="orc-resumo">
          <span><b class="num" id="orc-pp">${pessoas ? brl(t.previsto / pessoas) : 'n/d'}</b> por pessoa <small>(${plural(pessoas, 'pessoa', 'pessoas')})</small></span>
          <span><b class="num" id="orc-dif">${dif == null ? 'n/d' : `${dif > 0 ? '+' : ''}${brl(dif)}`}</b> real contra previsto</span>
        </div>` : '<p class="vazio">Nenhum custo lançado. Adicione inscrição, transporte, hospedagem e alimentação.</p>'}
        <form class="add-linha" id="form-orc" novalidate>
          <div class="field" style="grid-column:span 2"><label class="label" for="fo-item">Novo item</label><input class="input" id="fo-item" type="text" maxlength="80" placeholder="Ex.: Hotel, 4 diárias"></div>
          <div class="field"><label class="label" for="fo-cat">Tipo</label><select class="select" id="fo-cat" style="min-width:0">${Object.entries(CAL.CATEGORIAS_ORCAMENTO).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></div>
          <div class="field"><label class="label" for="fo-prev">Previsto (R$)</label><input class="input num" id="fo-prev" type="number" min="0" step="10"></div>
          <button class="btn btn-primary" type="submit">Adicionar</button>
        </form>
        <p class="form-erro" id="fo-erro" role="alert" hidden></p>
      </section>`;
  }

  function secaoEquipe(c, p) {
    const livres = Object.values(PROFS).filter((x) => !p.equipe.some((e) => e.profId === x.id));
    return `
      <section class="card" aria-labelledby="h-eq">
        <div class="card-head"><h2 id="h-eq">Professores acompanhando</h2><span class="label num">${p.equipe.length}</span></div>
        ${p.equipe.length ? `<ul class="equipe">${p.equipe.map((e) => `
          <li>
            <span><b>${esc(PROFS[e.profId].nome)}</b></span>
            <select class="select sm" data-eq-funcao="${e.profId}" aria-label="Função de ${esc(PROFS[e.profId].nome)}" style="min-width:0">${CAL.FUNCOES_EQUIPE.map((f) => `<option ${f === e.funcao ? 'selected' : ''}>${f}</option>`).join('')}</select>
            <button class="link-btn" style="margin:0" data-eq-rem="${e.profId}" aria-label="Remover ${esc(PROFS[e.profId].nome)}">Remover</button>
          </li>`).join('')}</ul>` : '<p class="vazio">Nenhum professor definido para esta competição.</p>'}
        ${livres.length ? `
        <form class="add-linha" id="form-eq" novalidate>
          <div class="field"><label class="label" for="fe-prof">Professor</label><select class="select" id="fe-prof" style="min-width:0">${livres.map((x) => `<option value="${x.id}">${esc(x.nome)}</option>`).join('')}</select></div>
          <div class="field"><label class="label" for="fe-fun">Função na competição</label><select class="select" id="fe-fun" style="min-width:0">${CAL.FUNCOES_EQUIPE.map((f) => `<option>${f}</option>`).join('')}</select></div>
          <button class="btn btn-primary" type="submit">Adicionar</button>
        </form>` : ''}
      </section>`;
  }

  function secaoResultados(c, p) {
    const confirmadas = p.duplas.filter((d) => d.status === 'confirmada');
    const acontece = c.data <= HOJE;
    if (!confirmadas.length) {
      return `<section class="card" aria-labelledby="h-res"><div class="card-head"><h2 id="h-res">Resultados</h2></div><p class="vazio">Os resultados são lançados por dupla confirmada. Confirme as duplas para habilitar.</p></section>`;
    }
    return `
      <section class="card" aria-labelledby="h-res">
        <div class="card-head"><h2 id="h-res">Resultados</h2><span class="label num">${p.resultados.length} de ${confirmadas.length} duplas lançadas</span></div>
        ${acontece ? '' : '<p class="hint" style="margin:0 0 12px">A competição ainda não aconteceu. Os campos abrem a partir do primeiro dia.</p>'}
        <form id="form-res" novalidate>
          <div class="table-scroll">
            <table class="mesos res">
              <thead><tr><th>Dupla</th><th>Fase alcançada</th><th>Colocação</th><th class="r">V</th><th class="r">D</th><th>Observação</th></tr></thead>
              <tbody>
                ${confirmadas.map((d) => {
                  const r = p.resultados.find((x) => x.duplaId === d.id) || {};
                  const dis = acontece ? '' : 'disabled';
                  return `<tr data-dupla="${d.id}">
                    <td><b>${esc(nomeDupla(d))}</b><br><small style="color:var(--ink-2)">${esc(d.cat)}</small></td>
                    <td><input class="input sm" data-r="fase" value="${esc(r.fase || '')}" maxlength="40" placeholder="Semifinal" aria-label="Fase alcançada por ${esc(nomeDupla(d))}" ${dis}></td>
                    <td><input class="input sm" data-r="colocacao" value="${esc(r.colocacao || '')}" maxlength="30" placeholder="3º lugar" aria-label="Colocação de ${esc(nomeDupla(d))}" ${dis}></td>
                    <td class="r"><input class="input sm num" data-r="v" type="number" min="0" max="20" value="${r.v == null ? '' : r.v}" aria-label="Vitórias de ${esc(nomeDupla(d))}" ${dis}></td>
                    <td class="r"><input class="input sm num" data-r="d" type="number" min="0" max="20" value="${r.d == null ? '' : r.d}" aria-label="Derrotas de ${esc(nomeDupla(d))}" ${dis}></td>
                    <td><input class="input sm" data-r="obs" value="${esc(r.obs || '')}" maxlength="160" placeholder="Opcional" aria-label="Observação sobre ${esc(nomeDupla(d))}" ${dis}></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
          <div class="actions" style="margin-top:12px"><button class="btn btn-primary" type="submit" ${acontece ? '' : 'disabled'}>Salvar resultados</button></div>
        </form>
      </section>`;
  }


  function secaoPreparo(c) {
    const blocos = [];
    dados.planos.forEach((pl) => {
      const idx = pl.semanas.findIndex((s) => s.competicoes.some((q) => q.id === c.id));
      if (idx < 0) return;
      const ini = Math.max(0, idx - 3);
      blocos.push({ pl, semanas: pl.semanas.slice(ini, idx + 1) });
    });
    if (!blocos.length) return '';
    return `
      <section class="card" aria-labelledby="h-prep">
        <div class="card-head"><h2 id="h-prep">Preparação nos planos de treino</h2><span class="label">Últimas semanas antes da competição</span></div>
        ${blocos.map(({ pl, semanas }) => `
          <div class="detail-block" style="margin-top:0"><span class="label">${esc(pl.nome)}</span>
            <div class="weeks">${semanas.map((s) => `
              <button class="week-chip" data-prep="${pl.id}:${s.idx}">
                <span class="num"><b>S${s.n}</b> ${dd(s.inicio)}</span>
                <span>${esc(dados.TIPOS_MICRO[s.microTipo].nome)}</span>
                <span class="num">${Math.round(s.planejado).toLocaleString('pt-BR')} UA</span>
              </button>`).join('')}</div></div>`).join('')}
      </section>`;
  }

  function detalhe(root) {
    const c = CAL.COMPETICOES[estado.sel];
    if (!c) { estado.sel = null; lista(root); return; }
    const p = CAL.plan(c.id);
    const uso = usadaPor(c.id);
    const dias = Math.round((c.data - HOJE) / DIA);

    root.innerHTML = `
      <div><button class="link-btn" id="voltar" style="margin:0">‹ Todas as competições</button></div>
      <header class="page-head">
        <div>
          ${window.Farol.conta.guardaDados() ? '' : '<span class="chip" style="margin-bottom:10px">Dados de exemplo</span>'}
          <h1>${esc(c.nome)}</h1>
          <p class="lead num">${periodoAno(c)} · ${esc(c.local)} · ${esc(c.nivel)} · ${CAL.passada(c) ? 'realizada' : dias === 0 ? 'hoje' : `em ${dias} dias`}</p>
          <p class="cats">${c.categorias.map((k) => `<span class="chip">${esc(k)}</span>`).join(' ')}</p>
        </div>
        <button class="btn" id="editar-dados">${estado.editar ? 'Fechar edição' : 'Editar dados'}</button>
      </header>

      ${estado.aviso ? `<div class="aviso-ok" role="status">${esc(estado.aviso)}</div>` : ''}

      <section class="status" aria-label="Situação do preparo">
        <div class="status-item" style="flex:1 1 100%"><span class="label">Preparo</span><span class="pills" style="margin-top:6px">${CAL.prontidao(c.id).map(pill).join('')}</span></div>
        ${uso.length ? `<div class="status-item" style="flex:1 1 100%"><span class="label">Nos planos de treino</span><span class="pills" style="margin-top:6px">${uso.map((u) => `<span class="chip ${u.alvo ? 'chip-beam' : ''}">${u.alvo ? 'Alvo' : 'Etapa'} · ${esc(u.plano.nome)}, ${esc(u.ciclo.nome)}</span>`).join('')}</span></div>` : ''}
      </section>

      ${secaoDados(c)}
      ${secaoDuplas(c, p)}
      ${secaoViagem(c, p)}
      ${secaoOrcamento(c, p)}
      ${secaoEquipe(c, p)}
      ${secaoResultados(c, p)}

      <section class="card" aria-labelledby="h-notas">
        <div class="card-head"><h2 id="h-notas">Anotações</h2></div>
        <form id="form-notas"><textarea class="input" id="fn-notas" rows="3" placeholder="Observações gerais da competição" aria-label="Anotações da competição">${esc(p.notas)}</textarea>
        <div class="actions" style="margin-top:12px"><button class="btn btn-primary" type="submit">Salvar anotações</button></div></form>
      </section>

      ${secaoPreparo(c)}`;

    ligar(root, c, p);
  }

  function ligar(root, c, p) {
    const $ = (s) => root.querySelector(s);
    const recarregar = (aviso, foco) => { estado.aviso = aviso || ''; const y = window.scrollY; detalhe(root); window.scrollTo({ top: y }); if (foco) { const f = $(foco); if (f) f.focus({ preventScroll: true }); } };

    $('#voltar').addEventListener('click', () => { estado.sel = null; estado.aviso = ''; estado.editar = false; lista(root); window.scrollTo({ top: 0 }); });
    $('#editar-dados').addEventListener('click', () => { estado.editar = !estado.editar; recarregar('', estado.editar ? '#dc-nome' : null); });

    const fd = $('#form-dados');
    if (fd) {
      $('#dc-cancelar').addEventListener('click', () => { estado.editar = false; recarregar(); });
      fd.addEventListener('submit', (e) => {
        e.preventDefault();
        const nome = $('#dc-nome').value.trim(), data = $('#dc-data').value, fim = $('#dc-fim').value || data;
        const cats = [...fd.querySelectorAll('input[name="dc-cat"]:checked')].map((i) => i.value);
        const erro = $('#dc-erro');
        let msg = '';
        if (!nome) msg = 'Dê um nome à competição.'; else if (!data) msg = 'Informe a data de início.'; else if (fim < data) msg = 'A data final não pode ser antes da inicial.'; else if (!cats.length) msg = 'Marque ao menos uma categoria.';
        if (msg) { erro.textContent = msg; erro.hidden = false; return; }
        CAL.atualizar(c.id, { nome, data: ms(data), fim: ms(fim), nivel: $('#dc-nivel').value, status: $('#dc-status').value, local: $('#dc-local').value.trim() || 'A definir', categorias: cats });
        dados.recarregar();
        estado.editar = false;
        recarregar('Dados salvos.');
      });
    }

    /* duplas */
    const selCat = $('#fd-cat'), selA = $('#fd-a'), selB = $('#fd-b'), selF = $('#fd-filtro');
    const usados = new Set(); p.duplas.forEach((d) => { usados.add(d.a); usados.add(d.b); });
    // Só aparecem atletas livres que podem jogar a categoria: quem é mais velho que a faixa não entra; quem é mais novo entra e "joga acima".
    const preencher = () => {
      const cat = selCat.value;
      const todos = CAD.atletasPor(selF.value).filter((a) => !usados.has(a.id));
      const aptos = todos.filter((a) => CAD.podeJogar(a, cat, ANO(c)).ok);
      const rotulo = (a) => { const r = CAD.podeJogar(a, cat, ANO(c)); const t = TURMAS[a.turma]; return `${esc(a.nome)} (${esc(CAD.faixaDe(a, ANO(c)))}${r.acima ? ', joga acima' : ''}${t ? ` · ${esc(t.nome)}` : ''})`; };
      const opts = aptos.map((a) => `<option value="${a.id}">${rotulo(a)}</option>`).join('');
      selA.innerHTML = opts; selB.innerHTML = opts;
      if (aptos.length > 1) selB.selectedIndex = 1;
      const fora = todos.length - aptos.length;
      $('#fd-info').textContent = aptos.length ? `${aptos.length === 1 ? '1 atleta livre pode' : `${aptos.length} atletas livres podem`} jogar ${cat}${fora ? `; ${fora} ficam de fora por faixa ou gênero` : ''}.` : `Nenhum atleta livre pode jogar ${cat} neste filtro${fora ? ` (${fora} ficam de fora por faixa ou gênero)` : ''}. Troque o filtro ou a categoria.`;
    };
    selCat.addEventListener('change', preencher);
    selF.addEventListener('change', preencher);
    preencher();
    $('#form-dupla').addEventListener('submit', (e) => {
      e.preventDefault();
      const erro = $('#fd-erro');
      const motivo = CAD.validarDupla(selA.value, selB.value, selCat.value, ANO(c));
      if (motivo) { erro.textContent = motivo; erro.hidden = false; return; }
      const r = CAL.adicionarDupla(c.id, { a: selA.value, b: selB.value, cat: selCat.value, status: $('#fd-st').value });
      if (r.erro) { erro.textContent = r.erro; erro.hidden = false; return; }
      recarregar('Dupla adicionada.', '#form-dupla button');
    });
    root.querySelectorAll('[data-dupla-status]').forEach((s) => s.addEventListener('change', () => { CAL.alterarDupla(c.id, s.dataset.duplaStatus, { status: s.value }); recarregar('', `[data-dupla-status="${s.dataset.duplaStatus}"]`); }));
    root.querySelectorAll('[data-dupla-rem]').forEach((b) => b.addEventListener('click', () => { CAL.removerDupla(c.id, b.dataset.duplaRem); recarregar('Dupla removida.'); }));

    /* viagem */
    const nec = $('#fv-nec');
    nec.addEventListener('change', () => { $('#fv-campos').hidden = !nec.checked; });
    $('#form-viagem').addEventListener('submit', (e) => {
      e.preventDefault();
      const v = (id) => $(id).value.trim();
      CAL.salvarViagem(c.id, {
        necessaria: nec.checked,
        saida: v('#fv-saida'), retorno: v('#fv-ret'), chegada: v('#fv-cheg'),
        transporte: v('#fv-trans'), hospedagem: v('#fv-hosp'), alimentacao: v('#fv-alim'),
        bateBola: { data: v('#fv-bb-data'), hora: v('#fv-bb-hora'), local: v('#fv-bb-local') },
      });
      recarregar('Logística salva.');
    });

    /* orçamento: salva ao sair do campo e atualiza os totais sem refazer a tela */
    const totais = () => {
      const t = CAL.orcamentoTotais(c.id);
      const qv = CAL.quemVai(c.id);
      const pessoas = qv.atletas.length + qv.equipe.length;
      const set = (id, txt) => { const el = $(id); if (el) el.textContent = txt; };
      set('#orc-prev', brl(t.previsto));
      set('#orc-real', t.comReal ? brl(t.real) : '–');
      set('#orc-pp', pessoas ? brl(t.previsto / pessoas) : 'n/d');
      set('#orc-dif', t.comReal ? `${t.real - t.previsto > 0 ? '+' : ''}${brl(t.real - t.previsto)}` : 'n/d');
    };
    root.querySelectorAll('tr[data-item] [data-oi]').forEach((el) => {
      const salvar = () => {
        const id = el.closest('tr').dataset.item;
        const campo = el.dataset.oi;
        let val = el.value;
        if (campo === 'previsto') val = Math.max(0, Number(val) || 0);
        else if (campo === 'real') val = val === '' ? null : Math.max(0, Number(val) || 0);
        else if (campo === 'item') val = val.trim() || 'Item';
        CAL.alterarItem(c.id, id, { [campo]: val });
        totais();
      };
      el.addEventListener('change', salvar);
      if (el.type === 'number') el.addEventListener('input', salvar);
    });
    root.querySelectorAll('[data-orc-rem]').forEach((b) => b.addEventListener('click', () => { CAL.removerItem(c.id, b.dataset.orcRem); recarregar('Item removido.'); }));
    $('#form-orc').addEventListener('submit', (e) => {
      e.preventDefault();
      const item = $('#fo-item').value.trim(), prev = Number($('#fo-prev').value);
      const erro = $('#fo-erro');
      if (!item) { erro.textContent = 'Descreva o item de custo.'; erro.hidden = false; return; }
      if (!(prev >= 0) || $('#fo-prev').value === '') { erro.textContent = 'Informe o valor previsto.'; erro.hidden = false; return; }
      CAL.adicionarItem(c.id, { item, cat: $('#fo-cat').value, previsto: prev });
      recarregar('Item adicionado.', '#fo-item');
    });

    /* equipe */
    const fe = $('#form-eq');
    if (fe) fe.addEventListener('submit', (e) => { e.preventDefault(); CAL.adicionarProf(c.id, $('#fe-prof').value, $('#fe-fun').value); recarregar('Professor adicionado.'); });
    root.querySelectorAll('[data-eq-funcao]').forEach((s) => s.addEventListener('change', () => { const e = p.equipe.find((x) => x.profId === s.dataset.eqFuncao); e.funcao = s.value; }));
    root.querySelectorAll('[data-eq-rem]').forEach((b) => b.addEventListener('click', () => { CAL.removerProf(c.id, b.dataset.eqRem); recarregar('Professor removido.'); }));

    /* resultados */
    const fr = $('#form-res');
    if (fr) fr.addEventListener('submit', (e) => {
      e.preventDefault();
      let salvos = 0;
      fr.querySelectorAll('tr[data-dupla]').forEach((tr) => {
        const g = (k) => tr.querySelector(`[data-r="${k}"]`).value.trim();
        const r = { duplaId: tr.dataset.dupla, fase: g('fase'), colocacao: g('colocacao'), v: g('v') === '' ? null : Number(g('v')), d: g('d') === '' ? null : Number(g('d')), obs: g('obs') };
        if (r.fase || r.colocacao || r.v != null || r.d != null || r.obs) { CAL.salvarResultado(c.id, r); salvos++; } else CAL.removerResultado(c.id, r.duplaId);
      });
      recarregar(`Resultados salvos (${plural(salvos, 'dupla', 'duplas')}).`);
    });

    $('#form-notas').addEventListener('submit', (e) => { e.preventDefault(); CAL.salvarNotas(c.id, $('#fn-notas').value.trim()); recarregar('Anotações salvas.'); });

    root.querySelectorAll('[data-prep]').forEach((b) => b.addEventListener('click', () => {
      const [pid, si] = b.dataset.prep.split(':');
      window.Farol.compartilhado.planoId = pid;
      window.Farol.ir('treinos-periodizacao', { nivel: 'micro', semana: Number(si), editor: null });
    }));
  }

  function tela(root, params) {
    if (params && params.nova) { estado.sel = null; estado.nova = true; }
    if (params && params.competicao) { estado.sel = params.competicao; estado.aviso = ''; estado.editar = false; }
    if (estado.sel) detalhe(root); else lista(root);
  }

  window.Farol.views = window.Farol.views || {};
  window.Farol.views['planejamento-competicoes'] = tela;
})();
