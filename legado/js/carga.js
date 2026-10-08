/* Carga interna: as contas que todas as telas usam, num lugar só.
   - carga da sessão = duração (min) × PSE (1 a 10), em UA; a do dia soma todas as sessões do dia;
   - carga total = treino de quadra + treino físico (musculação, potência, prevenção) que o atleta fez;
   - ACWR = carga da semana ÷ média das semanas ANTERIORES (até 4), sem contar a própria semana;
     a partir da 2ª semana já dá um número, mas com menos de 4 semanas de base ele é "provisório";
   - monotonia = média da carga diária ÷ desvio (amostral) da carga diária na semana; strain = carga × monotonia;
   - velocímetro: destreino abaixo de 0,8 · ótimo de 0,8 a 1,3 · risco de 1,3 a 1,5 · risco alto acima de 1,5.
   As faixas seguem Gabbett (2016); servem para olhar primeiro quem precisa, a decisão é do profissional. */
(function () {
  const { media } = window.Farol.util;

  const MAX = 1.8;
  const ZONAS = [
    { id: 'destreino', de: 0, ate: 0.8, nome: 'Destreino', nivel: 'warn', texto: 'carga abaixo do que o corpo já aguenta' },
    { id: 'otimo', de: 0.8, ate: 1.3, nome: 'Faixa ótima', nivel: 'ok', texto: 'carga em linha com as últimas semanas' },
    { id: 'risco', de: 1.3, ate: 1.5, nome: 'Risco', nivel: 'warn', texto: 'carga subindo mais rápido do que o corpo se adapta' },
    { id: 'extremo', de: 1.5, ate: MAX, nome: 'Risco alto', nivel: 'crit', texto: 'salto de carga grande: rever a próxima semana' },
  ];
  const zona = (v) => (v == null ? null : ZONAS.find((z) => v < z.ate) || ZONAS[ZONAS.length - 1]);

  // Desvio amostral (n − 1), como nas planilhas de controle de carga.
  function desvio(v) {
    if (v.length < 2) return 0;
    const m = media(v);
    return Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / (v.length - 1));
  }

  // Monotonia da semana, a partir da carga dos 7 dias (dia sem treino conta zero). Precisa de 4 dias com carga.
  function monotonia(dias) {
    const com = dias.filter((v) => v > 0).length;
    const dsv = desvio(dias);
    return com >= 4 && dsv > 0 ? media(dias) / dsv : null;
  }

  // ACWR da semana k, dada a lista de cargas semanais (só semanas completas, em ordem).
  // Retorna { valor, base, provisorio, confiavel } ou null. "confiavel" (3 ou mais semanas de base) é o que o semáforo usa.
  function acwr(cargas, k) {
    if (k < 1 || cargas[k] == null) return null;
    const previas = cargas.slice(Math.max(0, k - 4), k).filter((v) => v != null);
    if (!previas.length) return null;
    const cron = media(previas);
    if (!cron) return null;
    return { valor: +(cargas[k] / cron).toFixed(2), base: previas.length, provisorio: previas.length < 4, confiavel: previas.length >= 3 };
  }

  // Treino físico feito por um atleta no intervalo [ini, fim), vindo das prescrições marcadas como feitas.
  // Prescrições ligadas a uma sessão do microciclo não entram: essa carga já vem do registro da sessão.
  function fisica(atletaId, ini, fim) {
    const P = window.Farol.prescricao;
    return P && P.execucoes ? P.execucoes(atletaId, ini, fim) : [];
  }

  /* ---------- Velocímetro ---------- */

  const NS_X = (t, r) => (100 + r * Math.cos(Math.PI * (1 - t))).toFixed(2);
  const NS_Y = (t, r) => (100 - r * Math.sin(Math.PI * (1 - t))).toFixed(2);
  const arco = (t0, t1, r) => `M${NS_X(t0, r)} ${NS_Y(t0, r)}A${r} ${r} 0 0 1 ${NS_X(t1, r)} ${NS_Y(t1, r)}`;

  // Mostrador em meia-lua. "mini" tira os números das marcas e o nome da faixa.
  function velocimetro(v, o = {}) {
    const z = zona(v);
    const t = v == null ? 0 : Math.min(v, MAX) / MAX;
    const txt = v == null ? 'sem dado suficiente' : `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, ${z.nome.toLowerCase()}`;
    const marcas = [0, 0.8, 1.3, 1.5, 1.8];
    return `<figure class="gv ${o.mini ? 'mini' : ''} ${v == null ? 'vazio' : ''}" role="img" aria-label="ACWR: ${txt}">
      <svg viewBox="0 0 200 ${o.mini ? 118 : 128}" aria-hidden="true" focusable="false">
        <path class="gv-fundo" d="${arco(0, 1, 78)}"/>
        ${ZONAS.map((q) => `<path class="gv-z gv-${q.id} ${z && z.id === q.id ? 'ativa' : ''}" d="${arco(q.de / MAX + 0.004, q.ate / MAX - 0.004, 78)}"/>`).join('')}
        ${o.mini ? '' : marcas.map((m) => `<text class="gv-marca" x="${NS_X(m / MAX, 99)}" y="${(+NS_Y(m / MAX, 99) + 3).toFixed(2)}" text-anchor="middle">${String(m).replace('.', ',')}</text>`).join('')}
        ${v == null ? '' : `<path class="gv-ponteiro" transform="translate(100 100) rotate(${(-90 + t * 180).toFixed(1)})" d="M0 -66 L4.5 0 L-4.5 0Z"/>`}
        <circle class="gv-eixo" cx="100" cy="100" r="7"/>
      </svg>
      <figcaption><b class="gv-valor num">${v == null ? '–' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
        <span class="gv-zona gv-t-${z ? z.id : 'nd'}">${z ? z.nome : 'Sem base ainda'}</span>
        ${o.nota ? `<small class="gv-nota">${o.nota}</small>` : ''}</figcaption>
    </figure>`;
  }

  window.Farol.carga = { MAX, ZONAS, zona, desvio, monotonia, acwr, fisica, velocimetro };
})();
