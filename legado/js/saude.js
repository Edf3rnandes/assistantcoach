/* Saúde do elenco: cadastro de lesões, retornos e dúvidas (tabela prevista `ocorrencias_saude`).
   Uma ocorrência acompanha o atleta do começo ao fim e guarda a evolução em datas:
     lesão (fora dos treinos) → liberado para retorno (treina com restrições) → alta;
     dúvida (relato a avaliar) → confirmada como lesão ou descartada.
   Só pode haver uma ocorrência ativa por atleta. O que o técnico registrar fica no navegador (`ft.saude.v1`).
   A tela mostra a ocorrência de cada atleta, o histórico e o impacto nas próximas competições. */
(function () {
  const { esc, dd, iso, ms, plural, HOJE, DIA } = window.Farol.util;
  const { ATLETAS, ATLETAS_LISTA, TURMAS, PROFS } = window.Farol.elenco;

  /* ---------- Vocabulário ---------- */

  const TIPOS = {
    lesao: { nome: 'Lesionado', desc: 'Fora dos treinos' },
    retorno: { nome: 'Em retorno', desc: 'Treina com restrições' },
    duvida: { nome: 'Dúvida', desc: 'Avaliar antes de treinar' },
  };
  const REGIOES = ['Cabeça ou pescoço', 'Ombro direito', 'Ombro esquerdo', 'Cotovelo ou antebraço', 'Punho ou mão', 'Dedos', 'Coluna cervical', 'Coluna lombar', 'Quadril ou virilha', 'Coxa anterior', 'Coxa posterior', 'Joelho direito', 'Joelho esquerdo', 'Perna ou panturrilha', 'Tornozelo direito', 'Tornozelo esquerdo', 'Pé', 'Outra região'];
  const RESTRICOES = [['salto', 'Sem saltos'], ['corrida', 'Sem corrida na areia'], ['ataque', 'Sem ataque forte'], ['saque', 'Sem saque viagem'], ['bloqueio', 'Sem bloqueio'], ['queda', 'Sem quedas e mergulhos'], ['fisico', 'Só físico adaptado']];
  const NOME_RESTRICAO = Object.fromEntries(RESTRICOES);

  /* ---------- Dados ---------- */

  const dia = (s) => ms(s);
  const ev = (data, tipo, texto) => ({ data: dia(data), tipo, texto });
  let seq = 0;
  const oc = (o) => ({ id: `o${++seq}`, status: 'ativa', fim: null, desfecho: null, restricoes: [], resp: 'p4', ...o });

  function semear() {
    return [
      oc({ atletaId: 'a9', tipo: 'lesao', regiao: 'Tornozelo direito', texto: 'Entorse de grau 1', desde: dia('2026-09-24'), retorno: dia('2026-10-17'), conduta: 'Fisioterapia diária, sem salto nem corrida na areia', restricoes: ['salto', 'corrida', 'bloqueio'],
        eventos: [ev('2026-09-24', 'abertura', 'Entorse num treino de defesa. Gelo, compressão e imobilização leve.'), ev('2026-09-30', 'evolucao', 'Edema diminuiu. Começou fisioterapia com ultrassom e exercícios de propriocepção.')] }),
      oc({ atletaId: 'd3', tipo: 'lesao', regiao: 'Dedos', texto: 'Fissura no dedo médio', desde: dia('2026-09-28'), retorno: dia('2026-10-26'), conduta: 'Imobilização, só treino físico de membros inferiores', restricoes: ['fisico', 'queda'],
        eventos: [ev('2026-09-28', 'abertura', 'Bloqueio mal feito. Radiografia confirmou fissura.')] }),
      oc({ atletaId: 'c2', tipo: 'retorno', regiao: 'Ombro direito', texto: 'Dor ao atacar', desde: dia('2026-09-14'), retorno: dia('2026-10-08'), conduta: 'Treino adaptado: sem ataque forte nem saque viagem', restricoes: ['ataque', 'saque'],
        eventos: [ev('2026-09-14', 'abertura', 'Dor no ombro ao atacar. Afastada dos treinos de quadra.'), ev('2026-09-30', 'retorno', 'Liberada para treino adaptado, sem ataque forte nem saque viagem.')] }),
      oc({ atletaId: 'b4', tipo: 'duvida', regiao: 'Coluna lombar', texto: 'Dor relatada no último treino', desde: dia('2026-10-01'), retorno: null, conduta: 'Avaliar com o fisioterapeuta antes do próximo treino',
        eventos: [ev('2026-10-01', 'abertura', 'Relato de dor lombar ao final do treino. Sem queda ou torção.')] }),
      oc({ atletaId: 'a3', tipo: 'lesao', regiao: 'Joelho direito', texto: 'Tendinite patelar', desde: dia('2026-08-10'), retorno: dia('2026-08-26'), status: 'encerrada', fim: dia('2026-08-26'), desfecho: 'alta', conduta: 'Fortalecimento e controle de carga de salto',
        eventos: [ev('2026-08-10', 'abertura', 'Dor no joelho nos saltos.'), ev('2026-08-18', 'retorno', 'Liberado para treino sem salto.'), ev('2026-08-26', 'alta', 'Sem dor nos saltos. Alta.')] }),
      oc({ atletaId: 'a6', tipo: 'lesao', regiao: 'Punho ou mão', texto: 'Contusão no punho', desde: dia('2026-08-18'), retorno: dia('2026-08-25'), status: 'encerrada', fim: dia('2026-08-25'), desfecho: 'alta', conduta: 'Repouso e gelo',
        eventos: [ev('2026-08-18', 'abertura', 'Contusão ao defender.'), ev('2026-08-25', 'alta', 'Alta, sem dor.')] }),
      oc({ atletaId: 'd1', tipo: 'lesao', regiao: 'Coxa posterior', texto: 'Estiramento leve', desde: dia('2026-07-20'), retorno: dia('2026-08-12'), status: 'encerrada', fim: dia('2026-08-12'), desfecho: 'alta', conduta: 'Fisioterapia e alongamento',
        eventos: [ev('2026-07-20', 'abertura', 'Estiramento no sprint.'), ev('2026-08-12', 'alta', 'Alta após teste de velocidade sem dor.')] }),
    ];
  }

  const CHAVE = window.Farol.conta.chave('ft.saude.v1');
  let lista = window.Farol.conta.guardaDados() ? [] : semear(); // conta cadastrada começa sem ocorrências de exemplo
  try {
    const g = JSON.parse(localStorage.getItem(CHAVE) || 'null');
    if (g && Array.isArray(g.lista)) { lista = g.lista; seq = Math.max(seq, ...lista.map((x) => +x.id.slice(1) || 0)); }
  } catch (e) { /* sem armazenamento: segue em memória */ }
  const gravar = () => { try { localStorage.setItem(CHAVE, JSON.stringify({ lista })); } catch (e) { /* ignora */ } };

  const obter = (id) => lista.find((x) => x.id === id) || null;
  const ativaDe = (atletaId) => lista.find((x) => x.atletaId === atletaId && x.status === 'ativa') || null;

  const API = {
    TIPOS, REGIOES, RESTRICOES, NOME_RESTRICAO,
    todas: () => lista.slice(),
    ativas: () => lista.filter((x) => x.status === 'ativa'),
    encerradas: () => lista.filter((x) => x.status === 'encerrada').sort((a, b) => b.fim - a.fim),
    obter, ativaDe,
    historicoDe: (atletaId) => lista.filter((x) => x.atletaId === atletaId).sort((a, b) => b.desde - a.desde),
    diasAfastado: (o) => Math.max(0, Math.round(((o.fim || HOJE) - o.desde) / DIA)),

    abrir(d) {
      if (ativaDe(d.atletaId)) return null;
      const o = oc({ ...d, eventos: [ev(iso(d.desde), 'abertura', d.queixa || `${TIPOS[d.tipo].nome}: ${d.texto}.`)] });
      o.eventos[0].data = d.desde;
      delete o.queixa;
      lista.push(o); gravar();
      return o;
    },
    atualizar(id, patch) {
      const o = obter(id); if (!o) return;
      Object.assign(o, patch);
      o.eventos.push({ data: HOJE, tipo: 'edicao', texto: 'Dados da ocorrência atualizados.' });
      gravar();
    },
    evoluir(id, texto, data) { const o = obter(id); o.eventos.push({ data: data || HOJE, tipo: 'evolucao', texto }); gravar(); },
    liberarRetorno(id, { retorno, conduta, restricoes, data }) {
      const o = obter(id);
      o.tipo = 'retorno'; o.retorno = retorno || null; o.conduta = conduta || o.conduta; o.restricoes = restricoes || [];
      o.eventos.push({ data: data || HOJE, tipo: 'retorno', texto: `Liberado para treino com restrições${o.restricoes.length ? `: ${o.restricoes.map((k) => NOME_RESTRICAO[k].toLowerCase()).join(', ')}` : ''}.` });
      gravar();
    },
    voltarParaLesao(id, texto) { const o = obter(id); o.tipo = 'lesao'; o.eventos.push({ data: HOJE, tipo: 'evolucao', texto: texto || 'Voltou a ficar fora dos treinos.' }); gravar(); },
    confirmarLesao(id) { const o = obter(id); o.tipo = 'lesao'; o.eventos.push({ data: HOJE, tipo: 'evolucao', texto: 'Avaliação confirmou a lesão. Afastado dos treinos.' }); gravar(); },
    alta(id, { data, texto, desfecho }) {
      const o = obter(id);
      o.status = 'encerrada'; o.fim = data || HOJE; o.desfecho = desfecho || 'alta';
      o.eventos.push({ data: o.fim, tipo: desfecho === 'descartada' ? 'descarte' : 'alta', texto: texto || (desfecho === 'descartada' ? 'Sem lesão. Ocorrência descartada.' : 'Alta. Liberado sem restrições.') });
      gravar();
    },
    reabrir(id) { const o = obter(id); if (!o || ativaDe(o.atletaId)) return false; o.status = 'ativa'; o.fim = null; o.desfecho = null; o.eventos.push({ data: HOJE, tipo: 'evolucao', texto: 'Ocorrência reaberta.' }); gravar(); return true; },
    excluir(id) { lista = lista.filter((x) => x.id !== id); gravar(); },
  };

  // O resto do painel lê a situação do atleta por aqui (cartões do Início, semáforo da turma).
  window.Farol.elenco.situacaoDe = (id) => {
    const o = ativaDe(id);
    return o ? { tipo: o.tipo, local: o.regiao, texto: o.texto, desde: o.desde, retorno: o.retorno, conduta: o.conduta, restricoes: o.restricoes, ocorrenciaId: o.id } : null;
  };
  window.Farol.saude = API;

  /* ====================================================================
     TELA
     ==================================================================== */

  const { dados, registros: REG, calendario: CAL } = window.Farol;
  const est = { filtro: 'ativas', turma: 'todas', form: null, acao: null, aviso: '', foco: null };
  let raiz = null;

  const prim = (id) => ATLETAS[id].nome.split(' ')[0];
  const iniciais = (n) => n.split(' ').filter((x) => x.length > 2).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  const turmaDe = (id) => Object.values(TURMAS).find((t) => t.atletas.includes(id));
  const emDias = (t) => Math.round((t - HOJE) / DIA);
  const ROT_EV = { abertura: 'Início', evolucao: 'Evolução', retorno: 'Retorno', alta: 'Alta', descarte: 'Descartada', edicao: 'Edição' };
  const OPCAO_TIPO = { lesao: 'Lesão', retorno: 'Em retorno', duvida: 'Dúvida' };

  function relatosDeDor() {
    const out = [];
    dados.planos.filter((p) => p.semanaAtual >= 0).forEach((p) => p.semanas.forEach((semana) => semana.sessoes.forEach((s) => {
      if (REG.estado(p, semana, s) !== 'aguardando') return;
      Object.entries(REG.respostas(p, semana, s)).forEach(([id, r]) => {
        if (r.dor >= 2 && !ativaDe(id) && !out.some((x) => x.id === id)) out.push({ id, dor: r.dor, quando: semana.inicio + s.dia * DIA });
      });
    })));
    return out;
  }

  function impacto() {
    const linhas = [];
    CAL.lista().filter((c) => !CAL.passada(c) && emDias(c.data) <= 75).forEach((c) => {
      CAL.plan(c.id).duplas.filter((d) => d.status !== 'reserva').forEach((d) => {
        [d.a, d.b].forEach((id) => {
          const o = ativaDe(id); if (!o) return;
          const parceiro = id === d.a ? d.b : d.a;
          let estado, texto;
          if (o.tipo === 'duvida') { estado = 'atencao'; texto = 'em dúvida: avaliar antes de confirmar'; }
          else if (!o.retorno) { estado = 'fora'; texto = 'sem data de retorno'; }
          else if (o.retorno <= c.data - 3 * DIA) { estado = 'ok'; texto = `deve voltar em ${dd(o.retorno)}, antes da competição`; }
          else if (o.retorno <= c.data) { estado = 'atencao'; texto = `volta em ${dd(o.retorno)}, em cima da hora`; }
          else { estado = 'fora'; texto = `só volta em ${dd(o.retorno)}, depois da competição`; }
          linhas.push({ c, d, id, parceiro, o, estado, texto });
        });
      });
    });
    return linhas;
  }

  /* ---------- Formulários ---------- */

  function novoForm(pre) {
    return { modo: 'novo', id: null, atleta: (pre && pre.atleta) || '', tipo: (pre && pre.tipo) || 'lesao', regiao: '', texto: (pre && pre.texto) || '', desde: iso(HOJE), retorno: '', conduta: '', restricoes: [], resp: 'p4', queixa: '', erro: '' };
  }
  function formDe(o) {
    return { modo: 'editar', id: o.id, atleta: o.atletaId, tipo: o.tipo, regiao: o.regiao, texto: o.texto, desde: iso(o.desde), retorno: o.retorno ? iso(o.retorno) : '', conduta: o.conduta || '', restricoes: o.restricoes.slice(), resp: o.resp, queixa: '', erro: '' };
  }

  function formHtml() {
    const f = est.form;
    const novo = f.modo === 'novo';
    const atletas = Object.values(TURMAS).map((t) => `<optgroup label="${esc(t.nome)}">${t.atletas.map((id) => `<option value="${id}" ${f.atleta === id ? 'selected' : ''} ${novo && ativaDe(id) ? 'disabled' : ''}>${esc(ATLETAS[id].nome)}${novo && ativaDe(id) ? ' (em acompanhamento)' : ''}</option>`).join('')}</optgroup>`).join('');
    const op = (v, n, sel) => `<option value="${esc(v)}" ${sel ? 'selected' : ''}>${esc(n)}</option>`;
    return `
      <section class="card sd-form" aria-labelledby="sd-f-t">
        <div class="card-head"><h2 id="sd-f-t">${novo ? 'Registrar lesão, retorno ou dúvida' : `Editar ocorrência de ${esc(prim(f.atleta))}`}</h2></div>
        <form id="sd-form" novalidate>
          <div class="sd-tipos" role="radiogroup" aria-label="Situação do atleta">
            ${Object.entries(TIPOS).map(([k, t]) => `<label class="sd-tipo ${f.tipo === k ? 'on' : ''} ${k}"><input type="radio" name="tipo" value="${k}" ${f.tipo === k ? 'checked' : ''}><b>${esc(OPCAO_TIPO[k])}</b><small>${esc(t.desc)}</small></label>`).join('')}
          </div>
          <div class="form-grid sd-grid">
            <div class="field"><label class="label" for="sd-atleta">Atleta</label><select class="select" id="sd-atleta" ${novo ? '' : 'disabled'}><option value="">Escolha…</option>${atletas}</select></div>
            <div class="field"><label class="label" for="sd-regiao">Região do corpo</label><select class="select" id="sd-regiao"><option value="">Escolha…</option>${REGIOES.map((r) => op(r, r, f.regiao === r)).join('')}</select></div>
            <div class="field"><label class="label" for="sd-texto">Diagnóstico ou queixa</label><input class="input" id="sd-texto" value="${esc(f.texto)}" maxlength="80" placeholder="Entorse de grau 1, dor ao atacar…"></div>
            <div class="field"><label class="label" for="sd-desde">Desde quando</label><input class="input" id="sd-desde" type="date" value="${f.desde}" max="${iso(HOJE)}"></div>
            <div class="field"><label class="label" for="sd-retorno">Retorno previsto <small>(opcional)</small></label><input class="input" id="sd-retorno" type="date" value="${f.retorno}"></div>
            <div class="field"><label class="label" for="sd-resp">Quem acompanha</label><select class="select" id="sd-resp">${Object.values(PROFS).map((p) => op(p.id, `${p.nome}, ${p.funcao.toLowerCase()}`, f.resp === p.id)).join('')}</select></div>
          </div>
          <div class="field" style="margin-bottom:14px"><label class="label" for="sd-conduta">Conduta</label><textarea class="input" id="sd-conduta" rows="2" maxlength="200" placeholder="Fisioterapia, gelo, sem salto até a liberação…">${esc(f.conduta)}</textarea></div>
          <fieldset class="sd-restr"><legend class="label">Restrições nos treinos</legend>
            <div class="chips">${RESTRICOES.map(([k, n]) => `<label class="chipcheck"><input type="checkbox" name="restr" value="${k}" ${f.restricoes.includes(k) ? 'checked' : ''}> ${esc(n)}</label>`).join('')}</div></fieldset>
          ${f.erro ? `<p class="sd-erro" role="alert">${esc(f.erro)}</p>` : ''}
          <div class="actions" style="margin-top:14px"><button class="btn btn-primary" type="submit">${novo ? 'Registrar' : 'Salvar alterações'}</button><button class="btn" type="button" id="sd-cancela">Cancelar</button></div>
        </form>
      </section>`;
  }

  function lerForm(root) {
    const f = est.form, g = (s) => root.querySelector(s);
    f.tipo = (root.querySelector('input[name="tipo"]:checked') || {}).value || f.tipo;
    if (f.modo === 'novo') f.atleta = g('#sd-atleta').value;
    f.regiao = g('#sd-regiao').value; f.texto = g('#sd-texto').value.trim(); f.desde = g('#sd-desde').value; f.retorno = g('#sd-retorno').value;
    f.resp = g('#sd-resp').value; f.conduta = g('#sd-conduta').value.trim();
    f.restricoes = [...root.querySelectorAll('input[name="restr"]:checked')].map((x) => x.value);
  }

  /* ---------- Cartão de uma ocorrência ---------- */

  function cartao(o) {
    const a = ATLETAS[o.atletaId], t = turmaDe(o.atletaId);
    const ativa = o.status === 'ativa';
    const dias = API.diasAfastado(o);
    const total = o.retorno ? Math.max(1, Math.round((o.retorno - o.desde) / DIA)) : null;
    const pos = total ? Math.min(100, (dias / total) * 100) : null;
    const falta = o.retorno ? emDias(o.retorno) : null;
    const acao = est.acao && est.acao.id === o.id ? est.acao.tipo : null;
    const btn = (k, n, cls = '') => `<button class="btn btn-sm ${cls}" type="button" data-sd="${k}:${o.id}">${n}</button>`;

    const painel = !acao ? '' : acao === 'evolucao' ? `
      <form class="sd-mini" data-form="evolucao:${o.id}"><label class="label" for="sd-ev-${o.id}">Como está o atleta?</label>
        <textarea class="input" id="sd-ev-${o.id}" rows="2" maxlength="240" placeholder="Edema diminuiu, voltou a correr sem dor…"></textarea>
        <div class="actions"><button class="btn btn-primary btn-sm" type="submit">Salvar evolução</button><button class="btn btn-sm" type="button" data-sd="fechar:${o.id}">Cancelar</button></div></form>`
      : acao === 'retorno' ? `
      <form class="sd-mini" data-form="retorno:${o.id}"><span class="label">Liberar para treino com restrições</span>
        <div class="form-grid sd-grid2"><div class="field"><label class="label" for="sd-rt-${o.id}">Liberação total prevista</label><input class="input" id="sd-rt-${o.id}" type="date" value="${o.retorno ? iso(o.retorno) : ''}"></div>
        <div class="field"><label class="label" for="sd-cd-${o.id}">Conduta adaptada</label><input class="input" id="sd-cd-${o.id}" maxlength="160" value="${esc(o.conduta || '')}"></div></div>
        <div class="chips">${RESTRICOES.map(([k, n]) => `<label class="chipcheck"><input type="checkbox" name="restr" value="${k}" ${o.restricoes.includes(k) ? 'checked' : ''}> ${esc(n)}</label>`).join('')}</div>
        <div class="actions"><button class="btn btn-primary btn-sm" type="submit">Liberar para retorno</button><button class="btn btn-sm" type="button" data-sd="fechar:${o.id}">Cancelar</button></div></form>`
      : acao === 'alta' || acao === 'descartar' ? `
      <form class="sd-mini" data-form="${acao}:${o.id}"><span class="label">${acao === 'alta' ? 'Dar alta: liberado sem restrições' : 'Descartar: o atleta não tem lesão'}</span>
        <div class="form-grid sd-grid2"><div class="field"><label class="label" for="sd-al-${o.id}">Data</label><input class="input" id="sd-al-${o.id}" type="date" value="${iso(HOJE)}" min="${iso(o.desde)}" max="${iso(HOJE)}"></div>
        <div class="field"><label class="label" for="sd-an-${o.id}">Observação <small>(opcional)</small></label><input class="input" id="sd-an-${o.id}" maxlength="160" placeholder="Teste de salto sem dor…"></div></div>
        <div class="actions"><button class="btn btn-primary btn-sm" type="submit">${acao === 'alta' ? 'Confirmar alta' : 'Descartar'}</button><button class="btn btn-sm" type="button" data-sd="fechar:${o.id}">Cancelar</button></div></form>`
      : `<div class="sd-mini"><p><b>Excluir esta ocorrência?</b> Use só se foi registrada por engano. O histórico dela some.</p>
        <div class="actions"><button class="btn btn-danger btn-sm" type="button" data-sd="excluir-ok:${o.id}">Excluir mesmo</button><button class="btn btn-sm" type="button" data-sd="fechar:${o.id}">Manter</button></div></div>`;

    return `<article class="sd-card ${o.tipo} ${ativa ? '' : 'encerrada'}" id="sd-${o.id}">
      <div class="sd-card-h">
        <span class="ix-av ${o.tipo === 'lesao' ? 'lesao' : o.tipo === 'duvida' ? 'atencao' : 'retorno'}"><i>${esc(iniciais(a.nome))}</i></span>
        <div class="sd-card-n"><b>${esc(a.nome)}</b><small>${esc(t ? t.nome : '')} · ${esc(o.regiao)}</small></div>
        <span class="ix-sel ${o.tipo}">${ativa ? TIPOS[o.tipo].nome : o.desfecho === 'descartada' ? 'Descartada' : 'Alta'}</span>
      </div>
      <p class="sd-diag"><b>${esc(o.texto)}</b></p>
      <dl class="sd-dados">
        <div><dt>${ativa ? 'Afastado há' : 'Tempo afastado'}</dt><dd class="num">${plural(dias, 'dia', 'dias')}</dd></div>
        <div><dt>Início</dt><dd class="num">${dd(o.desde)}</dd></div>
        <div><dt>${ativa ? 'Retorno previsto' : 'Alta em'}</dt><dd class="num">${ativa ? (o.retorno ? `${dd(o.retorno)} <small>${falta <= 0 ? '(hoje ou passou)' : `(em ${falta} dias)`}</small>` : 'sem data') : dd(o.fim)}</dd></div>
        <div><dt>Acompanha</dt><dd>${esc(PROFS[o.resp] ? PROFS[o.resp].nome.split(' ')[0] : '–')}</dd></div>
      </dl>
      ${ativa && pos != null ? `<div class="sd-prog" role="img" aria-label="${dias} de ${total} dias até o retorno previsto"><i style="width:${pos}%"></i></div>` : ''}
      ${o.conduta ? `<p class="sd-conduta"><span class="label">Conduta</span> ${esc(o.conduta)}</p>` : ''}
      ${o.restricoes.length ? `<div class="chips">${o.restricoes.map((k) => `<span class="ix-chip">${esc(NOME_RESTRICAO[k])}</span>`).join('')}</div>` : ''}
      <details class="sd-evol"><summary>Evolução <span class="num">(${o.eventos.length})</span></summary>
        <ol class="sd-tl">${o.eventos.slice().sort((x, y) => y.data - x.data).map((e) => `<li><span class="num">${dd(e.data)}</span><b>${ROT_EV[e.tipo]}</b><span>${esc(e.texto)}</span></li>`).join('')}</ol></details>
      ${ativa ? `<div class="sd-acoes">
        ${btn('evolucao', 'Registrar evolução', 'btn-primary')}
        ${o.tipo === 'lesao' ? btn('retorno', 'Liberar para retorno') : ''}
        ${o.tipo === 'retorno' ? btn('lesao', 'Voltou a ficar fora') : ''}
        ${o.tipo === 'duvida' ? btn('confirmar', 'Confirmar lesão') : ''}
        ${o.tipo === 'duvida' ? btn('descartar', 'Descartar') : btn('alta', 'Dar alta')}
        ${btn('editar', 'Editar')}${btn('excluir', 'Excluir', 'btn-danger')}
      </div>` : `<div class="sd-acoes">${btn('reabrir', 'Reabrir')}${btn('excluir', 'Excluir', 'btn-danger')}</div>`}
      ${painel}
    </article>`;
  }

  /* ---------- Tela ---------- */

  function render(root, foco) {
    raiz = root;
    const ativas = API.ativas(), enc = API.encerradas();
    const filtroT = (o) => est.turma === 'todas' || (TURMAS[est.turma] && TURMAS[est.turma].atletas.includes(o.atletaId));
    const ordem = { lesao: 0, retorno: 1, duvida: 2 };
    const mostrarAtivas = ativas.filter(filtroT).sort((a, b) => ordem[a.tipo] - ordem[b.tipo] || (a.retorno || 9e15) - (b.retorno || 9e15));
    const mostrarEnc = enc.filter(filtroT);
    const relatos = relatosDeDor();
    const imp = impacto();
    const n = (tipo) => ativas.filter((o) => o.tipo === tipo).length;
    const altas30 = enc.filter((o) => o.fim >= HOJE - 30 * DIA).length;

    root.innerHTML = `
      <header class="page-head">
        <div>
          ${window.Farol.conta.guardaDados() ? '' : '<span class="chip" style="margin-bottom:10px">Dados de exemplo</span>'}
          <h1>Saúde do elenco</h1>
          <p class="lead">Lesões, retornos e dúvidas de cada atleta, com a conduta, as restrições e a evolução. O Início, a Análise e as competições usam o que for registrado aqui.</p>
        </div>
        ${est.form ? '' : '<button class="btn btn-primary" id="sd-novo">Registrar lesão ou queixa</button>'}
      </header>
      ${est.aviso ? `<div class="aviso-ok" role="status">${esc(est.aviso)}</div>` : ''}
      ${est.form ? formHtml() : ''}

      <div class="ix-kpis">
        <div class="ix-kpi"><span class="ix-kpi-i lesao">●</span><span><b class="num">${n('lesao')}</b><em>lesionados</em></span></div>
        <div class="ix-kpi"><span class="ix-kpi-i atencao">●</span><span><b class="num">${n('retorno')}</b><em>em retorno</em></span></div>
        <div class="ix-kpi"><span class="ix-kpi-i beam">●</span><span><b class="num">${n('duvida')}</b><em>em dúvida</em></span></div>
        <div class="ix-kpi"><span class="ix-kpi-i ok">●</span><span><b class="num">${altas30}</b><em>altas nos últimos 30 dias</em></span></div>
      </div>

      ${relatos.length ? `<section class="card sd-relatos" aria-labelledby="sd-rl-t">
        <div class="card-head"><h2 id="sd-rl-t">Relatos de dor sem ocorrência</h2><span class="label num">${relatos.length}</span></div>
        <ul class="ix-ul">${relatos.map((r) => `<li class="ix-li"><span class="ix-av atencao"><i>${esc(iniciais(ATLETAS[r.id].nome))}</i></span>
          <div class="ix-li-m"><b>${esc(ATLETAS[r.id].nome)}</b><small>Relato de ${esc(REG.DOR[r.dor].toLowerCase())} feito pelo atleta no treino de ${dd(r.quando)}</small></div>
          <button class="btn btn-sm" data-relato="${r.id}|${r.dor}">Registrar</button></li>`).join('')}</ul>
      </section>` : ''}

      ${imp.length ? `<section class="card" aria-labelledby="sd-im-t">
        <div class="card-head"><h2 id="sd-im-t">Impacto nas competições</h2><span class="label">próximos 75 dias</span></div>
        <ul class="ix-ul">${imp.map((x) => `<li class="ix-li"><span class="ix-sel ${x.estado === 'ok' ? 'ok' : x.estado === 'atencao' ? 'retorno' : 'lesao'}">${x.estado === 'ok' ? 'Deve jogar' : x.estado === 'atencao' ? 'Conferir' : 'Fora'}</span>
          <div class="ix-li-m"><b>${esc(ATLETAS[x.id].nome)} · ${esc(x.c.nome)}</b><small>dupla com ${esc(prim(x.parceiro))} (${esc(x.d.status)}) · ${esc(x.texto)}</small></div>
          <button class="btn btn-sm" data-comp="${x.c.id}">Abrir competição</button></li>`).join('')}</ul>
      </section>` : ''}

      <div class="sd-barra">
        <div class="seg-ctl" role="group" aria-label="Mostrar">
          ${[['ativas', `Em acompanhamento (${mostrarAtivas.length})`], ['historico', `Histórico (${mostrarEnc.length})`]].map(([k, nome]) => `<button class="seg-btn" data-f="${k}" aria-pressed="${est.filtro === k}">${nome}</button>`).join('')}
        </div>
        <div class="field"><label class="label" for="sd-turma">Turma</label><select class="select sm" id="sd-turma" style="min-width:0"><option value="todas">Todas</option>${Object.values(TURMAS).map((t) => `<option value="${t.id}" ${est.turma === t.id ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select></div>
      </div>

      <section aria-label="${est.filtro === 'ativas' ? 'Ocorrências em acompanhamento' : 'Histórico de ocorrências'}">
        ${est.filtro === 'ativas'
          ? (mostrarAtivas.length ? `<div class="sd-lista">${mostrarAtivas.map(cartao).join('')}</div>` : '<section class="card an-vazio"><h2>Ninguém em acompanhamento</h2><p>Quando um atleta se machucar ou relatar dor, registre aqui para o Início e as competições levarem isso em conta.</p></section>')
          : (mostrarEnc.length ? `<div class="sd-lista">${mostrarEnc.map(cartao).join('')}</div>` : '<p class="vazio">Nenhuma ocorrência encerrada neste filtro.</p>')}
      </section>`;

    ligar(root);
    if (foco) { const f = root.querySelector(foco); if (f) f.focus({ preventScroll: true }); }
  }

  function ligar(root) {
    const $ = (s) => root.querySelector(s);
    const refazer = (aviso, foco) => { est.aviso = aviso || ''; const y = window.scrollY; render(root, foco); window.scrollTo({ top: y }); };

    const nv = $('#sd-novo');
    if (nv) nv.addEventListener('click', () => { est.form = novoForm(); est.aviso = ''; render(root, '#sd-atleta'); });
    root.querySelectorAll('[data-relato]').forEach((b) => b.addEventListener('click', () => {
      const [id, dor] = b.dataset.relato.split('|');
      est.form = novoForm({ atleta: id, tipo: 'duvida', texto: `Relato de ${REG.DOR[+dor].toLowerCase()}` });
      render(root, '#sd-regiao'); window.scrollTo({ top: 0 });
    }));
    root.querySelectorAll('[data-comp]').forEach((b) => b.addEventListener('click', () => window.Farol.ir('planejamento-competicoes', { competicao: b.dataset.comp })));
    root.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { est.filtro = b.dataset.f; est.acao = null; refazer('', `[data-f="${est.filtro}"]`); }));
    $('#sd-turma').addEventListener('change', (e) => { est.turma = e.target.value; refazer('', '#sd-turma'); });

    const form = $('#sd-form');
    if (form) {
      form.querySelectorAll('input[name="tipo"]').forEach((r) => r.addEventListener('change', () => { lerForm(root); render(root, 'input[name="tipo"]:checked'); }));
      $('#sd-cancela').addEventListener('click', () => { est.form = null; refazer(''); });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        lerForm(root);
        const f = est.form;
        const falta = !f.atleta ? 'Escolha o atleta.' : !f.regiao ? 'Escolha a região do corpo.' : f.texto.length < 3 ? 'Descreva o diagnóstico ou a queixa.' : !f.desde ? 'Informe desde quando.' : f.retorno && f.retorno < f.desde ? 'O retorno previsto não pode ser antes do início.' : '';
        if (falta) { f.erro = falta; render(root, '#sd-form .sd-erro'); return; }
        const campos = { tipo: f.tipo, regiao: f.regiao, texto: f.texto, desde: ms(f.desde), retorno: f.retorno ? ms(f.retorno) : null, conduta: f.conduta, restricoes: f.restricoes, resp: f.resp };
        if (f.modo === 'novo') {
          const o = API.abrir({ atletaId: f.atleta, ...campos });
          est.form = null; est.filtro = 'ativas';
          refazer(o ? `${ATLETAS[f.atleta].nome} registrado como ${TIPOS[f.tipo].nome.toLowerCase()}. Já aparece no Início.` : 'Esse atleta já tem uma ocorrência em acompanhamento.', o ? `#sd-${o.id}` : null);
        } else {
          API.atualizar(f.id, campos); est.form = null;
          refazer('Ocorrência atualizada.', `#sd-${f.id}`);
        }
      });
    }

    root.querySelectorAll('[data-sd]').forEach((b) => b.addEventListener('click', () => {
      const [k, id] = b.dataset.sd.split(':');
      const o = obter(id);
      if (['evolucao', 'retorno', 'alta', 'descartar', 'excluir'].includes(k)) { est.acao = { id, tipo: k }; est.aviso = ''; render(root, `#sd-${id} .sd-mini textarea, #sd-${id} .sd-mini input, #sd-${id} .sd-mini [data-sd]`); return; }
      if (k === 'fechar') { est.acao = null; refazer('', `[data-sd="evolucao:${id}"]`); return; }
      if (k === 'editar') { est.form = formDe(o); est.aviso = ''; render(root, '#sd-regiao'); window.scrollTo({ top: 0 }); return; }
      if (k === 'lesao') { API.voltarParaLesao(id); refazer(`${prim(o.atletaId)} voltou a ficar fora dos treinos.`, `#sd-${id}`); return; }
      if (k === 'confirmar') { API.confirmarLesao(id); refazer(`Lesão de ${prim(o.atletaId)} confirmada.`, `#sd-${id}`); return; }
      if (k === 'reabrir') { const ok = API.reabrir(id); est.filtro = ok ? 'ativas' : est.filtro; refazer(ok ? 'Ocorrência reaberta.' : 'O atleta já tem outra ocorrência em acompanhamento.', ok ? `#sd-${id}` : null); return; }
      if (k === 'excluir-ok') { API.excluir(id); est.acao = null; refazer('Ocorrência excluída.'); }
    }));
    root.querySelectorAll('[data-form]').forEach((f) => f.addEventListener('submit', (e) => {
      e.preventDefault();
      const [k, id] = f.dataset.form.split(':');
      const o = obter(id), nome = prim(o.atletaId);
      const v = (s) => f.querySelector(s);
      est.acao = null;
      if (k === 'evolucao') {
        const t = v('textarea').value.trim();
        if (!t) { est.acao = { id, tipo: 'evolucao' }; v('textarea').focus(); return; }
        API.evoluir(id, t); refazer(`Evolução de ${nome} registrada.`, `#sd-${id}`);
      } else if (k === 'retorno') {
        const ret = v('input[type="date"]').value;
        API.liberarRetorno(id, { retorno: ret ? ms(ret) : null, conduta: v('input[maxlength="160"]').value.trim(), restricoes: [...f.querySelectorAll('input[name="restr"]:checked')].map((x) => x.value) });
        refazer(`${nome} liberado(a) para treino com restrições.`, `#sd-${id}`);
      } else {
        const data = ms(v('input[type="date"]').value || iso(HOJE));
        API.alta(id, { data, texto: v('input[maxlength="160"]').value.trim(), desfecho: k === 'alta' ? 'alta' : 'descartada' });
        est.filtro = 'ativas';
        refazer(k === 'alta' ? `Alta de ${nome} registrada. Já saiu do Início.` : `Ocorrência de ${nome} descartada.`);
      }
    }));
  }

  window.Farol.views = window.Farol.views || {};
  window.Farol.views.saude = (root, params) => {
    est.aviso = ''; est.acao = null;
    if (params && params.novo) est.form = novoForm(params.novo === true ? null : params.novo); else if (!(params && params.manter)) est.form = null;
    if (params && params.filtro) est.filtro = params.filtro;
    render(root);
    if (params && params.foco) { const o = API.ativaDe(params.foco); const el = o && root.querySelector(`#sd-${o.id}`); if (el) el.scrollIntoView({ block: 'start' }); }
  };
})();
