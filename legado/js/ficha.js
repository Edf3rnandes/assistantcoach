/* Ficha do atleta (`ficha`, parâmetro `atletaId`): o cadastro completo de um atleta, a situação de saúde e a carga da semana.
   A faixa vem da data de nascimento. A ficha mostra quanto falta preencher; ela é só do técnico (o atleta não vê esta tela). */
(function () {
  const { elenco, dados, util, analise: A, registros: REG } = window.Farol;
  const { esc, dec, dd, HOJE, DIA, plural } = util;
  const { ATLETAS, TURMAS, cadastro: CAD } = elenco;

  const MAOS = { destro: 'Destro', canhoto: 'Canhoto', ambidestro: 'Ambidestro' };
  const POSICOES = { defensor: 'Defensor', bloqueador: 'Bloqueador', ambos: 'Defensor e bloqueador' };
  const iniciais = (n) => n.split(' ').filter((x) => x.length > 2).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  const brData = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
  const isoMs = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };

  const est = { id: null, aviso: '', erro: '', campo: '' };

  // O que falta na ficha: cada item vale um ponto; o responsável só conta para menores de 18.
  function completude(a) {
    const menor = a.nascimento ? CAD.idadeEm(a.nascimento) < 18 : false;
    const itens = [
      ['nascimento', 'Nascimento', !!a.nascimento],
      ['altura', 'Altura', !!a.altura],
      ['mao', 'Mão dominante', !!a.mao],
      ['posicao', 'Posição', !!a.posicao],
      ['telefone', 'Telefone', !!a.telefone],
      ['emergenciaNome', 'Contato de emergência', !!(a.emergenciaNome && a.emergenciaTel)],
      ['alergias', 'Alergias e condições', a.alergias != null && a.alergias !== ''],
      ['atestado', 'Atestado médico', !!a.atestado],
    ];
    if (menor) itens.splice(5, 0, ['responsavel', 'Responsável', !!(a.responsavel && a.responsavelTel)]);
    const ok = itens.filter((i) => i[2]).length;
    return { itens, ok, total: itens.length, pct: Math.round((100 * ok) / itens.length), menor };
  }

  // Velocímetro do ACWR: arco de 0 a 2 com as zonas (abaixo, segura, atenção, alta) e o ponteiro.
  function velocimetro(v) {
    const ang = (x) => Math.PI * (1 - Math.min(2, Math.max(0, x)) / 2);
    const pt = (x, r) => [100 + r * Math.cos(ang(x)), 100 - r * Math.sin(ang(x))];
    const arco = (de, ate, cor) => { const [x1, y1] = pt(de, 80), [x2, y2] = pt(ate, 80); return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} A80 80 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${cor}" stroke-width="16" fill="none"/>`; };
    const [px, py] = pt(v == null ? 1 : v, 62);
    return `<svg class="fi-vel" width="200" height="116" viewBox="0 0 200 116" role="img" aria-label="${v == null ? 'ACWR ainda sem dados' : `ACWR ${dec(v)}`}">
      ${arco(0, 0.8, '#8db6f0')}${arco(0.8, 1.3, '#4db982')}${arco(1.3, 1.5, '#f2b84b')}${arco(1.5, 2, '#e5493d')}
      ${v == null ? '' : `<path d="M100 100 L${px.toFixed(1)} ${py.toFixed(1)}" stroke="var(--ink)" stroke-width="4" stroke-linecap="round"/><circle cx="100" cy="100" r="8" fill="var(--ink)"/>`}</svg>`;
  }

  function montar(root, params) {
    if (params && params.atletaId) { est.id = params.atletaId; est.aviso = ''; est.erro = ''; }
    const a = ATLETAS[est.id];
    if (!a) { window.Farol.ir('inicio'); return; }
    const t = CAD.turmaDe(a.id);
    const plano = t ? window.Farol.equipes.planoDe(t) : null;
    const sit = elenco.situacaoDe(a.id);
    let an = null;
    if (plano) { try { an = A.atletas(plano).find((x) => x.id === a.id) || null; } catch (e) { an = null; } }
    const c = completude(a);
    const idade = a.nascimento ? CAD.idadeEm(a.nascimento) : null;
    const aviso = est.aviso, erro = est.erro;
    est.aviso = ''; est.erro = '';
    const dias = a.atestado ? Math.round((isoMs(a.atestado) - HOJE) / DIA) : null;
    const estado = sit ? (sit.tipo === 'lesao' ? ['lesao', 'Lesionado'] : ['retorno', 'Em retorno']) : an && an.nivel !== 'ok' ? ['atencao', 'Atenção'] : ['ok', 'Disponível'];
    const campo = (id, rot, valor, extra = '') => `<div class="field"><label class="label" for="${id}">${rot}</label><input class="input" id="${id}" value="${esc(valor || '')}" ${extra}></div>`;
    const sel = (id, rot, mapa, atual) => `<div class="field"><label class="label" for="${id}">${rot}</label><select class="select" id="${id}"><option value="">Não informado</option>${Object.entries(mapa).map(([k, n]) => `<option value="${k}" ${atual === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`;

    root.innerHTML = `
      <section class="ph fi-topo" aria-label="${esc(a.nome)}">
        <div class="ph-glow" aria-hidden="true"></div>
        <div class="fi-id">
          <span class="fi-av">${esc(iniciais(a.nome))}</span>
          <div><h1>${esc(a.nome)}</h1>
            <p class="ph-sub">${esc(a.faixa)} · ${a.genero === 'F' ? 'feminino' : 'masculino'}${idade != null ? ` · ${idade} anos` : ''}</p>
            <span class="atb-c ${estado[0]}">${estado[1]}</span></div>
        </div>
        <dl class="ph-stats fi-st">
          <div><dt>Equipe</dt><dd>${esc(t ? t.nome : '–')}</dd></div>
          <div><dt>Categoria ${new Date(HOJE).getUTCFullYear()}</dt><dd>${esc(`${a.faixa} ${a.genero === 'F' ? 'Fem' : 'Masc'}`)}</dd></div>
        </dl>
      </section>
      ${aviso ? `<div class="aviso-ok" role="status">${esc(aviso)}</div>` : ''}

      <section class="card" aria-labelledby="fi-c-t">
        <div class="card-head"><h2 id="fi-c-t">Ficha ${c.pct}% completa</h2><span class="label num">${c.ok} de ${c.total}</span></div>
        <div class="in-prog" role="img" aria-label="${c.pct}% da ficha"><i style="width:${c.pct}%"></i></div>
        ${c.ok < c.total ? `<div class="fi-falta">${c.itens.filter((i) => !i[2]).map((i) => `<span>+ ${esc(i[1])}</span>`).join('')}</div>` : '<p class="hint" style="margin-top:10px">Tudo preenchido.</p>'}
      </section>

      <form class="card fi-form" id="fi-form" novalidate aria-labelledby="fi-d-t">
        <div class="card-head"><h2 id="fi-d-t">Dados</h2></div>
        <div class="form-grid">
          ${campo('fi-nome', 'Nome', a.nome, 'maxlength="60"')}
          <div class="field"><label class="label" for="fi-nasc">Nascimento</label><input class="input" type="date" id="fi-nasc" value="${esc(a.nascimento || '')}" min="1940-01-01" max="${new Date(HOJE).toISOString().slice(0, 10)}"></div>
          ${campo('fi-altura', 'Altura (cm)', a.altura, 'inputmode="numeric" maxlength="3"')}
          ${sel('fi-mao', 'Mão dominante', MAOS, a.mao)}
          ${sel('fi-pos', 'Posição', POSICOES, a.posicao)}
          ${campo('fi-tel', 'Telefone', a.telefone, 'inputmode="tel" maxlength="20"')}
          ${c.menor || !a.nascimento ? `${campo('fi-resp', `Responsável${c.menor ? '' : ' (menores de 18)'}`, a.responsavel, 'maxlength="60"')}${campo('fi-resp-tel', 'Telefone do responsável', a.responsavelTel, 'inputmode="tel" maxlength="20"')}` : ''}
          ${campo('fi-em-nome', 'Contato de emergência', a.emergenciaNome, 'maxlength="60"')}
          ${campo('fi-em-tel', 'Telefone de emergência', a.emergenciaTel, 'inputmode="tel" maxlength="20"')}
          ${campo('fi-alergias', 'Alergias e condições de saúde', a.alergias, 'maxlength="160" placeholder="Escreva “nenhuma” se não houver"')}
          <div class="field"><label class="label" for="fi-atestado">Atestado médico vale até</label><input class="input" type="date" id="fi-atestado" value="${esc(a.atestado || '')}"></div>
        </div>
        <div class="field" style="margin-top:12px"><label class="label" for="fi-obs">Observações do técnico</label><textarea class="input" id="fi-obs" rows="3" maxlength="400">${esc(a.obs || '')}</textarea></div>
        <p class="en-erro" id="fi-erro" role="alert">${esc(erro)}</p>
        <div class="actions"><button class="btn btn-primary" type="submit">Salvar ficha</button></div>
      </form>

      <section class="card" aria-labelledby="fi-s-t">
        <div class="card-head"><h2 id="fi-s-t">Saúde</h2></div>
        <div class="fi-linha"><span>Atestado médico</span>${dias == null ? '<span class="atb-c atencao">não informado</span>' : dias < 0 ? '<span class="atb-c lesao">vencido</span>' : dias <= 30 ? `<span class="atb-c atencao">vence em ${plural(dias, 'dia', 'dias')}</span>` : `<span class="atb-c ok">válido até ${esc(brData(a.atestado))}</span>`}</div>
        <div class="fi-linha"><span>Situação</span>${sit ? `<span class="atb-c ${estado[0]}">${esc(sit.local)}: ${esc(sit.texto)}</span>` : '<span class="atb-c ok">sem restrição</span>'}</div>
        <div class="actions" style="margin-top:12px"><button class="btn btn-sm" id="fi-saude">${sit ? 'Abrir a lesão' : 'Registrar lesão'}</button></div>
      </section>

      <section class="card" aria-labelledby="fi-k-t">
        <div class="card-head"><h2 id="fi-k-t">Carga</h2><span class="label">${plano ? esc(plano.nome) : 'sem periodização'}</span></div>
        ${an ? `<div class="fi-vel-w">${velocimetro(an.acwr)}<div class="fi-vel-n"><b class="num">${an.acwr != null ? dec(an.acwr) : '–'}</b><small>ACWR${an.acwrInfo && !an.acwrInfo.confiavel ? ' (poucas semanas)' : ''}</small></div></div>
          <div class="fi-3"><span><b class="num">${an.pse != null ? dec(an.pse) : '–'}</b><small>PSE médio</small></span><span><b class="num">${an.psr != null ? dec(an.psr) : '–'}</b><small>PSR médio</small></span><span><b class="num">${an.pres != null ? `${Math.round(an.pres)}%` : '–'}</b><small>presença</small></span></div>`
          : '<p class="vazio" style="padding:4px 0">A carga aparece depois da primeira semana completa com registros.</p>'}
        <div class="actions" style="margin-top:12px"><button class="btn btn-sm" id="fi-carga">Ver a análise da carga</button></div>
      </section>`;

    const $ = (s) => root.querySelector(s);
    $('#fi-saude').addEventListener('click', () => window.Farol.ir('saude', sit ? { foco: a.id } : { novo: true, atletaId: a.id }));
    $('#fi-carga').addEventListener('click', () => window.Farol.ir('analise', { aba: 'carga', atleta: a.id }));
    $('#fi-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const v = (id) => ($(id) ? $(id).value : undefined);
      const patch = {
        nome: v('#fi-nome'), nascimento: v('#fi-nasc'), altura: v('#fi-altura'), mao: v('#fi-mao'), posicao: v('#fi-pos'), telefone: v('#fi-tel'),
        emergenciaNome: v('#fi-em-nome'), emergenciaTel: v('#fi-em-tel'), alergias: v('#fi-alergias'), atestado: v('#fi-atestado'), obs: v('#fi-obs'),
      };
      if ($('#fi-resp')) { patch.responsavel = v('#fi-resp'); patch.responsavelTel = v('#fi-resp-tel'); }
      if (patch.altura && !/^\d{2,3}$/.test(patch.altura.trim())) { est.erro = 'Escreva a altura em centímetros, por exemplo 178.'; montar(root); return; }
      const r = CAD.atualizarAtleta(a.id, patch);
      if (r.erro) { est.erro = r.erro; montar(root); return; }
      if (dados.recarregar) dados.recarregar();
      est.aviso = 'Ficha salva.';
      montar(root);
    });
  }

  window.Farol.views = window.Farol.views || {};
  window.Farol.views.ficha = montar;
  void REG; void dd;
})();
