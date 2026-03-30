// ═══════════════════════════════════════════════════════
// storage.js — Camada de dados (localStorage)
// ═══════════════════════════════════════════════════════

const KEYS = {
  CONFIG:   'salao_config',
  CUSTOS:   'salao_custos',
  RECEITAS: 'salao_receitas',
  SERVICOS: 'salao_servicos',
  DIARIO:   'salao_diario',
  AGENDA:   'salao_agenda',
};

const DEFAULT_CONFIG = {
  nomeSalao:    'Meu Salão de Beleza',
  responsavel:  '',
  cidade:       '',
  ano:          new Date().getFullYear(),
  telefone:     '',
  instagram:    '',
  valorHora:    40,
  multMin:      2.0,
  multIdeal:    2.5,
  multPrem:     3.0,
  atendMedios:  80,
  profissionais: ['Proprietária', 'Cabeleireira 1', 'Manicure 1', 'Auxiliar', 'Freelancer'],
  categorias:   ['Cabelo','Coloração','Tratamento','Manicure / Pedicure','Sobrancelha / Cílios','Depilação','Maquiagem','Outros'],
};

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function _load(key, def = null) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : def;
  } catch { return def; }
}

function _save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ── CONFIG ─────────────────────────────────────
export const Config = {
  get: ()    => ({ ...DEFAULT_CONFIG, ..._load(KEYS.CONFIG, {}) }),
  save: (cfg) => _save(KEYS.CONFIG, { ...Config.get(), ...cfg }),
};

// ── CUSTOS FIXOS ───────────────────────────────
export const Custos = {
  getAll: ()     => _load(KEYS.CUSTOS, {}),
  getMes: (key)  => _load(KEYS.CUSTOS, {})[key] || {},
  saveMes(key, data) {
    const all = Custos.getAll();
    all[key] = data;
    _save(KEYS.CUSTOS, all);
  },
  totalMes(key) {
    const d = Custos.getMes(key);
    const fixed = ['aluguel','condominio','energia','agua','internet','auxiliar','contabilidade','limpeza','software','marketing']
      .reduce((s, k) => s + (parseFloat(d[k]) || 0), 0);
    const outros = (d.outros || []).reduce((s, o) => s + (parseFloat(o.valor) || 0), 0);
    return fixed + outros;
  },
  mediaMeses() {
    const all = Custos.getAll();
    const vals = Object.values(all).map(d => {
      const fixed = ['aluguel','condominio','energia','agua','internet','auxiliar','contabilidade','limpeza','software','marketing']
        .reduce((s, k) => s + (parseFloat(d[k]) || 0), 0);
      const outros = (d.outros || []).reduce((s, o) => s + (parseFloat(o.valor) || 0), 0);
      return fixed + outros;
    }).filter(v => v > 0);
    return vals.length ? vals.reduce((a,b) => a+b, 0) / vals.length : 0;
  },
};

// ── RECEITAS INTERNAS ──────────────────────────
export const Receitas = {
  getAll:  ()    => _load(KEYS.RECEITAS, {}),
  getMes:  (key) => _load(KEYS.RECEITAS, {})[key] || {},
  saveMes(key, data) {
    const all = Receitas.getAll();
    all[key] = data;
    _save(KEYS.RECEITAS, all);
  },
  totalMes(key) {
    const d = Receitas.getMes(key);
    const fixed = ['cadeira1','cadeira2','manicure','pedicure','outros1','outros2']
      .reduce((s, k) => s + (parseFloat(d[k]) || 0), 0);
    return fixed;
  },
  custoFixoRealMes(mesKey) {
    return Math.max(0, Custos.totalMes(mesKey) - Receitas.totalMes(mesKey));
  },
  mediaCustoFixoReal() {
    const all = Custos.getAll();
    const keys = Object.keys(all);
    if (!keys.length) return 0;
    const vals = keys.map(k => Receitas.custoFixoRealMes(k)).filter(v => v > 0);
    return vals.length ? vals.reduce((a,b) => a+b, 0) / vals.length : 0;
  },
};

