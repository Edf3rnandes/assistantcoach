/* Painel novo: telas e navegação.
   Hoje (o que treino e quem pede atenção) → Equipe (a semana e os atletas) → Atleta (situação, carga e ficha),
   mais o registro rápido (uma folha, até 3 toques) e o menu Mais. Os dados vêm de `Painel.dados`. */
(function () {
  const D = window.Painel.dados;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;
  const dec = (v) => (v == null ? '–' : v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
  const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
  const DIAS_L = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'];
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const NOME_ESTADO = { ok: 'Disponível', atencao: 'Atenção', retorno: 'Em retorno', lesao: 'Lesionado' };
  const dow = (t) => (new Date(t).getUTCDay() + 6) % 7;
  const diaMes = (t) => new Date(t).getUTCDate();
  const dd = (t) => `${String(new Date(t).getUTCDate()).padStart(2, '0')}/${String(new Date(t).getUTCMonth() + 1).padStart(2, '0')}`;
  const dataLonga = (t) => `${new Date(t).getUTCDate()} de ${MESES[new Date(t).getUTCMonth()]}`;
  const milhar = (n) => n.toLocaleString('pt-BR');
  const dataCurta = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '');
  const iniciais = (n) => n.split(' ').filter((x) => x.length > 2).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  const ic = (d, t = 20) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const I = {
    seta: '<path d="M9 6l6 6-6 6"/>', volta: '<path d="M15 6l-6 6 6 6"/>', ok: '<path d="M5 12l4 4 10-10"/>',
    casa: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    equipes: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M18 20a6 6 0 0 0-3-5"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    mais: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  };
  const MARCA = '<svg width="28" height="28" viewBox="0 0 34 34" fill="none" aria-hidden="true"><path d="M3 17 L16 14 V20 Z" fill="#F2A900" opacity=".9"/><path d="M31 17 L18 14 V20 Z" fill="#F2A900" opacity=".55"/><path d="M14 13h4l1.5 17h-7z" fill="currentColor"/><path d="M13 22h8M12.6 26h8.8" stroke="var(--bg)" stroke-width="1.6"/><rect x="14" y="8" width="6" height="5" rx="1" fill="#F2A900"/><path d="M13 8l4-4 4 4z" fill="currentColor"/></svg>';

  /* ---------- Peças que se repetem (um desenho por informação) ---------- */

  const chipEstado = (e) => `<span class="p-chip ${e}">${NOME_ESTADO[e]}</span>`;
  const barraAcwr = (v) => `<span class="p-acwr" aria-hidden="true"><i style="width:40%;background:#8db6f0"></i><i style="width:25%;background:#4db982"></i><i style="width:10%;background:#f2b84b"></i><i style="width:25%;background:#e5493d"></i>${v != null ? `<em style="left:${Math.min(100, Math.max(0, v * 50))}%"></em>` : ''}</span>`;

  // Situação e carga de um atleta: a linha curta (listas) e o bloco cheio (tela do atleta).
  function linhaAtleta(a, comEquipe) {
    const eq = comEquipe ? D.equipe(a.eq) : null;
    const sub = a.estado === 'lesao' && a.situacao ? `${a.situacao.local}${a.situacao.retorno ? ` · volta ${dataCurta(a.situacao.retorno)}` : ''}`
      : a.estado !== 'ok' && a.motivo ? a.motivo : `${a.faixa} · ${a.genero === 'F' ? 'feminino' : 'masculino'}`;
    return `<li><button type="button" class="p-linha" data-atleta="${a.id}" aria-label="Abrir ${esc(a.nome)}">
      <span class="p-av ${a.estado}">${esc(iniciais(a.nome))}</span>
      <span class="p-txt"><b>${esc(a.nome)}</b><small>${esc(eq ? `${eq.nome} · ` : '')}${esc(sub)}</small></span>
      <span class="p-dir">${chipEstado(a.estado)}${a.acwr != null ? `<small class="num">ACWR ${dec(a.acwr)}</small>` : ''}</span></button></li>`;
  }
  function blocoCarga(a) {
    if (a.acwr == null && a.estado === 'lesao') return '<p class="p-vazio">Fora dos treinos: a carga volta a contar quando o atleta for liberado.</p>';
    return `<div class="p-carga">
      <div><div class="p-carga-top"><small>ACWR, carga recente sobre a habitual</small><b class="num">${dec(a.acwr)}</b></div>${barraAcwr(a.acwr)}</div>
      <div class="p-3"><div><b class="num">${dec(a.pse)}</b><small>PSE médio</small></div><div><b class="num">${a.pres != null ? `${a.pres}%` : '–'}</b><small>presença</small></div><div><b class="num">${a.estado === 'ok' ? 'ok' : a.estado === 'atencao' ? 'atenção' : '–'}</b><small>situação</small></div></div></div>`;
  }

  /* ---------- Telas ---------- */

  function chipBloco(eqId) { const pe = D.periodo(eqId), sm = pe.semanas[pe.semanaAtual - 1]; return `<span class="p-chip">${esc(pe.blocos[sm.bloco].nome)} · semana ${pe.semanaAtual} · ${sm.fator}% da carga</span>`; }

  function hoje() {
    const ses = D.sessoesHoje();
    const agora = ses.find((s) => s.status === 'hoje');
    const outras = ses.filter((s) => s !== agora);
    const prox = ses.length ? null : D.proximaSessao();
    const aten = D.atencao();
    const t = D.hoje(), d = new Date(t);
    const h = new Date().getHours();
    const sauda = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    const resumo = `${ses.length ? plural(ses.length, 'sessão', 'sessões') + ' hoje' : 'Sem treino hoje'} · ${aten.length ? plural(aten.length, 'atleta pede atenção', 'atletas pedem atenção') : 'todos dentro da faixa'}`;
    const linhaSes = (s) => `<li><div class="p-ses ${s.status}"><div class="p-txt"><b>${esc(s.equipeNome)}</b><small>${esc(s.tipo)} · ${s.dur} min · PSE alvo ${s.pse}</small></div>
      ${s.status === 'registrado' ? `<span class="p-chip ok">Registrado</span>` : `<button type="button" class="p-btn peq primario" data-registrar="${s.id}">Registrar</button>`}</div></li>`;
    return `
      <header class="p-topo"><span class="p-data">${DIAS_L[dow(t)]}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}</span><h1>${sauda}, ${esc(D.usuario().nome)}</h1><p class="p-sub">${esc(resumo)}</p></header>
      ${agora ? `<section class="p-agora" aria-labelledby="ag-t"><span class="p-rot" id="ag-t">Próximo treino</span>
          <h2>${esc(agora.tipo)} · ${esc(agora.foco)}</h2>
          <p class="meta">${esc(agora.equipeNome)} · ${agora.dur} min · PSE alvo ${agora.pse}</p><span class="p-chip">Dia ${esc(agora.dia)}</span>${chipBloco(agora.equipe)}
          <button type="button" class="p-btn beam grande" data-registrar="${agora.id}">Registrar treino</button></section>`
        : `<section class="p-card"><h2>${ses.length ? 'Treinos de hoje registrados' : 'Sem treino hoje'}</h2>
          <p class="p-vazio">${ses.length ? 'Tudo certo por hoje.' : prox ? `O próximo é ${DIAS_L[prox.dow]}, ${esc(prox.equipeNome)}: ${esc(prox.tipo.toLowerCase())}.` : 'Nenhum treino previsto nesta semana.'}</p></section>`}
      ${outras.length ? `<section class="p-card" aria-label="Outras sessões de hoje"><ul class="p-lista">${outras.map(linhaSes).join('')}</ul></section>` : ''}
      <section class="p-card" aria-labelledby="at-t"><span class="p-rot" id="at-t">Pede atenção</span>
        ${aten.length ? `<ul class="p-lista">${aten.slice(0, 3).map((a) => linhaAtleta(a, true)).join('')}</ul>${aten.length > 3 ? `<a class="p-btn peq" href="#equipes">Ver as equipes</a>` : ''}`
          : '<p class="p-feito">' + ic(I.ok, 22) + 'Todos os atletas dentro da faixa segura.</p>'}</section>
      <section class="p-card" aria-labelledby="eq-t"><span class="p-rot" id="eq-t">Equipes</span>
        <ul class="p-lista">${D.equipes().map((e) => `<li><a class="p-linha" href="#equipe/${e.id}" style="text-decoration:none;color:inherit">
          <span class="p-txt"><b>${esc(e.nome)}</b><small>${esc(e.fase.nome)} · semana ${e.semana} de ${e.semanas} · ${esc(e.alvo.nome)} em ${e.alvo.dias} dias</small></span><span class="p-seta">${ic(I.seta)}</span></a></li>`).join('')}</ul></section>`;
  }

  function equipes() {
    return `<header class="p-topo"><h1>Equipes</h1><p class="p-sub">${plural(D.equipes().length, 'equipe', 'equipes')} · toque numa para ver a semana</p></header>
      ${D.equipes().map((e) => {
        const at = D.atletas(e.id);
        const c = { ok: 0, atencao: 0, retorno: 0, lesao: 0 }; at.forEach((a) => { c[a.estado]++; });
        return `<a class="p-card" href="#equipe/${e.id}" style="text-decoration:none;color:inherit" aria-label="Abrir ${esc(e.nome)}">
          <div class="p-linha" style="padding:0;min-height:0"><span class="p-txt"><h2 style="font-size:28px;text-transform:uppercase">${esc(e.nome)}</h2><small>${esc(e.faixas.join(' + '))} · ${esc(e.generos)}</small></span><span class="p-seta">${ic(I.seta, 22)}</span></div>
          <div class="p-chips"><span class="p-chip">${esc(e.fase.nome)} · semana ${e.semana}</span><span class="p-chip">${esc(e.alvo.nome)} em ${e.alvo.dias} dias</span></div>
          <div class="p-chips"><span class="p-chip ok">${c.ok} ok</span>${c.atencao ? `<span class="p-chip atencao">${c.atencao} atenção</span>` : ''}${c.retorno ? `<span class="p-chip retorno">${c.retorno} em retorno</span>` : ''}${c.lesao ? `<span class="p-chip lesao">${plural(c.lesao, 'lesão', 'lesões')}</span>` : ''}</div></a>`;
      }).join('')}`;
  }

  function equipe(id, aberto) {
    const e = D.equipe(id);
    if (!e) { location.hash = '#equipes'; return ''; }
    const at = D.atletas(id);
    const fora = at.filter((a) => a.estado !== 'ok');
    const bem = at.filter((a) => a.estado === 'ok');
    return `
      <header class="p-topo"><h1>${esc(e.nome)}</h1><p class="p-sub">${esc(e.faixas.join(' + '))} · ${esc(e.generos)} · ${plural(e.nAtletas, 'atleta', 'atletas')}</p>
        <div class="p-chips"><span class="p-chip" style="background:color-mix(in srgb, ${e.fase.cor} 22%, var(--surface))">${esc(e.fase.nome)} · semana ${e.semana} de ${e.semanas}</span><span class="p-chip">${esc(e.alvo.nome)} em ${e.alvo.dias} dias</span></div></header>
      <a class="p-card pe-resumo" href="#periodo/${e.id}/bloco" aria-label="Abrir a periodização de ${esc(e.nome)}">
        <div class="pe-cab"><span class="p-rot">Periodização</span><span class="p-seta">${ic(I.seta)}</span></div>
        <div class="p-txt"><b class="pe-tn" style="--cor:${e.fase.cor}">${esc(e.fase.nome)}</b><small>Semana ${e.semana} de ${e.semanas} · ${esc(e.alvo.nome)} em ${e.alvo.dias} dias</small></div>
        <div class="p-fases" aria-hidden="true">${D.plano(id).fases.map((f) => `<i style="width:${(f.semanas / e.semanas) * 100}%;background:${f.cor}"></i>`).join('')}</div></a>
      <section class="p-card" aria-labelledby="ae-t"><span class="p-rot" id="ae-t">${fora.length ? 'Pedem atenção' : 'Atletas'}</span>
        ${fora.length ? `<ul class="p-lista">${fora.map((a) => linhaAtleta(a, false)).join('')}</ul>` : '<p class="p-feito">' + ic(I.ok, 22) + 'Todos dentro da faixa segura.</p>'}
        ${bem.length ? `<button type="button" class="p-toggle" id="ver-bem" aria-expanded="${!!aberto}" aria-controls="lista-bem">${aberto ? 'Esconder' : 'Ver'} os ${bem.length} sem alerta</button>
          <ul class="p-lista" id="lista-bem" ${aberto ? '' : 'hidden'}>${bem.map((a) => linhaAtleta(a, false)).join('')}</ul>` : ''}</section>`;
  }

  function atleta(id) {
    const a = D.atleta(id);
    if (!a) { location.hash = '#equipes'; return ''; }
    const e = D.equipe(a.eq);
    const les = a.situacao;
    const hojeIso = D.iso(D.hoje());
    return `
      <header class="p-id"><span class="p-av grande ${a.estado}">${esc(iniciais(a.nome))}</span>
        <div class="p-txt"><h1>${esc(a.nome)}</h1><p class="p-sub">${esc(a.faixa)} · ${a.genero === 'F' ? 'feminino' : 'masculino'}${a.idade != null ? ` · ${a.idade} anos` : ''}</p><span style="margin-top:6px">${chipEstado(a.estado)}</span></div></header>
      ${a.estado === 'atencao' && a.motivo ? `<p class="p-nota">${esc(a.motivo)}</p>` : ''}
      <section class="p-card" aria-labelledby="cg-t"><span class="p-rot" id="cg-t">Carga</span>${blocoCarga(a)}</section>
      <section class="p-card" aria-labelledby="sd-t"><span class="p-rot" id="sd-t">Saúde</span>
        ${les ? `<p class="p-nota lesao"><b>${esc(les.local)}</b>${les.texto ? `: ${esc(les.texto.toLowerCase())}` : ''}. Desde ${dataCurta(les.desde)}${les.retorno ? `, retorno previsto em ${dataCurta(les.retorno)}` : ''}.<br>${esc(les.conduta)}</p>
          <button type="button" class="p-btn primario" id="liberar">Liberar para voltar a treinar</button>`
        : `<p class="p-feito">${ic(I.ok, 22)}Sem restrição.</p>
          <div id="les-form" hidden><div class="p-campo"><label for="les-local">Onde dói</label><select id="les-local">${['Tornozelo', 'Joelho', 'Coxa', 'Quadril', 'Lombar', 'Ombro', 'Punho ou mão', 'Outro'].map((r) => `<option>${r}</option>`).join('')}</select></div>
            <button type="button" class="p-btn primario" id="les-salvar" style="margin-top:12px">Registrar lesão</button></div>
          <button type="button" class="p-btn" id="les-abrir">Registrar lesão</button>`}</section>
      <section class="p-card" aria-labelledby="fi-t"><span class="p-rot" id="fi-t">Ficha, ${a.fichaPct}% completa</span>
        <div class="p-prog" role="img" aria-label="${a.fichaPct}% da ficha"><i style="width:${a.fichaPct}%"></i></div>
        ${a.fichaFalta.length ? `<div class="p-falta">${a.fichaFalta.map((f) => `<span>+ ${esc(f)}</span>`).join('')}</div>` : '<p class="p-feito">' + ic(I.ok, 22) + 'Tudo preenchido.</p>'}
        <button type="button" class="p-toggle" id="ficha-abrir" aria-expanded="false" aria-controls="ficha-form">Completar a ficha</button>
        <form id="ficha-form" hidden novalidate><div class="p-campos">
          <div class="p-campo"><label for="f-nasc">Nascimento</label><input id="f-nasc" type="date" value="${esc(a.nasc || '')}" max="${hojeIso}" min="1940-01-01"></div>
          <div class="p-campo"><label for="f-altura">Altura (cm)</label><input id="f-altura" inputmode="numeric" maxlength="3" value="${esc(a.altura || '')}"></div>
          <div class="p-campo"><label for="f-mao">Mão dominante</label><select id="f-mao"><option value="">Não informado</option>${[['destro', 'Destro'], ['canhoto', 'Canhoto'], ['ambidestro', 'Ambidestro']].map(([k, n]) => `<option value="${k}" ${a.mao === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <div class="p-campo"><label for="f-tel">Telefone</label><input id="f-tel" inputmode="tel" maxlength="20" value="${esc(a.telefone || '')}"></div>
          <div class="p-campo"><label for="f-em">Contato de emergência</label><input id="f-em" maxlength="60" value="${esc(a.emergenciaNome || '')}"></div>
          <div class="p-campo"><label for="f-al">Alergias</label><input id="f-al" maxlength="120" placeholder="Escreva nenhuma se não houver" value="${esc(a.alergias || '')}"></div>
          <div class="p-campo"><label for="f-at">Atestado vale até</label><input id="f-at" type="date" value="${esc(a.atestado || '')}"></div></div>
          <button type="submit" class="p-btn primario" style="margin-top:12px">Salvar ficha</button></form></section>
      <p class="p-sub" style="text-align:center">${esc(e.nome)}</p>`;
  }

  function mais() {
    const lin = (txt, sub, href, tag) => (href
      ? `<li><a class="p-linha" href="${href}" style="text-decoration:none;color:inherit"><span class="p-txt"><b>${txt}</b><small>${sub}</small></span><span class="p-seta">${ic(I.seta)}</span></a></li>`
      : `<li><div class="p-linha" aria-disabled="true"><span class="p-txt"><b>${txt}</b><small>${sub}</small></span><span class="p-tag">${tag}</span></div></li>`);
    return `<header class="p-topo"><h1>Mais</h1><p class="p-sub">O que não é do dia a dia fica aqui, a um toque.</p></header>
      <section class="p-card"><ul class="p-mais">
        ${lin('Exercícios e prescrição', 'Treino físico na areia: peso do corpo, disco, cone e escada', '', 'na integração')}
        ${lin('Quadro técnico', 'Desenhar jogadas e exercícios', '', 'na integração')}
        ${lin('Competições', 'Editar data, local e prioridade', '', 'na integração')}
        ${lin('Equipes e atletas', 'Cadastro em uma tela, com nascimento', '', 'na integração')}</ul></section>
      <section class="p-card"><span class="p-rot">Este protótipo</span><p class="p-sub">Os dados são de exemplo e ficam só neste navegador. Na integração, as mesmas telas passam a ler o motor de periodização, os registros e o elenco do app atual.</p>
        <button type="button" class="p-btn" id="zerar">Apagar o que eu registrei no exemplo</button></section>`;
  }

  /* ---------- Periodização: Semana, Bloco, Temporada ---------- */

  let periodoEq = null;
  const ESTADO_BLOCO = { concluido: 'Concluído', andamento: 'Em andamento', planejado: 'Planejado' };
  const tipoSemana = (sm) => (sm.descarga ? 'Descarga' : sm.fator >= 110 ? 'Carga alta' : sm.fator >= 95 ? 'Carga base' : 'Carga leve');

  function periodizacao(id, aba, idxBloco) {
    const e = D.equipe(id) || D.equipes()[0];
    periodoEq = e.id;
    const pe = D.periodo(e.id);
    const bAt = pe.blocos[pe.blocoAtual];
    const alvo = pe.eventos.find((v) => v.prio === 'A');
    const hero = `
      <section class="pe-hero" aria-label="Equipe">
        <div class="pe-pills" role="group" aria-label="Escolher equipe">${D.equipes().map((x) => `<button type="button" class="pe-pill" data-periodo-eq="${x.id}" aria-pressed="${x.id === e.id}">${esc(x.nome)}</button>`).join('')}</div>
        <h1>${esc(e.nome)}</h1>
        <p class="pe-sub">${esc(e.faixas.join(' + '))} · ${esc(e.generos)} · ${plural(e.nAtletas, 'atleta', 'atletas')}</p>
        <div class="pe-cats">${e.cats.map((c) => `<span>${esc(c)}</span>`).join('')}</div>
        <dl class="pe-stats"><div><dt>Fase</dt><dd>${esc(bAt.nome)}</dd></div><div><dt>Semana</dt><dd class="num">${pe.semanaAtual} <small>de ${pe.total}</small></dd></div>${alvo ? `<div><dt>${esc(alvo.nome)} (A)</dt><dd class="num beam">${alvo.dias} dias</dd></div>` : ''}</dl>
      </section>
      <nav class="pe-abas" aria-label="Periodização">${[['semana', 'Semana'], ['bloco', 'Bloco'], ['temporada', 'Temporada']].map(([k, n]) => `<a href="#periodo/${e.id}/${k}" ${k === aba ? 'aria-current="page"' : ''}>${n}</a>`).join('')}</nav>`;
    const corpo = aba === 'semana' ? abaSemana(e, pe) : aba === 'temporada' ? abaTemporada(e, pe) : abaBloco(e, pe, idxBloco);
    return hero + corpo;
  }

  function abaSemana(e, pe) {
    const sem = D.semana(e.id);
    const sm = pe.semanas[pe.semanaAtual - 1];
    const b = pe.blocos[sm.bloco];
    const pct = Math.min(100, Math.round((100 * sem.cargaFeita) / sem.cargaAlvo));
    const hojeT = D.hoje();
    const dias = DIAS.map((n, i) => {
      const t = sem.inicio + i * 86400000;
      const s = sem.sessoes.filter((x) => x.dow === i);
      return `<div class="p-d ${s.length ? 'tr' : ''} ${t === hojeT ? 'hoje' : ''}"><small>${n.toUpperCase()}</small><b class="num">${diaMes(t)}</b><span class="p-pts">${s.map((x) => `<i class="${x.status}"></i>`).join('')}</span></div>`;
    }).join('');
    return `
      <section class="p-card" aria-labelledby="sm-t">
        <div class="pe-cab"><span class="p-rot" id="sm-t">Semana ${pe.semanaAtual} de ${pe.total}</span><span class="p-chip" style="background:color-mix(in srgb, ${b.cor} 24%, var(--surface))">${esc(tipoSemana(sm))}</span></div>
        <div class="pe-fator"><b class="num">${sm.fator}%</b><span>da carga de referência<br><small class="num">${milhar(sm.planejado)} UA planejadas</small></span></div>
        <div><div class="p-3" style="grid-template-columns:1fr 1fr;margin-bottom:10px"><div><b class="num">${milhar(sem.cargaFeita)}</b><small>UA feitas</small></div><div><b class="num">${milhar(sem.cargaAlvo)}</b><small>UA alvo da semana</small></div></div>
          <div class="p-prog" role="img" aria-label="${pct}% da carga da semana"><i style="width:${pct}%"></i></div></div>
        <div class="p-dias" role="img" aria-label="Dias de treino da semana">${dias}</div></section>
      <section class="p-card" aria-labelledby="ts-t"><span class="p-rot" id="ts-t">Treinos da semana</span>
        <ul class="p-lista">${sem.sessoes.map((s) => `<li><div class="p-ses pe-ses ${s.status}"><span class="p-ses-dia"><small>${DIAS[s.dow].toUpperCase()}</small><b class="num">${diaMes(s.data)}</b></span>
          <span class="p-txt"><b>${esc(s.tipo)} · ${esc(s.foco)}</b><small>${s.dur} min · PSE alvo ${s.pse} · dia ${esc(s.dia)}${s.reg ? ` · feito: PSE ${s.reg.pse}, ${s.reg.presentes} presentes` : ''}</small>
            ${s.itens.length ? `<ul class="pe-itens">${s.itens.map((it) => `<li>${esc(it)}</li>`).join('')}</ul>` : ''}</span>
          ${s.status === 'registrado' ? `<span class="p-ok" aria-label="Registrado">${ic(I.ok, 24)}</span>` : s.status === 'futuro' ? '<small class="p-vazio">em breve</small>' : `<button type="button" class="p-btn peq ${s.status === 'hoje' ? 'primario' : ''}" data-registrar="${s.id}">Registrar</button>`}</div></li>`).join('')}</ul></section>
      <section class="p-card" aria-labelledby="bl-t"><span class="p-rot" id="bl-t">Dentro do bloco</span>
        <a class="pe-tile mini" href="#periodo/${e.id}/bloco/${b.idx}" style="--cor:${b.cor}"><span class="p-txt"><b class="pe-tn">${esc(b.nome)}</b><small>Semana ${sm.k + 1} de ${b.semanas} · ${esc(b.regime)}</small></span><span class="p-seta">${ic(I.seta)}</span></a></section>`;
  }

  function abaBloco(e, pe, idxStr) {
    let idx = Number(idxStr);
    if (!Number.isInteger(idx) || idx < 0 || idx >= pe.blocos.length) idx = pe.blocoAtual;
    const b = pe.blocos[idx];
    const prox = pe.blocos[idx + 1];
    const sems = pe.semanas.filter((x) => x.bloco === idx);
    const ref = pe.ref;
    const feitas = sems.filter((x) => x.realizado != null);
    const feitoPct = feitas.length ? Math.round((100 * feitas.reduce((t, x) => t + x.realizado, 0)) / feitas.reduce((t, x) => t + x.planejado, 0)) : null;
    const eventos = pe.eventos.filter((v) => v.semana > b.ini && v.semana <= b.ini + b.semanas);
    const sa = pe.semanas[pe.semanaAtual - 1];
    const estadoTxt = b.estado === 'andamento' ? `semana ${sa.k + 1} de ${b.semanas}` : b.estado === 'concluido' ? 'concluído' : `começa em ${Math.max(1, Math.round((b.inicio - D.hoje()) / 86400000))} dias`;
    const nav = (d, rot, i) => `<button type="button" class="pe-nav-b" data-bloco-ir="${i}" aria-label="${rot}" ${i < 0 || i >= pe.blocos.length ? 'disabled' : ''}>${ic(d, 20)}</button>`;
    return `
      <section class="p-card pe-bloco" style="--cor:${b.cor}" aria-labelledby="bk-t">
        <div class="pe-cab"><span class="p-rot" id="bk-t">Bloco ${idx + 1} de ${pe.blocos.length}</span>
          <span class="pe-setas">${nav(I.volta, 'Bloco anterior', idx - 1)}${nav(I.seta, 'Próximo bloco', idx + 1)}</span></div>
        <div class="pe-nomeb"><i aria-hidden="true"></i><h2>${esc(b.nome)}</h2></div>
        <div class="p-chips"><span class="p-chip ${b.estado === 'andamento' ? 'ok' : ''}">${esc(ESTADO_BLOCO[b.estado])} · ${esc(estadoTxt)}</span><span class="p-chip">${plural(b.semanas, 'semana', 'semanas')}</span></div>
        <p class="pe-datas">${dataLonga(b.inicio)} a ${dataLonga(b.fim)}</p>
        <p class="pe-obj">${esc(b.objetivo)}</p>
        <p class="pe-regime">${esc(b.regime)}</p></section>
      <section class="p-card" style="--cor:${b.cor}" aria-labelledby="fc-t">
        <div class="pe-cab"><h2 id="fc-t" style="font-size:20px">Fator de carga</h2><small class="pe-leg">100% = ${milhar(ref)} UA</small></div>
        <div class="pe-barras" role="img" aria-label="Fator de carga semana a semana: ${sems.map((x) => `semana ${x.n}, ${x.fator}%`).join('; ')}">
          <span class="pe-ref" aria-hidden="true"></span>
          ${sems.map((x) => `<div class="pe-col ${x.atual ? 'atual' : ''}"><b class="num">${x.fator}%</b><i class="${x.descarga ? 'desc' : ''}" style="height:${Math.round(x.fator * 1.1)}px"></i></div>`).join('')}</div>
        <div class="pe-eixo">${sems.map((x) => `<div class="${x.atual ? 'atual' : ''}"><b>S${x.n}</b><small class="num">${x.atual ? 'hoje' : dd(x.inicio)}</small><small class="num pe-ua">${x.realizado != null ? milhar(x.realizado) : milhar(x.planejado)}</small></div>`).join('')}</div>
        <p class="pe-nota-b">UA por semana${feitas.length ? `: feito ${milhar(feitas.reduce((t, x) => t + x.realizado, 0))}, ${feitoPct}% do planejado nas ${plural(feitas.length, 'semana concluída', 'semanas concluídas')}` : ', planejadas'}. A semana de descarga aparece tracejada.</p></section>
      <section class="p-card" aria-labelledby="fu-t"><h2 id="fu-t" style="font-size:20px">Fundamentos do bloco</h2>
        <div class="p-chips pe-fund">${b.fundamentos.map((f) => `<span>${esc(f)}</span>`).join('')}</div></section>
      ${eventos.length ? `<section class="p-card" aria-labelledby="ce-t"><h2 id="ce-t" style="font-size:20px">Competições neste bloco</h2><ul class="p-lista">${eventos.map(linhaEvento).join('')}</ul></section>` : ''}
      ${prox ? `<a class="p-card pe-prox" href="#periodo/${e.id}/bloco/${prox.idx}" style="--cor:${prox.cor}"><i aria-hidden="true"></i><span class="p-txt"><span class="p-rot">Em seguida</span><b class="pe-tn">${esc(prox.nome)}</b><small>A partir de ${dd(prox.inicio)} · ${esc(prox.regime.toLowerCase())}</small></span><span class="p-seta">${ic(I.seta)}</span></a>`
        : '<section class="p-card"><span class="p-rot">Em seguida</span><p class="p-sub">Este é o último bloco da temporada.</p></section>'}`;
  }

  function linhaEvento(v) {
    return `<li><div class="p-ses"><span class="p-prio ${v.prio}" aria-label="Prioridade ${v.prio}">${v.prio}</span>
      <span class="p-txt"><b>${esc(v.nome)}</b><small class="num">${dataLonga(v.data)} · semana ${v.semana} · ${esc(v.status)}</small></span><span class="p-chip">${v.dias} dias</span></div></li>`;
  }

  function abaTemporada(e, pe) {
    const T = pe.total;
    const pos = (n) => `${((n - 0.5) / T) * 100}%`;
    const maxPl = Math.max(...pe.semanas.map((x) => x.planejado));
    return `
      <section class="p-card" aria-labelledby="tp-t"><div class="pe-cab"><h2 id="tp-t">${T} semanas</h2><span class="p-chip">semana ${pe.semanaAtual}</span></div>
        <div class="pe-tl" role="img" aria-label="Linha do tempo: ${pe.blocos.map((b) => `${b.nome}, ${b.semanas} semanas`).join('; ')}">
          <div class="pe-pinos">${pe.eventos.map((v) => `<span class="pe-pino ${v.prio}" style="left:${pos(Math.min(T, v.semana))}" title="${esc(v.nome)}">${v.prio}</span>`).join('')}</div>
          <div class="pe-faixa">${pe.blocos.map((b) => `<i style="flex:${b.semanas};background:${b.cor}" class="${b.estado}">${b.semanas >= 7 ? `<span>${esc(b.nome)}</span>` : b.semanas >= 4 ? `<span>${esc(b.nome.slice(0, 5))}.</span>` : ''}</i>`).join('')}<em class="pe-hoje" style="left:${pos(pe.semanaAtual)}" aria-hidden="true"></em></div>
          <div class="pe-ticks"><span>S1</span><span style="left:${pos(pe.semanaAtual)}">S${pe.semanaAtual}</span><span class="fim">S${T}</span></div></div></section>
      <section class="p-card" aria-labelledby="bq-t"><span class="p-rot" id="bq-t">Blocos da temporada</span>
        <div class="pe-tiles">${pe.blocos.map((b) => `<a class="pe-tile ${b.estado}" href="#periodo/${e.id}/bloco/${b.idx}" style="--cor:${b.cor}">
          <span class="p-txt"><b class="pe-tn">${esc(b.nome)}</b><small class="num">Semanas ${b.ini + 1} a ${b.ini + b.semanas} · ${dd(b.inicio)} a ${dd(b.fim)}</small></span>
          <span class="p-dir"><span class="p-chip ${b.estado === 'andamento' ? 'ok' : ''}">${esc(ESTADO_BLOCO[b.estado])}</span></span><span class="p-seta">${ic(I.seta)}</span></a>`).join('')}</div></section>
      <section class="p-card" aria-labelledby="cs-t"><div class="pe-cab"><h2 id="cs-t" style="font-size:20px">Carga semana a semana</h2><small class="pe-leg">UA planejadas</small></div>
        <div class="pe-sem" role="img" aria-label="Carga planejada de cada uma das ${T} semanas">${pe.semanas.map((x) => `<i class="${x.descarga ? 'desc' : ''} ${x.atual ? 'atual' : ''}" style="height:${Math.round((x.planejado / maxPl) * 84)}px;--cor:${pe.blocos[x.bloco].cor}"></i>`).join('')}</div>
        <div class="pe-ticks"><span>S1</span><span style="left:${pos(pe.semanaAtual)}">hoje</span><span class="fim">S${T}</span></div>
        <p class="pe-nota-b">Cada barra é uma semana, na cor do bloco. As mais claras são semanas de descarga.</p></section>
      <section class="p-card" aria-labelledby="cp-t"><h2 id="cp-t" style="font-size:20px">Competições</h2><ul class="p-lista">${pe.eventos.map(linhaEvento).join('')}</ul>
        <p class="p-sub">A é o alvo da temporada, B é importante e C é treino. Mudar a data ou a prioridade propõe um ajuste que você confirma.</p></section>`;
  }

  /* ---------- Registro rápido: uma folha, até 3 toques ---------- */

  let folha = null;
  function abrirRegistro(sessaoId) {
    const s = D.sessao(sessaoId);
    if (!s) return;
    const at = D.atletas(s.equipe);
    const estado = { presentes: new Set(at.filter((a) => a.estado === 'ok' || a.estado === 'atencao').map((a) => a.id)), pse: s.pse, porAtleta: {} };
    const origem = document.activeElement;
    const fundo = document.createElement('div'); fundo.className = 'p-fundo';
    const el = document.createElement('section'); el.className = 'p-folha'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'sh-t');
    document.body.append(fundo, el);
    folha = { el, fundo, origem };
    const fechar = () => { el.remove(); fundo.remove(); document.removeEventListener('keydown', teclas); folha = null; if (origem && document.contains(origem)) origem.focus(); };
    const teclas = (e) => {
      if (e.key === 'Escape') fechar();
      if (e.key === 'Tab') { const f = [...el.querySelectorAll('button, input, select, summary')].filter((x) => !x.disabled && x.offsetParent !== null); if (!f.length) return; const p = f[0], u = f[f.length - 1]; if (e.shiftKey && document.activeElement === p) { e.preventDefault(); u.focus(); } else if (!e.shiftKey && document.activeElement === u) { e.preventDefault(); p.focus(); } }
    };
    document.addEventListener('keydown', teclas);
    fundo.addEventListener('click', fechar);

    function desenhar(foco) {
      const presentes = at.filter((a) => estado.presentes.has(a.id));
      el.innerHTML = `
        <header><h2 id="sh-t">Registrar treino</h2><button type="button" class="p-x" aria-label="Fechar" data-fechar>×</button></header>
        <p class="meta">${esc(D.equipe(s.equipe).nome)} · ${esc(s.tipo)} · ${s.dur} min</p>
        <div class="p-bloco"><div class="p-bloco-t"><span class="p-rot">Quem veio</span><small class="num">${presentes.length} de ${at.length}</small></div>
          <div class="p-chips" style="gap:8px">${at.map((a) => `<button type="button" class="p-toggle ${estado.presentes.has(a.id) ? '' : 'fora'}" data-pres="${a.id}" aria-pressed="${estado.presentes.has(a.id)}">${esc(a.nome.split(' ')[0])}</button>`).join('')}</div></div>
        <div class="p-bloco"><div class="p-bloco-t"><span class="p-rot" id="pse-l">Esforço do grupo (PSE)</span><small>alvo ${s.pse}</small></div>
          <div class="p-pse" role="radiogroup" aria-labelledby="pse-l">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<button type="button" role="radio" class="${n === s.pse ? 'alvo' : ''}" aria-checked="${n === estado.pse}" data-pse="${n}">${n}</button>`).join('')}</div></div>
        <details><summary>Ajustar por atleta</summary>${presentes.length ? presentes.map((a) => `<div class="p-ajuste"><span>${esc(a.nome)}</span><select data-aj="${a.id}" aria-label="Esforço de ${esc(a.nome)}"><option value="">Igual ao grupo</option>${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<option value="${n}" ${estado.porAtleta[a.id] === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`).join('') : '<p class="p-vazio" style="padding:8px 0">Marque quem veio.</p>'}</details>
        <button type="button" class="p-btn primario grande" id="sh-salvar" ${presentes.length ? '' : 'disabled'}>Salvar treino</button>`;
      el.querySelector('[data-fechar]').addEventListener('click', fechar);
      el.querySelectorAll('[data-pres]').forEach((b) => b.addEventListener('click', () => { const id = b.dataset.pres; if (estado.presentes.has(id)) estado.presentes.delete(id); else estado.presentes.add(id); desenhar(`[data-pres="${id}"]`); }));
      el.querySelectorAll('[data-pse]').forEach((b) => b.addEventListener('click', () => { estado.pse = Number(b.dataset.pse); desenhar(`[data-pse="${b.dataset.pse}"]`); }));
      el.querySelectorAll('[data-aj]').forEach((x) => x.addEventListener('change', () => { if (x.value) estado.porAtleta[x.dataset.aj] = Number(x.value); else delete estado.porAtleta[x.dataset.aj]; }));
      el.querySelector('#sh-salvar').addEventListener('click', () => {
        D.registrar({ sessaoId: s.id, presentes: [...estado.presentes], pse: estado.pse, porAtleta: estado.porAtleta });
        fechar();
        aviso(`Treino registrado: ${plural(estado.presentes.size, 'presente', 'presentes')}, esforço ${estado.pse}.`);
        rotear();
      });
      const f = foco ? el.querySelector(foco) : el.querySelector('#sh-salvar');
      if (f) f.focus({ preventScroll: true });
    }
    desenhar();
  }

  let tAviso = null;
  function aviso(txt) {
    let a = document.getElementById('p-aviso');
    if (!a) { a = document.createElement('div'); a.id = 'p-aviso'; a.className = 'p-aviso'; a.setAttribute('role', 'status'); document.body.append(a); }
    a.textContent = txt; a.hidden = false;
    clearTimeout(tAviso); tAviso = setTimeout(() => { a.hidden = true; }, 3500);
  }

  /* ---------- Navegação ---------- */

  const NAV = [['hoje', 'Hoje', I.casa], ['periodo', 'Periodização', I.cal], ['equipes', 'Equipes', I.equipes], ['mais', 'Mais', I.mais]];
  const ativo = (rota) => (rota === 'hoje' ? 'hoje' : rota === 'mais' ? 'mais' : rota === 'periodo' || rota === 'plano' ? 'periodo' : 'equipes');
  let anterior = '', atual = '', verBem = false;
  const rotulo = (h) => { const [r, id] = h.slice(1).split('/'); if (r === 'hoje') return 'Hoje'; if (r === 'equipes') return 'Equipes'; if (r === 'mais') return 'Mais'; if (r === 'periodo') return 'Periodização'; if (r === 'equipe') { const e = D.equipe(id); return e ? e.nome : 'Equipe'; } return ''; };

  function rotear() {
    const h = location.hash || '#hoje';
    const [rota, id, aba, idx] = h.slice(1).split('/');
    const main = document.getElementById('p-main');
    let html = '';
    if (rota === 'hoje') html = hoje();
    else if (rota === 'equipes') html = equipes();
    else if (rota === 'equipe') html = `<a class="p-voltar" href="${anteriorValido(h, '#equipes')}" data-voltar>${ic(I.volta)}${voltaRotulo(h, 'Equipes')}</a>${equipe(id, verBem)}`;
    else if (rota === 'atleta') { const a = D.atleta(id); html = `<a class="p-voltar" href="${anteriorValido(h, a ? `#equipe/${a.eq}` : '#equipes')}" data-voltar>${ic(I.volta)}${voltaRotulo(h, a ? D.equipe(a.eq).nome : 'Equipes')}</a>${atleta(id)}`; }
    else if (rota === 'mais') html = mais();
    else if (rota === 'plano') { location.hash = `#periodo/${id || ''}/temporada`; return; }
    else if (rota === 'periodo') {
      const eqId = D.equipe(id) ? id : periodoEq || D.equipes()[0].id;
      const ab = ['semana', 'bloco', 'temporada'].includes(aba) ? aba : 'bloco';
      if (id !== eqId || aba !== ab) { location.replace(`#periodo/${eqId}/${ab}${idx ? `/${idx}` : ''}`); return; }
      html = periodizacao(eqId, ab, idx);
    }
    else { location.hash = '#hoje'; return; }
    main.innerHTML = html;
    document.querySelectorAll('.p-nav a').forEach((a) => { if (a.dataset.rota === ativo(rota)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.title = `${rota === 'hoje' ? 'Hoje' : rotulo(h) || 'Painel'} | Farol Tático`;
    ligar(main, rota, id);
    atual = h;
  }
  // O "‹" volta para a tela de onde o técnico veio, quando ela é uma tela principal; senão, para a de cima.
  function anteriorValido(h, padrao) { return anterior && anterior !== h && /^#(hoje|equipes|equipe\/|mais|periodo)/.test(anterior) ? anterior : padrao; }
  function voltaRotulo(h, padrao) { return anterior && anterior !== h && /^#(hoje|equipes|equipe\/|mais|periodo)/.test(anterior) ? rotulo(anterior) || padrao : padrao; }

  function ligar(main, rota, id) {
    main.querySelectorAll('[data-registrar]').forEach((b) => b.addEventListener('click', () => abrirRegistro(b.dataset.registrar)));
    main.querySelectorAll('[data-atleta]').forEach((b) => b.addEventListener('click', () => { location.hash = `#atleta/${b.dataset.atleta}`; }));
    const vb = main.querySelector('#ver-bem');
    if (vb) vb.addEventListener('click', () => { verBem = !verBem; const y = window.scrollY; rotear(); window.scrollTo({ top: y }); const n = document.getElementById('ver-bem'); if (n) n.focus({ preventScroll: true }); });
    const z = main.querySelector('#zerar');
    if (z) z.addEventListener('click', () => { D.zerarExemplo(); aviso('Registros do exemplo apagados.'); });
    main.querySelectorAll('[data-periodo-eq]').forEach((b) => b.addEventListener('click', () => { const ab = location.hash.split('/')[2] || 'bloco'; location.hash = `#periodo/${b.dataset.periodoEq}/${ab === 'bloco' ? 'bloco' : ab}`; }));
    main.querySelectorAll('[data-bloco-ir]').forEach((b) => b.addEventListener('click', () => { const [, eq] = location.hash.slice(1).split('/'); location.hash = `#periodo/${eq}/bloco/${b.dataset.blocoIr}`; }));
    if (rota === 'atleta') {
      const a = D.atleta(id);
      const abre = (btn, alvo) => btn.addEventListener('click', () => { const x = alvo.hidden; alvo.hidden = !x; btn.setAttribute('aria-expanded', String(x)); if (x) { const f = alvo.querySelector('input, select'); if (f) f.focus(); } });
      const la = main.querySelector('#les-abrir'); if (la) la.addEventListener('click', () => { main.querySelector('#les-form').hidden = false; la.hidden = true; main.querySelector('#les-local').focus(); });
      const ls = main.querySelector('#les-salvar'); if (ls) ls.addEventListener('click', () => { D.registrarLesao(a.id, main.querySelector('#les-local').value); aviso('Lesão registrada. O atleta saiu da lista de disponíveis.'); rotear(); });
      const lb = main.querySelector('#liberar'); if (lb) lb.addEventListener('click', () => { D.liberarRetorno(a.id); aviso(`${a.nome.split(' ')[0]} liberado para treinar.`); rotear(); });
      const fa = main.querySelector('#ficha-abrir'); if (fa) abre(fa, main.querySelector('#ficha-form'));
      const ff = main.querySelector('#ficha-form');
      if (ff) ff.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = (s) => main.querySelector(s).value.trim();
        D.salvarFicha(a.id, { nasc: v('#f-nasc'), altura: v('#f-altura'), mao: v('#f-mao'), telefone: v('#f-tel'), emergenciaNome: v('#f-em'), alergias: v('#f-al'), atestado: v('#f-at') });
        aviso('Ficha salva.'); rotear();
      });
    }
    if (!window.__painelPrimeira) { window.__painelPrimeira = true; } else { const h1 = main.querySelector('h1'); if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); } }
  }

  function iniciar() {
    document.querySelector('.p-marca').insertAdjacentHTML('afterbegin', `<b>${MARCA}Farol Tático</b>`);
    document.querySelector('.p-nav').innerHTML = NAV.map(([r, n, d]) => `<a href="#${r}" data-rota="${r}">${ic(d, 22)}${n}</a>`).join('');
    window.addEventListener('hashchange', () => { anterior = atual; rotear(); window.scrollTo({ top: 0 }); });
    if (!location.hash) location.hash = '#hoje'; else rotear();
  }
  document.addEventListener('DOMContentLoaded', iniciar);
})();
