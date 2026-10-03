/* Utilitários compartilhados: datas (sempre em UTC, em milissegundos), formatação em pt-BR e escape de HTML. */
(function () {
  const DIA = 864e5;

  const ms = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const iso = (t) => new Date(t).toISOString().slice(0, 10);
  const dd = (t) => {
    const x = new Date(t);
    return String(x.getUTCDate()).padStart(2, '0') + '/' + String(x.getUTCMonth() + 1).padStart(2, '0');
  };
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const mes = (t) => MESES[new Date(t).getUTCMonth()];
  const ano = (t) => new Date(t).getUTCFullYear();
  const num = (v) => Math.round(v).toLocaleString('pt-BR');
  const dec = (v, casas = 1) => Number(v).toFixed(casas).replace('.', ',');
  const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const diaSemana = (t) => (new Date(t).getUTCDay() + 6) % 7; // 0 = segunda
  const segunda = (t) => t - diaSemana(t) * DIA;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const media = (lista) => (lista.length ? lista.reduce((a, v) => a + v, 0) / lista.length : null);

  // Número pseudoaleatório estável (0 a 1) a partir de um texto, para os dados de exemplo.
  const hash = (txt) => {
    let h = 2166136261;
    for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= h >>> 13; h = Math.imul(h, 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };

  // "Hoje" fixo para a demonstração ficar estável.
  const HOJE = ms('2026-10-03');

  window.Farol = window.Farol || {};
  window.Farol.util = { DIA, ms, iso, dd, mes, ano, num, dec, brl, diaSemana, segunda, esc, plural, clamp, media, hash, HOJE };
})();