// ── SERVIÇOS ────────────────────────────────────
export const Servicos = {
  getAll: ()   => _load(KEYS.SERVICOS, []),
  save:   (arr) => _save(KEYS.SERVICOS, arr),
  add(svc) {
    const all = Servicos.getAll();
    svc.id = Date.now();
    all.push(svc);
    _save(KEYS.SERVICOS, all);
    return svc;
  },
  update(id, data) {
    const all = Servicos.getAll().map(s => s.id === id ? { ...s, ...data, id } : s);
    _save(KEYS.SERVICOS, all);
  },
  remove(id) {
    _save(KEYS.SERVICOS, Servicos.getAll().filter(s => s.id !== id));
  },
  byId: (id) => Servicos.getAll().find(s => s.id === id),
  calcPrecos(svc, cfg, custoFixoPorCliente) {
    const tempoH = (parseFloat(svc.tempoMin) || 0) / 60;
    const custoTempo = tempoH * (parseFloat(cfg.valorHora) || 0);
    const custoProd  = parseFloat(svc.custoProduto) || 0;
    const custoFixo  = parseFloat(custoFixoPorCliente) || 0;
    const custoTotal = custoProd + custoTempo + custoFixo;
    return {
      custoTempo:   custoTempo,
      custoProduto: custoProd,
      custoFixo:    custoFixo,
      custoTotal:   custoTotal,
      precoMin:     custoTotal * (parseFloat(cfg.multMin)   || 2),
      precoIdeal:   custoTotal * (parseFloat(cfg.multIdeal) || 2.5),
      precoPrem:    custoTotal * (parseFloat(cfg.multPrem)  || 3),
    };
  },
};

// ── DIÁRIO ──────────────────────────────────────
export const Diario = {
  getAll:  ()    => _load(KEYS.DIARIO, []),
  save:    (arr) => _save(KEYS.DIARIO, arr),
  add(entry) {
    const all = Diario.getAll();
    entry.id = Date.now();
    all.unshift(entry);
    _save(KEYS.DIARIO, all);
    return entry;
  },
  update(id, data) {
    const all = Diario.getAll().map(e => e.id === id ? { ...e, ...data, id } : e);
    _save(KEYS.DIARIO, all);
  },
  remove(id) {
    _save(KEYS.DIARIO, Diario.getAll().filter(e => e.id !== id));
  },
  getByMes(ano, mesIdx) {
    const prefix = `${ano}-${String(mesIdx + 1).padStart(2,'0')}`;
    return Diario.getAll().filter(e => e.data && e.data.startsWith(prefix));
  },
  resumoMes(ano, mesIdx) {
    const entries = Diario.getByMes(ano, mesIdx);
    return {
      atendimentos: entries.reduce((s,e) => s + (parseInt(e.qtd)||1), 0),
      custoProduto: entries.reduce((s,e) => s + (parseFloat(e.custoProduto)||0) * (parseInt(e.qtd)||1), 0),
      custoTotal:   entries.reduce((s,e) => s + (parseFloat(e.custoTotal)||0) * (parseInt(e.qtd)||1), 0),
      tempoMin:     entries.reduce((s,e) => s + (parseFloat(e.tempoMin)||0) * (parseInt(e.qtd)||1), 0),
      entries,
    };
  },
};

// ── AGENDA ──────────────────────────────────────
export const Agenda = {
  getAll:  ()    => _load(KEYS.AGENDA, []),
  save:    (arr) => _save(KEYS.AGENDA, arr),
  add(entry) {
    const all = Agenda.getAll();
    entry.id = Date.now();
    // Ordenar por data + horário ao inserir
    all.push(entry);
    all.sort((a, b) => {
      const da = (a.data || '') + (a.horario || '');
      const db = (b.data || '') + (b.horario || '');
      return db.localeCompare(da); // mais recente no topo
    });
    _save(KEYS.AGENDA, all);
    return entry;
  },
  update(id, data) {
    const all = Agenda.getAll().map(e => e.id === id ? { ...e, ...data, id } : e);
    all.sort((a, b) => {
      const da = (a.data || '') + (a.horario || '');
      const db = (b.data || '') + (b.horario || '');
      return db.localeCompare(da);
    });
    _save(KEYS.AGENDA, all);
  },
  remove(id) {
    _save(KEYS.AGENDA, Agenda.getAll().filter(e => e.id !== id));
  },
  getAmanha() {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const str = amanha.toISOString().slice(0, 10);
    return Agenda.getAll()
      .filter(e => e.data === str && e.status !== 'cancelado')
      .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));
  },
};

// ── EXPORT / IMPORT ────────────────────────────
export function exportarDados() {
  const dados = {
    versao: '5.0',
    exportadoEm: new Date().toISOString(),
    config:   Config.get(),
    custos:   Custos.getAll(),
    receitas: Receitas.getAll(),
    servicos: Servicos.getAll(),
    diario:   Diario.getAll(),
    agenda:   Agenda.getAll(),
  };
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `salao-dados-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importarDados(json) {
  const d = JSON.parse(json);
  if (d.config)   _save(KEYS.CONFIG,   d.config);
  if (d.custos)   _save(KEYS.CUSTOS,   d.custos);
  if (d.receitas) _save(KEYS.RECEITAS, d.receitas);
  if (d.servicos) _save(KEYS.SERVICOS, d.servicos);
  if (d.diario)   _save(KEYS.DIARIO,   d.diario);
  if (d.agenda)   _save(KEYS.AGENDA,   d.agenda);
}

export { MESES };
