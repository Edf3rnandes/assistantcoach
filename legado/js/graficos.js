/* Gráficos do painel (SVG puro, sem biblioteca).
   - grafico(): barras, linhas e áreas num eixo só, com faixa de referência, marca de "hoje", dica ao passar o
     mouse (ou com as setas do teclado) e redesenho conforme a largura, para o texto manter o tamanho no celular.
   - cartao() / ativar(): cartão com título, legenda e alternância Gráfico | Tabela (todo valor também está na tabela).
   - spark(): minigráfico para indicadores.
   Regras visuais: linhas de 2px, barras de até 24px com ponta arredondada, grade fina e discreta, texto sempre
   nas cores de texto (a cor da série vai só na marca ao lado), cores de status reservadas para o semáforo. */
(function () {
  const { esc, clamp } = window.Farol.util;

  const COR = { a: 'var(--accent)', b: 'var(--s-tatica)', c: 'var(--ink-2)', plano: 'var(--ink-2)' };

  function bonito(x) {
    if (x <= 0) return 1;
    const e = 10 ** Math.floor(Math.log10(x));
    const f = x / e;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
  }
  function marcas(min, max, passo) {
    const out = [];
    for (let v = Math.ceil(min / passo) * passo; v <= max + passo * 1e-6; v += passo) out.push(+v.toFixed(6));
    return out;
  }

  /* ---------- Gráfico principal ---------- */

  function grafico(host, cfg) {
    host.classList.add('gf');
    host.tabIndex = 0;
    host.setAttribute('role', 'group');
    host.setAttribute('aria-label', cfg.rotulo || 'Gráfico');
    const tt = document.createElement('div');
    tt.className = 'gf-tt';
    tt.hidden = true;
    const n = cfg.x.length;
    let geo = null;
    let ativo = -1;

    const todos = cfg.series.flatMap((s) => s.y).filter((v) => v != null);
    const yMin = cfg.yMin != null ? cfg.yMin : 0;
    let passo = null;
    let yMax = cfg.yMax;
    if (yMax == null) {
      const mx = Math.max(...todos, 1);
      passo = bonito(mx / 4);
      if (passo * 4 > mx * 1.6) passo /= 2;
      yMax = Math.ceil((mx * 1.02) / passo) * passo;
    } else {
      passo = bonito((yMax - yMin) / (cfg.nMarcas || 4));
    }
    const fmtY = cfg.fmtY || ((v) => v.toLocaleString('pt-BR'));

    function desenhar() {
      const W = Math.max(260, Math.floor(host.clientWidth || 600));
      const H = cfg.altura || 220;
      const M = { t: 16, r: 16, b: 28, l: cfg.margemEsq || 46 };
      const iw = W - M.l - M.r, ih = H - M.t - M.b;
      const slot = iw / n;
      const y = (v) => M.t + ih - ((v - yMin) / (yMax - yMin)) * ih;
      const xc = (i) => M.l + slot * (i + 0.5);
      geo = { W, H, M, slot, y, xc, iw, ih };
      const base = y(yMin);

      const p = [];
      marcas(yMin, yMax, passo).forEach((v) => {
        p.push(`<line x1="${M.l}" x2="${W - M.r}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="gf-grade"/>`);
        p.push(`<text x="${M.l - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" class="gf-eixo">${esc(fmtY(v))}</text>`);
      });
      if (cfg.faixa) {
        const f = cfg.faixa;
        p.push(`<rect x="${M.l}" y="${y(f.ate).toFixed(1)}" width="${iw}" height="${(y(f.de) - y(f.ate)).toFixed(1)}" class="gf-faixa"/>`);
        p.push(`<text x="${M.l + 6}" y="${(y(f.de) - 6).toFixed(1)}" class="gf-faixa-t">${esc(f.rotulo)}</text>`);
      }
      const passoX = Math.max(1, Math.ceil(38 / slot));
      cfg.x.forEach((r, i) => { if (i % passoX === 0) p.push(`<text x="${xc(i).toFixed(1)}" y="${H - 8}" text-anchor="middle" class="gf-eixo">${esc(r)}</text>`); });
      (cfg.marcasX || []).forEach((m) => {
        p.push(`<line x1="${xc(m.i).toFixed(1)}" x2="${xc(m.i).toFixed(1)}" y1="${M.t}" y2="${base.toFixed(1)}" class="gf-marca"/>`);
        p.push(`<text x="${xc(m.i).toFixed(1)}" y="${M.t - 4}" text-anchor="middle" class="gf-eixo gf-forte">${esc(m.rotulo)}</text>`);
      });

      const fim = [];
      cfg.series.forEach((s) => {
        const cor = COR[s.cor] || COR.a;
        if (s.tipo === 'barra') {
          const bw = Math.min(24, slot * 0.62);
          s.y.forEach((v, i) => {
            if (v == null) return;
            const x0 = xc(i) - bw / 2, yt = y(v), r = Math.max(0, Math.min(4, bw / 2, base - yt));
            p.push(`<path d="M${x0.toFixed(1)} ${base.toFixed(1)} V${(yt + r).toFixed(1)} Q${x0.toFixed(1)} ${yt.toFixed(1)} ${(x0 + r).toFixed(1)} ${yt.toFixed(1)} H${(x0 + bw - r).toFixed(1)} Q${(x0 + bw).toFixed(1)} ${yt.toFixed(1)} ${(x0 + bw).toFixed(1)} ${(yt + r).toFixed(1)} V${base.toFixed(1)} Z" style="fill:${cor};fill-opacity:${s.opac || 0.3}"/>`);
          });
        } else {
          // segmentos contínuos, sem ligar pontos separados por falta de dado
          const segs = [];
          let atual2 = [];
          s.y.forEach((v, i) => { if (v == null) { if (atual2.length) segs.push(atual2); atual2 = []; } else atual2.push([xc(i), y(v)]); });
          if (atual2.length) segs.push(atual2);
          segs.forEach((seg) => {
            const pts = seg.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
            if (s.tipo === 'area') p.push(`<polygon points="${seg[0][0].toFixed(1)},${base.toFixed(1)} ${pts} ${seg[seg.length - 1][0].toFixed(1)},${base.toFixed(1)}" style="fill:${cor};fill-opacity:0.1"/>`);
            p.push(`<polyline points="${pts}" fill="none" style="stroke:${cor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"${s.tracejada ? ' stroke-dasharray="6 5"' : ''}/>`);
          });
          // marcador e rótulo só no último ponto
          let ult = -1;
          s.y.forEach((v, i) => { if (v != null) ult = i; });
          if (ult >= 0 && s.marcarUltimo !== false) {
            fim.push(`<circle cx="${xc(ult).toFixed(1)}" cy="${y(s.y[ult]).toFixed(1)}" r="4.5" class="gf-ponto" style="fill:${cor}"/>`);
            if (s.rotuloUltimo !== false) fim.push(`<text x="${Math.min(xc(ult), W - M.r - 14).toFixed(1)}" y="${(y(s.y[ult]) - 10).toFixed(1)}" text-anchor="middle" class="gf-valor">${esc((s.fmt || fmtY)(s.y[ult]))}</text>`);
          }
        }
      });
      p.push(...fim);
      p.push('<g id="gf-cruz"></g>');
      p.push(`<rect x="${M.l}" y="${M.t}" width="${iw}" height="${ih}" class="gf-hit"/>`);

      host.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" class="gf-svg" aria-hidden="true">${p.join('')}</svg>`;
      host.appendChild(tt);
      if (ativo >= 0) mostrar(ativo);
    }

    function mostrar(i) {
      ativo = i;
      const { H, M, xc, y, W } = geo;
      const g = host.querySelector('#gf-cruz');
      if (!g) return;
      let h = `<line x1="${xc(i).toFixed(1)}" x2="${xc(i).toFixed(1)}" y1="${M.t}" y2="${H - M.b}" class="gf-cruz"/>`;
      cfg.series.forEach((s) => {
        if (s.tipo !== 'barra' && s.y[i] != null) h += `<circle cx="${xc(i).toFixed(1)}" cy="${y(s.y[i]).toFixed(1)}" r="5" class="gf-ponto" style="fill:${COR[s.cor] || COR.a}"/>`;
      });
      g.innerHTML = h;
      const linhas = cfg.series.filter((s) => s.y[i] != null).map((s) => `<div class="gf-tt-l"><i class="gf-chave ${s.tipo === 'barra' ? 'barra' : ''}" style="background:${COR[s.cor] || COR.a};${s.tipo === 'barra' ? 'opacity:.45' : ''}"></i><span>${esc(s.nome)}</span><b class="num">${esc((s.fmt || fmtY)(s.y[i]))}</b></div>`).join('');
      tt.innerHTML = `<div class="gf-tt-t">${esc(cfg.tituloDica ? cfg.tituloDica(i) : cfg.x[i])}</div>${linhas}`;
      tt.hidden = false;
      const lw = tt.offsetWidth;
      let left = xc(i) + 14;
      if (left + lw > W - 4) left = xc(i) - lw - 14;
      tt.style.left = `${Math.max(4, left)}px`;
      tt.style.top = `${M.t + 6}px`;
    }
    function esconder() {
      ativo = -1;
      tt.hidden = true;
      const g = host.querySelector('#gf-cruz');
      if (g) g.innerHTML = '';
    }

    host.addEventListener('pointermove', (e) => {
      if (!geo) return;
      const r = host.getBoundingClientRect();
      const i = clamp(Math.floor((e.clientX - r.left - geo.M.l) / geo.slot), 0, n - 1);
      if (i !== ativo) mostrar(i);
    });
    host.addEventListener('pointerleave', esconder);
    host.addEventListener('blur', esconder);
    host.addEventListener('keydown', (e) => {
      const passo = { ArrowLeft: -1, ArrowRight: 1, Home: -n, End: n }[e.key];
      if (!passo) { if (e.key === 'Escape') esconder(); return; }
      e.preventDefault();
      mostrar(clamp((ativo < 0 ? n - 1 : ativo) + passo, 0, n - 1));
    });

    desenhar();
    let larg = host.clientWidth;
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        if (!host.isConnected) { ro.disconnect(); return; }
        if (Math.abs(host.clientWidth - larg) > 6) { larg = host.clientWidth; desenhar(); }
      });
      ro.observe(host);
    }
  }

  /* ---------- Cartão com Gráfico | Tabela ---------- */

  function legenda(cfg) {
    if (cfg.series.length < 2) return '';
    return `<div class="gf-legenda">${cfg.series.map((s) => `<span><i class="gf-chave ${s.tipo === 'barra' ? 'barra' : ''}" style="background:${COR[s.cor] || COR.a};${s.tipo === 'barra' ? 'opacity:.45' : ''}"></i>${esc(s.nome)}</span>`).join('')}</div>`;
  }

  function tabela(cfg) {
    const fmtY = cfg.fmtY || ((v) => v.toLocaleString('pt-BR'));
    return `<div class="table-scroll"><table class="gf-tab"><thead><tr><th>${esc(cfg.rotuloX || 'Período')}</th>${cfg.series.map((s) => `<th class="r">${esc(s.nome)}</th>`).join('')}</tr></thead>
      <tbody>${cfg.x.map((r, i) => `<tr><td>${esc(cfg.tituloDica ? cfg.tituloDica(i) : r)}</td>${cfg.series.map((s) => `<td class="r num">${s.y[i] == null ? '–' : esc((s.fmt || fmtY)(s.y[i]))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function cartao(id, cfg) {
    return `
      <section class="card gf-card" id="${id}" aria-labelledby="${id}-t">
        <div class="gf-cab">
          <div><h2 id="${id}-t">${esc(cfg.titulo)}</h2>${cfg.sub ? `<p class="gf-sub">${esc(cfg.sub)}</p>` : ''}</div>
          <div class="seg-ctl gf-alterna" role="group" aria-label="Forma de exibir">
            <button class="seg-btn" data-vista="grafico" aria-pressed="true">Gráfico</button>
            <button class="seg-btn" data-vista="tabela" aria-pressed="false">Tabela</button>
          </div>
        </div>
        ${legenda(cfg)}
        <div class="gf-area"></div>
        <div class="gf-tabela" hidden>${tabela(cfg)}</div>
        ${cfg.nota ? `<p class="gf-nota">${esc(cfg.nota)}</p>` : ''}
      </section>`;
  }

  function ativar(raiz, id, cfg) {
    const sec = raiz.querySelector(`#${id}`);
    if (!sec) return;
    const area = sec.querySelector('.gf-area');
    const tab = sec.querySelector('.gf-tabela');
    grafico(area, cfg);
    sec.querySelectorAll('[data-vista]').forEach((b) => b.addEventListener('click', () => {
      const t = b.dataset.vista === 'tabela';
      area.hidden = t; tab.hidden = !t;
      sec.querySelectorAll('[data-vista]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    }));
  }

  /* ---------- Minigráfico ---------- */

  function spark(vals, o = {}) {
    const v = vals.filter((x) => x != null);
    if (v.length < 2) return '';
    const w = o.w || 92, h = o.h || 30, pad = 5;
    const min = Math.min(...v), max = Math.max(...v);
    const span = max - min || 1;
    const pts = vals.map((x, i) => (x == null ? null : [pad + (i / (vals.length - 1)) * (w - 2 * pad), pad + (1 - (x - min) / span) * (h - 2 * pad)])).filter(Boolean);
    const ult = pts[pts.length - 1];
    return `<svg class="gf-spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">
      <polyline points="${pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ')}" fill="none" class="gf-spark-l" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${ult[0].toFixed(1)}" cy="${ult[1].toFixed(1)}" r="4" class="gf-spark-p"/></svg>`;
  }

  window.Farol.graficos = { grafico, cartao, ativar, spark, COR };
})();
