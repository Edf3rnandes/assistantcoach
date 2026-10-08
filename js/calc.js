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
  function planejadoReal(meso, treinos, atletas, hoje) {
    const fat = fatoresCarga(meso.perfil, meso.semanas);
    return fat.map((f, i) => {
      const seg = addDias(segundaDe(meso.inicio), 7 * i);
      const cargas = atletas.map((a) => cargaSemanal(treinos, a.id, seg)).filter((c) => c > 0);
      return {
        seg,
        fator: f,
        planejado: meso.cargaRef ? Math.round(meso.cargaRef * f) : null,
        real: seg > hoje ? null : arred(media(cargas)),
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

  const API = {
    DIA, ms, iso, addDias, diffDias, segundaDe, hojeISO, semanasEntre,
    soma, media, arred,
    PERFIS, fimMeso, fatoresCarga, mesoDaData, validarMesos, sugerirEstrutura,
    cargaSessao, mediaSessao, cargaSemanal, acwr, resumoSemana, planejadoReal,
    cobreTopico, coberturaMeso, situacao, alertasAtleta,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else (raiz.AC = raiz.AC || {}).calc = API;
})(typeof window !== 'undefined' ? window : globalThis);
