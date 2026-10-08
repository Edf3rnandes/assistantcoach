/* Regras de cálculo do assistente: datas, semanas, carga interna (PSE × minutos),
   fatores de carga do mesociclo e cobertura dos fundamentos. Sem DOM, roda no navegador e no Node. */
(function (raiz) {
  const DIA = 86400000;

  /* ---------- Datas (texto AAAA-MM-DD, sempre em UTC para não escorregar com fuso) ---------- */

  const ms = (s) => { const [a, m, d] = s.split('-').map(Number); return Date.UTC(a, m - 1, d); };
  const iso = (t) => new Date(t).toISOString().slice(0, 10);
  const addDias = (s, n) => iso(ms(s) + n * DIA);
  const diffDias = (a, b) => Math.round((ms(b) - ms(a)) / DIA);
  const segundaDe = (s) => addDias(s, -((new Date(ms(s)).getUTCDay() + 6) % 7));
  const hojeISO = () => { const d = new Date(); return iso(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); };
  const semanasEntre = (ini, fim) => {
    const out = [];
    for (let s = segundaDe(ini); s <= fim; s = addDias(s, 7)) out.push(s);
    return out;
  };

  const soma = (v) => v.reduce((a, b) => a + b, 0);
  const media = (v) => (v.length ? soma(v) / v.length : null);
  const arred = (n, c = 0) => (n == null ? null : Math.round(n * 10 ** c) / 10 ** c);

  /* ---------- Mesociclo ---------- */

  const fimMeso = (m) => addDias(m.inicio, m.semanas * 7 - 1);

  const PERFIS = {
    '3:1': 'Três semanas de subida e uma de descarga',
    '2:1': 'Duas semanas de subida e uma de descarga',
    progressiva: 'Subida contínua, sem descarga',
    plana: 'Carga constante',
    polimento: 'Redução gradual para competir descansado',
  };

  /* Fator de carga (1 = carga de referência do mesociclo) de cada semana. */
  function fatoresCarga(perfil, n) {
    const f = [];
    for (let i = 0; i < n; i++) {
      let v = 1;
      if (perfil === '3:1' || perfil === '2:1') {
        const k = perfil === '3:1' ? 3 : 2;
        const pos = i % (k + 1);
        const base = k === 3 ? 0.8 : 0.85;
        v = pos < k ? base + (1 - base) * (pos / (k - 1)) : (k === 3 ? 0.6 : 0.65);
      } else if (perfil === 'progressiva') {
        v = n === 1 ? 1 : 0.7 + 0.3 * (i / (n - 1));
      } else if (perfil === 'polimento') {
        v = n === 1 ? 0.6 : 0.85 - 0.35 * (i / (n - 1));
      }
      f.push(arred(v, 2));
    }
    return f;
  }

  const mesoDaData = (perio, data) =>
    (perio.mesociclos || []).find((m) => data >= m.inicio && data <= fimMeso(m)) || null;

  /* Aponta sobreposição, buracos e mesociclos fora do macrociclo. */
  function validarMesos(perio) {
    const av = [];
    const ms_ = [...(perio.mesociclos || [])].sort((a, b) => a.inicio.localeCompare(b.inicio));
    for (let i = 0; i < ms_.length; i++) {
      const m = ms_[i];
      if (m.inicio < perio.inicio) av.push(`"${m.nome}" começa antes do início da periodização.`);
      if (perio.fim && fimMeso(m) > perio.fim) av.push(`"${m.nome}" termina depois do fim da periodização.`);
      const p = ms_[i + 1];
      if (!p) continue;
      const folga = diffDias(fimMeso(m), p.inicio) - 1;
      if (folga < 0) av.push(`"${m.nome}" e "${p.nome}" se sobrepõem.`);
      else if (folga > 0) av.push(`Há ${folga} dia${folga > 1 ? 's' : ''} sem mesociclo entre "${m.nome}" e "${p.nome}".`);
    }
    for (const c of perio.competicoes || []) {
      if (c.data < perio.inicio || (perio.fim && c.data > perio.fim)) av.push(`A competição "${c.nome}" (${c.data.slice(8)}/${c.data.slice(5, 7)}) está fora do período da periodização.`);
    }
    const as = (perio.competicoes || []).filter((c) => c.prioridade === 'A' && c.situacao !== 'cancelada').sort((a, b) => a.data.localeCompare(b.data));
    for (let i = 0; i + 1 < as.length; i++) {
      const gap = Math.floor(diffDias(as[i].data, as[i + 1].data) / 7);
      if (gap < 6) av.push(`"${as[i].nome}" e "${as[i + 1].nome}" são A com ${gap} semana${gap === 1 ? '' : 's'} de distância. Menos de 6 semanas não dá para construir e reduzir duas vezes; considere deixar uma como B.`);
    }
    return av;
  }

  /* Divide um período em fases na proporção usual (base, desenvolvimento, pré e competitivo). */
  function sugerirEstrutura(inicio, fim) {
    const total = Math.max(4, Math.ceil((diffDias(segundaDe(inicio), fim) + 1) / 7));
    const partes = [['base', 0.3], ['desenvolvimento', 0.3], ['precompetitivo', 0.2], ['competitivo', 0.2]];
    let sobra = total;
    const out = partes.map(([fase, p], i) => {
      const n = i === partes.length - 1 ? sobra : Math.min(6, Math.max(2, Math.round(total * p)));
      sobra -= n;
      return { fase, semanas: n };
    });
    return out.filter((o) => o.semanas > 0);
  }

  /* ---------- Carga interna (PSE da sessão × minutos), por atleta ---------- */

  function cargaSessao(t, atletaId) {
    const p = t.presencas && t.presencas[atletaId];
    if (!t.feito || !p || !p.presente || p.pse == null) return null;
    return p.pse * (t.duracao || 0);
  }

  function mediaSessao(t, campo) {
    const v = Object.values(t.presencas || {}).filter((p) => p.presente && p[campo] != null).map((p) => p[campo]);
    return media(v);
  }

  const doDia = (treinos, de, ate) => treinos.filter((t) => t.data >= de && t.data <= ate);

  function cargaSemanal(treinos, atletaId, seg) {
    return soma(doDia(treinos, seg, addDias(seg, 6)).map((t) => cargaSessao(t, atletaId) || 0));
  }

  /* ACWR: carga da semana ÷ média das semanas anteriores (até 4) que tiveram carga.
     Precisa de pelo menos 3 semanas de base, senão não há valor confiável. */
  function acwr(treinos, atletaId, seg) {
    const atual = cargaSemanal(treinos, atletaId, seg);
    const base = [1, 2, 3, 4].map((i) => cargaSemanal(treinos, atletaId, addDias(seg, -7 * i))).filter((c) => c > 0);
    if (base.length < 3 || atual === 0) return { valor: null, base: base.length, faixa: null };
    const valor = atual / media(base);
    const faixa = valor < 0.8 ? 'abaixo' : valor <= 1.3 ? 'ideal' : valor <= 1.5 ? 'atencao' : 'alto';
    return { valor: arred(valor, 2), base: base.length, faixa };
  }

  function resumoSemana(treinos, atletas, seg) {
    const ts = doDia(treinos, seg, addDias(seg, 6));
    const feitos = ts.filter((t) => t.feito);
    const cargas = atletas.map((a) => cargaSemanal(treinos, a.id, seg)).filter((c) => c > 0);
    const pse = feitos.map((t) => mediaSessao(t, 'pse')).filter((v) => v != null);
    const psr = feitos.map((t) => mediaSessao(t, 'psr')).filter((v) => v != null);
    return {
      sessoes: ts.length,
      feitas: feitos.length,
      cargaMedia: arred(media(cargas)),
      pseMedio: arred(media(pse), 1),
      psrMedio: arred(media(psr), 1),
      minutos: soma(feitos.map((t) => t.duracao || 0)),
    };
  }

  /* Carga planejada (referência × fator) contra a realizada (média do grupo), semana a semana. */
  function planejadoReal(meso, treinos, atletas, hoje, mods = {}, cargas = {}) {
    const fat = fatoresCarga(meso.perfil, meso.semanas);
    return fat.map((fPerfil, i) => {
      const seg = addDias(segundaDe(meso.inicio), 7 * i);
      const f = arred(fPerfil * (mods[seg] ? mods[seg].mod : 1), 2);
      const reais = atletas.map((a) => cargaSemanal(treinos, a.id, seg)).filter((c) => c > 0);
      return {
        seg,
        fator: f,
        planejado: cargas[seg] != null ? cargas[seg] : meso.cargaRef ? Math.round(meso.cargaRef * f) : null,
        real: seg > hoje ? null : arred(media(reais)),
        atual: hoje >= seg && hoje <= addDias(seg, 6),
      };
    });
  }

  /* ---------- Fundamentos do mesociclo ---------- */

  function cobreTopico(topico, t) {
    return (t.fundamentos || []).some((f) => {
      if (f.fundamento !== topico.fundamento) return false;
      if (!topico.tipos || !topico.tipos.length || !f.tipos || !f.tipos.length) return true;
      return f.tipos.some((x) => topico.tipos.includes(x));
    });
  }

  function coberturaMeso(meso, treinos) {
    const ts = doDia(treinos, meso.inicio, fimMeso(meso));
    return (meso.topicos || []).map((tp) => {
      const dele = ts.filter((t) => cobreTopico(tp, t));
      const feitos = dele.filter((t) => t.feito);
      return {
        topico: tp,
        feitos: feitos.length,
        previstos: dele.length - feitos.length,
        ultima: feitos.length ? feitos.map((t) => t.data).sort().pop() : null,
      };
    });
  }

  /* ---------- Situação geral ---------- */

  function situacao(perio, hoje) {
    const meso = mesoDaData(perio, hoje);
    let semana = null;
    if (meso) semana = Math.floor(diffDias(segundaDe(meso.inicio), hoje) / 7) + 1;
    const comps = (perio.competicoes || []).filter((c) => c.data >= hoje).sort((a, b) => a.data.localeCompare(b.data));
    const prox = comps[0] ? { ...comps[0], dias: diffDias(hoje, comps[0].data) } : null;
    return { meso, semana, proxima: prox };
  }

  /* Pontos de atenção de um atleta nos últimos 7 dias: chegou mal recuperado, esforço máximo, ACWR alto. */
  function alertasAtleta(treinos, atleta, hoje) {
    const out = [];
    const recentes = doDia(treinos, addDias(hoje, -6), hoje).filter((t) => t.feito).sort((a, b) => a.data.localeCompare(b.data));
    const baixos = recentes.filter((t) => { const p = t.presencas && t.presencas[atleta.id]; return p && p.presente && p.psr != null && p.psr <= 4; });
    if (baixos.length) out.push({ nivel: baixos.length > 1 ? 'alto' : 'medio', texto: `Chegou mal recuperado em ${baixos.length} treino${baixos.length > 1 ? 's' : ''} (PSR 4 ou menos)` });
    const maximos = recentes.filter((t) => { const p = t.presencas && t.presencas[atleta.id]; return p && p.presente && p.pse != null && p.pse >= 9; });
    if (maximos.length) out.push({ nivel: 'medio', texto: `Esforço máximo em ${maximos.length} treino${maximos.length > 1 ? 's' : ''} (PSE 9 ou 10)` });
    const ac = acwr(treinos, atleta.id, segundaDe(hoje));
    if (ac.faixa === 'alto') out.push({ nivel: 'alto', texto: `Carga da semana ${ac.valor}× a média recente (ACWR)` });
    else if (ac.faixa === 'atencao') out.push({ nivel: 'medio', texto: `Carga da semana ${ac.valor}× a média recente (ACWR)` });
    if (atleta.obs && /les|dor|lesã/i.test(atleta.obs)) out.push({ nivel: 'info', texto: `Observação: ${atleta.obs}` });
    return out;
  }


  /* ---------- Competições mandam na carga: volume, intensidade e intenção de cada semana ---------- */

  /* Cada fase tem um perfil de carga, uma PSE alvo (intensidade) e uma intenção. Polimento reduz volume e mantém intensidade. */
  const FASE_PLANO = {
    base: { perfil: '3:1', pse: 5, intencao: 'Volume e técnica: construir base de movimento e consistência.' },
    desenvolvimento: { perfil: '3:1', pse: 6, intencao: 'Intensidade crescente nos fundamentos de jogo.' },
    precompetitivo: { perfil: '2:1', pse: 7, intencao: 'Situações de jogo, tática e ritmo de competição.' },
    polimento: { perfil: 'polimento', pse: 7, intencao: 'Menos volume, mesma intensidade: treinos curtos e de qualidade.' },
    competitivo: { perfil: 'plana', pse: 6, intencao: 'Competir. Treinos curtos de ativação e ajustes.' },
    recuperacao: { perfil: 'plana', pse: 3, intencao: 'Regenerar: descanso ativo e jogo leve.' },
  };

  /* Quanto cada tipo de competição reduz o volume da semana (1 = sem redução). */
  const MOD_COMPETICAO = { A: 0.6, posA: 0.5, B: 0.85, posB: 0.9, C: 1 };
  const INTENCAO_COMP = {
    A: 'Semana da competição A: treinos curtos de ativação, descansar e competir.',
    posA: 'Depois da competição A: regenerar e rever o jogo.',
    B: 'Competição B: mini-polimento, menos volume nos 2 ou 3 dias antes e intensidade mantida.',
    posB: 'Depois da B: voltar à rotina com carga um pouco menor.',
    C: 'Competição C: tratar como treino, sem reduzir a carga.',
  };
  const ativas = (perio) => (perio.competicoes || []).filter((c) => c.situacao !== 'cancelada');
  const indiceSemana = (perio, data) => Math.floor(diffDias(segundaDe(perio.inicio), segundaDe(data)) / 7);

  /* Por semana (segunda-feira): fator que multiplica a carga e os rótulos das competições que mexem nela. */
  function modsCompeticao(perio) {
    const out = {};
    const poe = (seg, chave, comp, mod) => {
      const e = out[seg] || (out[seg] = { mod: 1, chaves: [], comps: [] });
      e.mod = Math.min(e.mod, mod);
      e.chaves.push(chave);
      e.comps.push(comp);
    };
    for (const c of ativas(perio)) {
      const seg = segundaDe(c.data);
      poe(seg, c.prioridade, c, MOD_COMPETICAO[c.prioridade] ?? 1);
      if (c.prioridade === 'A') poe(addDias(seg, 7), 'posA', c, MOD_COMPETICAO.posA);
      if (c.prioridade === 'B') poe(addDias(seg, 7), 'posB', c, MOD_COMPETICAO.posB);
    }
    for (const e of Object.values(out)) e.rotulos = e.chaves.map((k) => INTENCAO_COMP[k]);
    return out;
  }

  function limitesPeriodo(perio) {
    const ini = segundaDe(perio.inicio);
    let fim = perio.fim || perio.inicio;
    for (const c of ativas(perio)) if (c.data > fim) fim = c.data;
    for (const m of perio.mesociclos || []) if (fimMeso(m) > fim) fim = fimMeso(m);
    return { ini, total: Math.floor(diffDias(ini, segundaDe(fim)) / 7) + 1 };
  }

  /* Fase ideal de cada semana a partir das competições A (sem A, a B vira o alvo):
     semanas até o alvo 0 = competição, 1 = polimento, 2 a 3 = pré, 4 a 7 = desenvolvimento, 8 ou mais = base;
     a semana depois do alvo é recuperação. Datas mudaram? Basta recalcular. */
  function planoIdeal(perio) {
    const { ini, total } = limitesPeriodo(perio);
    const comps = ativas(perio).map((c) => ({ ...c, idx: indiceSemana(perio, c.data) }));
    const as = comps.filter((c) => c.prioridade === 'A').map((c) => c.idx);
    const alvos = (as.length ? as : comps.filter((c) => c.prioridade === 'B').map((c) => c.idx)).sort((a, b) => a - b);
    const fases = [];
    for (let i = 0; i < total; i++) {
      const prox = alvos.find((a) => a >= i);
      let fase;
      if (!alvos.length) fase = 'desenvolvimento';
      else if (alvos.includes(i)) fase = 'competitivo';
      else if (alvos.includes(i - 1)) fase = 'recuperacao';
      else if (prox === undefined) fase = 'base';
      else {
        const n = prox - i;
        fase = n === 1 ? 'polimento' : n <= 3 ? 'precompetitivo' : n <= 7 ? 'desenvolvimento' : 'base';
      }
      fases.push(fase);
    }
    /* Um bloco de base ou desenvolvimento de uma semana só, no começo do período, vira parte do seguinte. */
    if (fases.length > 1 && (fases[0] === 'base' || fases[0] === 'desenvolvimento') && fases[1] !== fases[0]) fases[0] = fases[1];
    return { ini, semAlvo: !alvos.length, semanas: detalharSemanas(perio, ini, fases.map((f) => ({ fase: f })), perio) };
  }

  /* Dá fator de carga, PSE alvo e intenção a cada semana, dado quem é a fase (e o perfil) de cada uma. */
  function detalharSemanas(perio, ini, itens) {
    const mods = modsCompeticao(perio);
    const out = [];
    let i = 0;
    while (i < itens.length) {
      let j = i;
      while (j < itens.length && itens[j].fase === itens[i].fase && itens[j].perfil === itens[i].perfil) j++;
      const fase = itens[i].fase;
      const perfil = itens[i].perfil || (FASE_PLANO[fase] ? FASE_PLANO[fase].perfil : 'plana');
      const f = fatoresCarga(perfil, j - i);
      for (let k = i; k < j; k++) {
        const seg = addDias(ini, 7 * k);
        const m = mods[seg];
        const plano = FASE_PLANO[fase];
        out.push({
          i: k, seg, fase,
          fatorPerfil: f[k - i],
          mod: m ? m.mod : 1,
          fator: arred(f[k - i] * (m ? m.mod : 1), 2),
          pse: plano ? plano.pse : null,
          intencao: m && m.chaves.some((c) => c !== 'C') ? m.rotulos.filter((_, n) => m.chaves[n] !== 'C').join(' ') : (plano ? plano.intencao : ''),
          eventos: m ? m.comps.filter((c, n) => m.chaves[n] === c.prioridade) : [],
        });
      }
      i = j;
    }
    return out;
  }

  /* Calendário de carga da periodização como ela está (com os mesociclos reais). */
  function calendarioCarga(perio) {
    const { ini, total } = limitesPeriodo(perio);
    const itens = [];
    for (let k = 0; k < total; k++) {
      const seg = addDias(ini, 7 * k);
      const meso = mesoDaData(perio, seg) || mesoDaData(perio, addDias(seg, 6));
      itens.push(meso ? { fase: meso.fase, perfil: `${meso.perfil}|${meso.id}`, meso } : { fase: null, perfil: null, meso: null });
    }
    const out = [];
    const mods = modsCompeticao(perio);
    itens.forEach((it, k) => {
      const seg = addDias(ini, 7 * k);
      const m = mods[seg];
      const plano = it.fase ? FASE_PLANO[it.fase] : null;
      let fatorPerfil = null;
      if (it.meso) {
        const pos = Math.floor(diffDias(segundaDe(it.meso.inicio), seg) / 7);
        fatorPerfil = fatoresCarga(it.meso.perfil, it.meso.semanas)[Math.max(0, pos)];
      }
      out.push({
        i: k, seg, fase: it.fase, meso: it.meso,
        fatorPerfil,
        mod: m ? m.mod : 1,
        fator: fatorPerfil == null ? null : arred(fatorPerfil * (m ? m.mod : 1), 2),
        pse: plano ? plano.pse : null,
        intencao: m && m.chaves.some((c) => c !== 'C') ? m.rotulos.filter((_, n) => m.chaves[n] !== 'C').join(' ') : (plano ? plano.intencao : ''),
        eventos: m ? m.comps.filter((c, n) => m.chaves[n] === c.prioridade) : [],
      });
    });
    return out;
  }

  /* Primeira semana que o plano pode mexer: o que já passou e a semana atual não mudam. */
  const corteDoPlano = (perio, hoje) => (hoje < segundaDe(perio.inicio) ? segundaDe(perio.inicio) : addDias(segundaDe(hoje), 7));

  /* Semanas futuras em que o mesociclo cadastrado não é o que as competições pedem. Semana sem mesociclo é escolha do técnico e não conta. */
  function desalinhamento(perio, hoje) {
    const ideal = planoIdeal(perio);
    if (ideal.semAlvo) return [];
    const corte = corteDoPlano(perio, hoje);
    return ideal.semanas.filter((w) => w.seg >= corte).map((w) => {
      const m = mesoDaData(perio, w.seg) || mesoDaData(perio, addDias(w.seg, 6));
      return { seg: w.seg, ideal: w.fase, atual: m ? m.fase : null };
    }).filter((w) => w.atual !== null && w.ideal !== w.atual);
  }

  /* Divide uma sequência de semanas da mesma fase em mesociclos de no máximo 6 semanas, de tamanhos parecidos. */
  function partirFase(n) {
    const partes = Math.ceil(n / 6);
    const base = Math.floor(n / partes);
    const sobra = n % partes;
    return Array.from({ length: partes }, (_, i) => base + (i < sobra ? 1 : 0));
  }

  /* Proposta de mesociclos para as semanas a partir do corte; os que começaram antes dele são mantidos (o atual, encurtado). */
  function propostaMesos(perio, hoje) {
    const ideal = planoIdeal(perio);
    const corte = corteDoPlano(perio, hoje);
    const mantidos = [];
    const descartados = [];
    for (const m of [...(perio.mesociclos || [])].sort((a, b) => a.inicio.localeCompare(b.inicio))) {
      if (segundaDe(m.inicio) >= corte) { descartados.push(m); continue; }
      const semanas = Math.min(m.semanas, Math.floor(diffDias(segundaDe(m.inicio), corte) / 7));
      if (semanas < 1) { descartados.push(m); continue; }
      mantidos.push({ meso: m, semanas, encurtado: semanas < m.semanas });
    }
    const futuras = ideal.semanas.filter((w) => w.seg >= corte);
    const novos = [];
    let i = 0;
    while (i < futuras.length) {
      let j = i;
      while (j < futuras.length && futuras[j].fase === futuras[i].fase) j++;
      let k = i;
      const tams = partirFase(j - i);
      tams.forEach((tam, pi) => {
        novos.push({ fase: futuras[i].fase, inicio: futuras[k].seg, semanas: tam, parte: pi + 1, partes: tams.length });
        k += tam;
      });
      i = j;
    }
    const comps = ativas(perio).filter((c) => c.prioridade === 'A' || c.prioridade === 'B').sort((a, b) => a.data.localeCompare(b.data));
    novos.forEach((n) => {
      const alvo = comps.find((c) => c.data >= n.inicio && c.prioridade === 'A') || comps.find((c) => c.data >= n.inicio);
      n.alvo = alvo ? alvo.nome : null;
    });
    return { corte, mantidos, descartados, novos };
  }

  /* ---------- Equipe: categoria, dias de treino e a semana prevista (tipo, intensidade, duração) ---------- */

  const CATEGORIAS = ['Sub-13', 'Sub-15', 'Sub-17', 'Sub-19', 'Sub-21', 'Adulto'];

  /* Categoria pelo ano: Sub-N para quem faz até N anos no ano; acima de 21, adulto. */
  function categoriaDe(nasc, ano) {
    if (!nasc) return null;
    const idade = Number(ano) - Number(nasc.slice(0, 4));
    for (const n of [13, 15, 17, 19, 21]) if (idade <= n) return `Sub-${n}`;
    return 'Adulto';
  }

  /* Atletas da equipe: sem categorias escolhidas valem todos; atleta sem nascimento sempre entra. */
  function daEquipe(perio, atletas, ano) {
    const cats = (perio && perio.categorias) || [];
    if (!cats.length) return atletas;
    return atletas.filter((a) => { const c = categoriaDe(a.nascimento, ano); return !c || cats.includes(c); });
  }

  /* Papel de intensidade de cada dia de treino da semana, na ordem dos dias: alta (dia pesado), média e leve. */
  const PAPEIS = { 1: ['alta'], 2: ['alta', 'media'], 3: ['alta', 'media', 'leve'], 4: ['alta', 'media', 'alta', 'leve'], 5: ['alta', 'media', 'alta', 'media', 'leve'], 6: ['alta', 'media', 'alta', 'media', 'media', 'leve'] };
  const papeisDe = (n) => PAPEIS[n] || [...PAPEIS[6], ...Array(Math.max(0, n - 6)).fill('leve')];

  const TIPO_POR_FASE = {
    base: { alta: 'misto', media: 'tecnico', leve: 'tecnico' },
    desenvolvimento: { alta: 'tecnico', media: 'misto', leve: 'tecnico' },
    precompetitivo: { alta: 'treino-jogo', media: 'tatico', leve: 'tecnico' },
    polimento: { alta: 'tatico', media: 'tecnico', leve: 'tecnico' },
    competitivo: { alta: 'tatico', media: 'tecnico', leve: 'tecnico' },
    recuperacao: { alta: 'recuperacao', media: 'recuperacao', leve: 'recuperacao' },
  };

  /* K1 é o side-out (passe, levantamento e ataque); K2 é saque e sistema defensivo; o resto é controle, tática e mental. */
  const GRUPO_FUND = { recepcao: 'K1', levantamento: 'K1', ataque: 'K1', saque: 'K2', bloqueio: 'K2', defesa: 'K2', transicao: 'K2' };
  function grupoDeFundamento(f) {
    if (GRUPO_FUND[f.fundamento]) return GRUPO_FUND[f.fundamento];
    if (f.fundamento === 'tatica') {
      const t = f.tipos || [];
      if (t.includes('Side-out')) return 'K1';
      if (t.some((x) => x === 'Break point' || x.startsWith('Bloqueio e defesa'))) return 'K2';
    }
    return 'N';
  }
  /* Grupo do dia: o que tiver mais fundamentos; empate fica com o primeiro que for K1 ou K2. */
  function grupoDaSessao(fundamentos) {
    if (!fundamentos || !fundamentos.length) return '';
    const g = fundamentos.map(grupoDeFundamento);
    const k1 = g.filter((x) => x === 'K1').length, k2 = g.filter((x) => x === 'K2').length;
    if (k1 > k2) return 'K1';
    if (k2 > k1) return 'K2';
    return g.find((x) => x === 'K1' || x === 'K2') || 'N';
  }

  /* Treino físico: o estímulo vem da fase (capacidade, intensidade, minutos) e o técnico escolhe o tipo e os exercícios. */
  /* A ordem importa: o primeiro foco vai para o primeiro treino com físico da semana, o segundo para o seguinte. */
  const FOCO_FISICO_FASE = {
    base: ['Força', 'Resistência aeróbia', 'Core e estabilidade'],
    desenvolvimento: ['Potência e saltos', 'Prevenção de lesões', 'Força'],
    precompetitivo: ['Velocidade e agilidade', 'Mobilidade', 'Resistência intermitente'],
    competitivo: ['Mobilidade', 'Potência e saltos'],
    polimento: ['Mobilidade', 'Recuperação'],
    recuperacao: ['Recuperação', 'Mobilidade'],
  };
  const INT_FISICA = { 'Força': 'media', 'Potência e saltos': 'alta', 'Velocidade e agilidade': 'alta', 'Resistência aeróbia': 'media', 'Resistência intermitente': 'alta', 'Core e estabilidade': 'media', 'Prevenção de lesões': 'leve', 'Mobilidade': 'leve', 'Recuperação': 'leve' };
  const PSE_FISICO = { alta: 7, media: 5, leve: 3 };
  /* Em que treinos da semana entra o físico e quantos minutos: no primeiro, no do meio ou no último dia de treino. */
  const SLOTS_FISICO = {
    base: [['primeiro', 40], ['ultimo', 30]],
    desenvolvimento: [['primeiro', 40], ['meio', 25]],
    precompetitivo: [['primeiro', 30], ['ultimo', 20]],
    polimento: [['primeiro', 20]],
    competitivo: [['primeiro', 15]],
    recuperacao: [['meio', 30]],
  };
  const posSlot = (pos, n) => (pos === 'primeiro' ? 0 : pos === 'ultimo' ? n - 1 : Math.floor(n / 2));
  const pseSessao = (fase, papel) => Math.max(2, Math.min(9, FASE_PLANO[fase].pse + (papel === 'alta' ? 1 : papel === 'leve' ? -2 : 0)));

  const arred5 = (n) => Math.round(n / 5) * 5;
  /* Ordem da semana começando na segunda: 1 (seg) a 6 (sáb), depois 0 (dom). */
  const ordemDia = (d) => (d + 6) % 7;
  const diasOrdenados = (dias) => [...new Set(dias || [])].filter((d) => d >= 0 && d <= 6).sort((a, b) => ordemDia(a) - ordemDia(b));

  /* Os dias de treino de uma semana (w vem de calendarioCarga): tipo, intensidade, PSE alvo, duração e fundamentos.
     A competição mexe nos dias vizinhos e ocupa o dia em que cai; o volume da semana encurta a duração, não o número de dias. */
  function sessoesDaSemana(perio, w) {
    if (!w || !w.fase || !w.meso) return [];
    const dias = diasOrdenados(perio.diasTreino);
    if (!dias.length) return [];
    const n = dias.length;
    /* Recuperação e semana da competição alvo: só treinos leves (regenerar ou ativar). */
    const papeis = w.fase === 'recuperacao' || w.fase === 'competitivo' ? Array(n).fill('leve') : papeisDe(n);
    const comps = ativas(perio).filter((c) => c.prioridade !== 'C');
    const todas = ativas(perio);
    const base = perio.duracaoPadrao || 90;
    const ordem = { alta: 0, media: 1, baixa: 2 };
    const topicos = [...(w.meso.topicos || [])].sort((a, b) => ordem[a.prioridade] - ordem[b.prioridade]);
    const pool = [...topicos.filter((t) => t.prioridade === 'alta'), ...topicos];
    let j = pool.length ? (w.i * 2) % pool.length : 0;
    const out = [];
    dias.forEach((dow, k) => {
      const data = addDias(w.seg, ordemDia(dow));
      const comp = todas.find((c) => c.data === data);
      if (comp) { out.push({ data, dow, papel: 'alta', intensidade: 'alta', tipo: 'competicao', titulo: comp.nome, pse: null, duracao: null, fundamentos: [], motivo: 'Dia de competição', competicao: comp }); return; }
      let papel = papeis[k];
      let motivo = '';
      const vizinha = comps.find((c) => Math.abs(diffDias(data, c.data)) <= 1);
      if (vizinha) { papel = 'leve'; motivo = diffDias(data, vizinha.data) >= 0 ? 'Véspera de competição: ativação' : 'Dia seguinte à competição: regenerar'; }
      let tipo = (TIPO_POR_FASE[w.fase] || TIPO_POR_FASE.base)[papel];
      if (!vizinha && n >= 4 && k === 1 && (w.fase === 'base' || w.fase === 'desenvolvimento')) tipo = 'fisico';
      const pse = pseSessao(w.fase, papel);
      const duracao = Math.max(30, arred5(base * (w.fator == null ? 1 : w.fator) * (papel === 'leve' ? 0.85 : 1)));
      let fundamentos = [];
      if (['tecnico', 'tatico', 'treino-jogo', 'misto'].includes(tipo) && pool.length) {
        const escolhidos = [];
        for (let t = 0; t < pool.length && escolhidos.length < 2; t++) { const c = pool[j % pool.length]; j++; if (!escolhidos.includes(c)) escolhidos.push(c); }
        for (const c of escolhidos) {
          const ex = fundamentos.find((f) => f.fundamento === c.fundamento);
          if (ex) ex.tipos = [...new Set([...ex.tipos, ...(c.tipos || [])])]; else fundamentos.push({ fundamento: c.fundamento, tipos: [...(c.tipos || [])] });
        }
      }
      out.push({ data, dow, papel, intensidade: papel, tipo, titulo: '', pse, duracao, fundamentos, motivo });
    });
    aplicarAjustes(perio, w, out);
    return out;
  }

  /* Físico previsto de cada treino e ajustes do técnico (perio.dias[data]): intensidade, duração, fundamentos, anotação e físico. */
  function aplicarAjustes(perio, w, out) {
    const treinaveis = out.filter((x) => x.tipo !== 'competicao');
    const focos = w.meso.fisico && w.meso.fisico.length ? w.meso.fisico : (FOCO_FISICO_FASE[w.fase] || []);
    const tem = new Map();
    const usados = new Set();
    (SLOTS_FISICO[w.fase] || []).forEach(([pos, min], i) => {
      const k = posSlot(pos, treinaveis.length);
      if (!treinaveis.length || usados.has(k)) return;
      usados.add(k);
      tem.set(treinaveis[k], { capacidade: focos.length ? focos[i % focos.length] : 'Mobilidade', duracao: min });
    });
    const leveFixo = w.fase === 'competitivo' || w.fase === 'recuperacao';
    const intFis = (cap, x) => (leveFixo || x.motivo ? 'leve' : INT_FISICA[cap] || 'media');
    for (const x of out) {
      if (x.tipo === 'competicao') { x.grupo = ''; x.fisico = null; x.nota = ''; continue; }
      const ov = (perio.dias || {})[x.data] || {};
      if (ov.intensidade) { x.intensidade = ov.intensidade; x.papel = ov.intensidade; x.pse = pseSessao(w.fase, ov.intensidade); }
      if (ov.duracao) x.duracao = ov.duracao;
      if (ov.fundamentos) x.fundamentos = JSON.parse(JSON.stringify(ov.fundamentos));
      x.nota = ov.nota || '';
      x.ajustado = !!(ov.intensidade || ov.duracao || ov.fundamentos || ov.nota || ov.fisico);
      x.grupo = grupoDaSessao(x.fundamentos);
      const padrao = tem.get(x);
      const cap0 = padrao ? padrao.capacidade : (focos[0] || 'Mobilidade');
      const sugestao = { capacidade: cap0, intensidade: intFis(cap0, x), duracao: padrao ? padrao.duracao : 30, previsto: !!padrao };
      const of = ov.fisico || {};
      const capacidade = of.capacidade || sugestao.capacidade;
      const intensidade = of.intensidade || (of.capacidade ? intFis(capacidade, x) : sugestao.intensidade);
      const duracao = of.duracao || sugestao.duracao;
      const on = of.on != null ? of.on : sugestao.previsto;
      x.fisico = { on, capacidade, intensidade, duracao, exercicios: of.exercicios || [], pse: PSE_FISICO[intensidade], carga: on ? PSE_FISICO[intensidade] * duracao : 0, sugestao };
    }
  }

  const cargaDasSessoes = (ss) => ss.reduce((t, x) => t + (x.pse && x.duracao ? x.pse * x.duracao : 0), 0);
  const cargaFisica = (ss) => ss.reduce((t, x) => t + (x.fisico && x.fisico.on ? x.fisico.carga : 0), 0);

  /* Plano de sessões da periodização inteira: por semana (segunda), as sessões previstas e a carga planejada por atleta. */
  function planoDeSessoes(perio) {
    const out = {};
    for (const w of calendarioCarga(perio)) {
      const sessoes = sessoesDaSemana(perio, w);
      out[w.seg] = { semana: w, sessoes, carga: sessoes.length ? cargaDasSessoes(sessoes) : null };
    }
    return out;
  }

  const sessoesDaData = (perio, data) => ((planoDeSessoes(perio)[segundaDe(data)] || { sessoes: [] }).sessoes).filter((s) => s.data === data);

  /* Mesociclos de uma periodização nova: pelas competições A (ou B) e, sem nenhuma, nas proporções usuais. */
  function estruturaInicial(perio) {
    const ini = segundaDe(perio.inicio);
    if (!planoIdeal(perio).semAlvo) return propostaMesos(perio, addDias(ini, -1)).novos;
    let i = ini;
    return sugerirEstrutura(perio.inicio, perio.fim || addDias(ini, 7 * 16 - 1)).map((e) => {
      const r = { fase: e.fase, inicio: i, semanas: e.semanas, parte: 1, partes: 1, alvo: null };
      i = addDias(i, e.semanas * 7);
      return r;
    });
  }

  /* ---------- Atletas: função como ação, sexo à parte, lista colada e cadastro ---------- */

  const semAcento = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  const ROTULO_ACAO = { bloqueio: ['Bloqueador', 'Bloqueadora', 'Bloqueio'], defesa: ['Defensor', 'Defensora', 'Defesa'], ambos: ['Bloqueio e defesa', 'Bloqueio e defesa', 'Bloqueio e defesa'] };
  /* Função com o gênero da palavra pelo sexo: bloqueio + feminino = Bloqueadora. */
  const rotuloFuncao = (a) => {
    const r = ROTULO_ACAO[a.acao];
    return r ? r[a.sexo === 'M' ? 0 : a.sexo === 'F' ? 1 : 2] : null;
  };
  const naipe = (a) => (a.sexo === 'F' ? 'Feminino' : a.sexo === 'M' ? 'Masculino' : null);
  const naipeDupla = (a, b) => (!a.sexo || !b.sexo ? null : a.sexo !== b.sexo ? 'Mista' : a.sexo === 'F' ? 'Feminina' : 'Masculina');

  function idade(nasc, hoje) {
    if (!nasc) return null;
    let i = Number(hoje.slice(0, 4)) - Number(nasc.slice(0, 4));
    if (hoje.slice(5) < nasc.slice(5)) i--;
    return i;
  }

  /* O que falta para a ficha do atleta estar completa. */
  function faltaNoCadastro(a) {
    const f = [];
    if (!a.sexo) f.push('sexo');
    if (!a.acao) f.push('ação em quadra');
    if (!a.nascimento) f.push('nascimento');
    if (!a.contato) f.push('contato');
    if (!a.consentimento) f.push('autorização de uso dos dados');
    return f;
  }

  function dataBR(t) {
    const m = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
    if (!m) return null;
    let [, d, mes, a] = m.map(Number);
    if (a < 100) a += a > 30 ? 1900 : 2000;
    if (mes < 1 || mes > 12 || d < 1 || d > 31 || a < 1940 || a > 2100) return null;
    return `${a}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function classificarCampo(txt) {
    const t = semAcento(txt);
    if (!t) return null;
    if (/^(f|fem|feminino|feminina|mulher)$/.test(t)) return { sexo: 'F' };
    if (/^(m|masc|masculino|masculina|homem)$/.test(t)) return { sexo: 'M' };
    if (/masculin.*femin|femin.*masculin|masc.*fem|fem.*masc/.test(t)) return { ambiguo: true };
    if (/ambo|as duas|os dois|bloq.*def|def.*bloq/.test(t)) return { acao: 'ambos' };
    if (/^bloq/.test(t)) return { acao: 'bloqueio' };
    if (/^def/.test(t)) return { acao: 'defesa' };
    const d = dataBR(t);
    if (d) return { nascimento: d };
    if (/^[\d\s()+-]{8,}$/.test(t) && t.replace(/\D/g, '').length >= 8) return { contato: txt.trim() };
    return null;
  }

  const PALAVRAS_FINAIS = /^(feminino|feminina|masculino|masculina|bloqueio|bloqueador|bloqueadora|defesa|defensor|defensora|ambos|ambas)$/;

  /* Uma linha por atleta: "Nome, sexo, ação, nascimento, telefone", em qualquer ordem depois do nome.
     Sem vírgulas, palavras-chave no fim da linha também valem ("Beatriz Begondim feminino bloqueio"). */
  function lerListaAtletas(texto, existentes = [], padrao = {}) {
    const conhecidos = new Set(existentes.map((a) => semAcento(a.nome).replace(/\s+/g, ' ')));
    const vistos = new Set();
    const out = [];
    for (const bruto of String(texto || '').split(/\r?\n/)) {
      let linha = bruto.replace(/^\s*(\d+\s*[.)]|[-•*])\s*/, '').trim();
      if (!linha) continue;
      let partes = linha.split(/[,;\t|]/).map((x) => x.trim());
      if (partes.length === 1) {
        const toks = linha.split(/\s+/);
        const extras = [];
        while (toks.length > 1 && PALAVRAS_FINAIS.test(semAcento(toks[toks.length - 1]))) extras.unshift(toks.pop());
        partes = [toks.join(' '), ...extras];
      }
      const r = { nome: partes[0].replace(/\s+/g, ' '), sexo: '', acao: '', nascimento: '', contato: '', avisos: [], status: 'novo' };
      for (const campo of partes.slice(1)) {
        if (!campo) continue;
        const c = classificarCampo(campo);
        if (!c) r.avisos.push(`"${campo}" não foi entendido`);
        else if (c.ambiguo) r.avisos.push('sexo ambíguo: escolha masculino ou feminino');
        else Object.assign(r, c);
      }
      if (!r.sexo && padrao.sexo) r.sexo = padrao.sexo;
      if (!r.acao && padrao.acao) r.acao = padrao.acao;
      const chave = semAcento(r.nome).replace(/\s+/g, ' ');
      if (!chave) continue;
      if (conhecidos.has(chave)) r.status = 'existente';
      else if (vistos.has(chave)) r.status = 'repetido';
      vistos.add(chave);
      out.push(r);
    }
    return out;
  }

  const API = {
    DIA, ms, iso, addDias, diffDias, segundaDe, hojeISO, semanasEntre,
    soma, media, arred,
    PERFIS, fimMeso, fatoresCarga, mesoDaData, validarMesos, sugerirEstrutura,
    cargaSessao, mediaSessao, cargaSemanal, acwr, resumoSemana, planejadoReal,
    cobreTopico, coberturaMeso, situacao, alertasAtleta,
    FASE_PLANO, MOD_COMPETICAO, modsCompeticao, planoIdeal, calendarioCarga, desalinhamento, propostaMesos, corteDoPlano, partirFase,
    rotuloFuncao, naipe, naipeDupla, idade, faltaNoCadastro, lerListaAtletas, semAcento,
    CATEGORIAS, categoriaDe, daEquipe, papeisDe, diasOrdenados, sessoesDaSemana, cargaDasSessoes, cargaFisica, planoDeSessoes, sessoesDaData, estruturaInicial,
    GRUPO_FUND, grupoDeFundamento, grupoDaSessao, FOCO_FISICO_FASE, INT_FISICA, PSE_FISICO, SLOTS_FISICO, pseSessao,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else (raiz.AC = raiz.AC || {}).calc = API;
})(typeof window !== 'undefined' ? window : globalThis);
