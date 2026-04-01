// ═══════════════════════════════════════════════════════
// storage.js — Camada de dados (localStorage + Supabase sync)
// v2.2: + Produtos (estoque + SKU) + Clientes (CRM) + Comissão no Diário
// ═══════════════════════════════════════════════════════
// API pública 100% síncrona (localStorage).
// Supabase é acionado em background via _scheduleSync().
// ═══════════════════════════════════════════════════════
import { syncToSupabase, loadFromSupabase as _loadFromSupabase } from './supabase.js'

const KEYS = {
  CONFIG:   'salao_config',
  CUSTOS:   'salao_custos',
  RECEITAS: 'salao_receitas',
  SERVICOS: 'salao_servicos',
  DIARIO:   'salao_diario',
  AGENDA:   'salao_agenda',
  PRODUTOS: 'salao_produtos',   // v2.2
  CLIENTES: 'salao_clientes',   // v2.2
}

// Mapa chave localStorage → data_type Supabase
const LS_TO_TYPE = {
  salao_config:   'config',
  salao_custos:   'custos',
  salao_receitas: 'receitas',
  salao_servicos: 'servicos',
  salao_diario:   'diario',
  salao_agenda:   'agenda',
  salao_produtos: 'produtos',   // v2.2
  salao_clientes: 'clientes',   // v2.2
}

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
  mesCustoFixo: -1,
  profissionais:   ['Proprietária', 'Cabeleireira 1', 'Manicure 1', 'Auxiliar', 'Freelancer'],
  categorias:      ['Cabelo','Coloração','Tratamento','Manicure / Pedicure','Sobrancelha / Cílios','Depilação','Maquiagem','Outros'],
  formasPagamento: ['Dinheiro','PIX','Cartão Débito','Cartão Crédito','Transferência'],
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

// ── Sync engine ────────────────────────────────────────
let _syncTimer = null
const _dirtyKeys = new Set()

function _scheduleSync(lsKey) {
  _dirtyKeys.add(lsKey)
  clearTimeout(_syncTimer)
  _syncTimer = setTimeout(_flushSync, 1500) // debounce 1.5s
}

async function _flushSync() {
  for (const lsKey of _dirtyKeys) {
    const type = LS_TO_TYPE[lsKey]
    if (!type) continue
    const raw = localStorage.getItem(lsKey)
    if (raw) {
      try { await syncToSupabase(type, JSON.parse(raw)) } catch(e) {}
    }
  }
  _dirtyKeys.clear()
}

// ── localStorage helpers ───────────────────────────────
function _load(key, def = null) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def }
  catch { return def }
}

function _save(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
  _scheduleSync(key) // sync em background
}

// ── CONFIG ─────────────────────────────────────────────
export const Config = {
  get:  ()    => ({ ...DEFAULT_CONFIG, ..._load(KEYS.CONFIG, {}) }),
  save: (cfg) => _save(KEYS.CONFIG, { ...Config.get(), ...cfg }),
}

// ── CUSTOS FIXOS ───────────────────────────────────────
export const Custos = {
  getAll: ()    => _load(KEYS.CUSTOS, {}),
  getMes: (key) => _load(KEYS.CUSTOS, {})[key] || {},
  saveMes(key, data) { const all = Custos.getAll(); all[key] = data; _save(KEYS.CUSTOS, all) },
  totalMes(key) {
    const d = Custos.getMes(key)
    const fixed = ['aluguel','condominio','energia','agua','internet','auxiliar','contabilidade','limpeza','software','marketing']
      .reduce((s,k) => s+(parseFloat(d[k])||0), 0)
    return fixed + (d.outros||[]).reduce((s,o) => s+(parseFloat(o.valor)||0), 0)
  },
  mediaMeses() {
    const vals = Object.values(Custos.getAll()).map(d => {
      const fixed = ['aluguel','condominio','energia','agua','internet','auxiliar','contabilidade','limpeza','software','marketing']
        .reduce((s,k) => s+(parseFloat(d[k])||0), 0)
      return fixed + (d.outros||[]).reduce((s,o) => s+(parseFloat(o.valor)||0), 0)
    }).filter(v => v > 0)
    return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0
  },
}

// ── RECEITAS INTERNAS ──────────────────────────────────
export const Receitas = {
  getAll:  ()    => _load(KEYS.RECEITAS, {}),
  getMes:  (key) => _load(KEYS.RECEITAS, {})[key] || {},
  saveMes(key, data) { const all = Receitas.getAll(); all[key] = data; _save(KEYS.RECEITAS, all) },
  totalMes(key) {
    const d = Receitas.getMes(key)
    return ['cadeira1','cadeira2','manicure','pedicure','outros1','outros2']
      .reduce((s,k) => s+(parseFloat(d[k])||0), 0)
  },
  custoFixoRealMes(mesKey) { return Math.max(0, Custos.totalMes(mesKey) - Receitas.totalMes(mesKey)) },
  mediaCustoFixoReal() {
    const keys = Object.keys(Custos.getAll())
    if (!keys.length) return 0
    const vals = keys.map(k => Receitas.custoFixoRealMes(k)).filter(v => v > 0)
    return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0
  },
}

// ── SERVIÇOS ───────────────────────────────────────────
export const Servicos = {
  getAll: ()    => _load(KEYS.SERVICOS, []),
  save:   (arr) => _save(KEYS.SERVICOS, arr),
  add(svc)      { const all = Servicos.getAll(); svc.id = Date.now(); all.push(svc); _save(KEYS.SERVICOS, all); return svc },
  update(id, d) { _save(KEYS.SERVICOS, Servicos.getAll().map(s => s.id===id ? {...s,...d,id} : s)) },
  remove(id)    { _save(KEYS.SERVICOS, Servicos.getAll().filter(s => s.id!==id)) },
  byId: (id)    => Servicos.getAll().find(s => s.id===id),
  custoProdutoCalc(svc) {
    if (svc.qtdProduto && svc.custoPorUnidade)
      return (parseFloat(svc.qtdProduto)||0) * (parseFloat(svc.custoPorUnidade)||0)
    return parseFloat(svc.custoProduto) || 0
  },
  calcPrecos(svc, cfg, custoFixoPorCliente) {
    const tempoH     = (parseFloat(svc.tempoMin)||0) / 60
    const custoTempo = tempoH * (parseFloat(cfg.valorHora)||0)
    const custoProd  = Servicos.custoProdutoCalc(svc)
    const custoFixo  = parseFloat(custoFixoPorCliente) || 0
    const custoTotal = custoProd + custoTempo + custoFixo
    return {
      custoTempo, custoProduto: custoProd, custoFixo, custoTotal,
      precoMin:   custoTotal * (parseFloat(cfg.multMin)   || 2),
      precoIdeal: custoTotal * (parseFloat(cfg.multIdeal) || 2.5),
      precoPrem:  custoTotal * (parseFloat(cfg.multPrem)  || 3),
    }
  },
  custoFixoPorClienteCalc(cfg) {
    const atend = parseFloat(cfg.atendMedios) || 80
    const mesCF = parseInt(cfg.mesCustoFixo ?? -1)
    let cfr = mesCF >= 0 && mesCF <= 11
      ? Receitas.custoFixoRealMes(`${cfg.ano}-${String(mesCF+1).padStart(2,'0')}`)
      : Receitas.mediaCustoFixoReal()
    return atend > 0 ? cfr / atend : 0
  },
}

// ── PRODUTOS (v2.2) ────────────────────────────────────
// Schema: { id, sku, nome, categoria, precoVenda, custoProd, estoque, estoqueMin }
export const Produtos = {
  getAll: ()    => _load(KEYS.PRODUTOS, []),
  save:   (arr) => _save(KEYS.PRODUTOS, arr),

  // Gera SKU único mesmo após deleções — usa Math.max sobre o histórico
  _nextSku() {
    const all = Produtos.getAll()
    if (!all.length) return 'P001'
    const maxNum = Math.max(0, ...all.map(p => parseInt((p.sku || 'P0').slice(1)) || 0))
    return `P${String(maxNum + 1).padStart(3, '0')}`
  },

  add(prod) {
    const all = Produtos.getAll()
    prod.id  = Date.now()
    prod.sku = Produtos._nextSku()
    all.push(prod)
    _save(KEYS.PRODUTOS, all)
    return prod
  },

  update(id, d) {
    // Preserva sempre id e sku ao atualizar
    _save(KEYS.PRODUTOS, Produtos.getAll().map(p =>
      p.id === id ? { ...p, ...d, id: p.id, sku: p.sku } : p
    ))
  },

  remove(id) { _save(KEYS.PRODUTOS, Produtos.getAll().filter(p => p.id !== id)) },

  byId:  (id)  => Produtos.getAll().find(p => p.id === id),
  bySku: (sku) => Produtos.getAll().find(p => (p.sku||'').toUpperCase() === (sku||'').toUpperCase()),

  // Subtrai estoque — nunca vai abaixo de 0
  baixarEstoque(id, qtd = 1) {
    const all = Produtos.getAll()
    const idx = all.findIndex(p => p.id === id)
    if (idx < 0) return false
    all[idx].estoque = Math.max(0, (parseFloat(all[idx].estoque) || 0) - qtd)
    _save(KEYS.PRODUTOS, all)
    return all[idx].estoque
  },

  // Retorna produtos com estoque abaixo ou igual ao mínimo
  getLowStock() {
    return Produtos.getAll().filter(p =>
      (parseFloat(p.estoque) || 0) <= (parseFloat(p.estoqueMin) ?? 2)
    )
  },
}

// ── DIÁRIO ─────────────────────────────────────────────
// v2.2: campos novos nos entries:
//   tipo:          'servico' | 'produto'   (default retrocompatível: 'servico')
//   produtoId:     Number | null
//   produtoNome:   string
//   comissaoPct:   Number (0–100)
//   comissaoValor: Number (calculado sobre precoCobrado)
export const Diario = {
  getAll:  ()    => _load(KEYS.DIARIO, []),
  save:    (arr) => _save(KEYS.DIARIO, arr),
  add(entry)    { const all = Diario.getAll(); entry.id = Date.now(); all.unshift(entry); _save(KEYS.DIARIO, all); return entry },
  update(id, d) { _save(KEYS.DIARIO, Diario.getAll().map(e => e.id===id ? {...e,...d,id} : e)) },
  remove(id)    { _save(KEYS.DIARIO, Diario.getAll().filter(e => e.id!==id)) },
  getByMes(ano, mesIdx) {
    const prefix = `${ano}-${String(mesIdx+1).padStart(2,'0')}`
    return Diario.getAll().filter(e => e.data && e.data.startsWith(prefix))
  },

  resumoMes(ano, mesIdx) {
    const entries      = Diario.getByMes(ano, mesIdx)
    const atendimentos = entries.reduce((s,e) => s+(parseInt(e.qtd)||1), 0)
    const custoProduto = entries.reduce((s,e) => s+(parseFloat(e.custoProduto)||0)*(parseInt(e.qtd)||1), 0)
    const custoTotal   = entries.reduce((s,e) => s+(parseFloat(e.custoTotal)||0)*(parseInt(e.qtd)||1), 0)
    const tempoMin     = entries.reduce((s,e) => s+(parseFloat(e.tempoMin)||0)*(parseInt(e.qtd)||1), 0)
    const faturamento  = entries.reduce((s,e) => s+(parseFloat(e.precoCobrado)||0)*(parseInt(e.qtd)||1), 0)

    // v2.2: comissão e lucro real
    const comissaoTotal = entries.reduce((s,e) => s+(parseFloat(e.comissaoValor)||0)*(parseInt(e.qtd)||1), 0)
    const lucro         = faturamento - custoTotal                    // lucro bruto (retrocompat.)
    const lucroReal     = faturamento - custoTotal - comissaoTotal    // lucro após repasses

    // v2.2: split por tipo (retrocompat.: undefined → 'servico')
    const fatServicos = entries
      .filter(e => (e.tipo ?? 'servico') === 'servico')
      .reduce((s,e) => s+(parseFloat(e.precoCobrado)||0)*(parseInt(e.qtd)||1), 0)
    const fatProdutos = entries
      .filter(e => e.tipo === 'produto')
      .reduce((s,e) => s+(parseFloat(e.precoCobrado)||0)*(parseInt(e.qtd)||1), 0)

    const margem = faturamento > 0 ? lucroReal / faturamento : 0
    return {
      atendimentos, custoProduto, custoTotal, tempoMin,
      faturamento, lucro, lucroReal, comissaoTotal,
      fatServicos, fatProdutos,
      margem, entries,
    }
  },
}

// ── AGENDA ─────────────────────────────────────────────
export const Agenda = {
  getAll:  ()    => _load(KEYS.AGENDA, []),
  save:    (arr) => _save(KEYS.AGENDA, arr),
  add(entry) {
    const all = Agenda.getAll(); entry.id = Date.now(); all.push(entry)
    all.sort((a,b) => ((b.data||'')+(b.horario||'')).localeCompare((a.data||'')+(a.horario||'')))
    _save(KEYS.AGENDA, all); return entry
  },
  update(id, d) {
    const all = Agenda.getAll().map(e => e.id===id ? {...e,...d,id} : e)
    all.sort((a,b) => ((b.data||'')+(b.horario||'')).localeCompare((a.data||'')+(a.horario||'')))
    _save(KEYS.AGENDA, all)
  },
  remove(id) { _save(KEYS.AGENDA, Agenda.getAll().filter(e => e.id!==id)) },
  getAmanha() {
    const d = new Date(); d.setDate(d.getDate()+1)
    const str = d.toISOString().slice(0,10)
    return Agenda.getAll()
      .filter(e => e.data===str && e.status!=='cancelado')
      .sort((a,b) => (a.horario||'').localeCompare(b.horario||''))
  },
  getHoje() {
    const str = new Date().toISOString().slice(0,10)
    return Agenda.getAll()
      .filter(e => e.data===str && e.status!=='cancelado')
      .sort((a,b) => (a.horario||'').localeCompare(b.horario||''))
  },
}

// ── CLIENTES (v2.2 — CRM) ─────────────────────────────
// Indexado por nome (normalizado). Não duplica dados do Diário/Agenda —
// apenas persiste observações técnicas e metadados manuais.
// Dados analíticos (ticket médio, timeline) são calculados na hora.
export const Clientes = {
  getAll:  ()    => _load(KEYS.CLIENTES, []),
  save:    (arr) => _save(KEYS.CLIENTES, arr),

  _key: (nome) => (nome || '').trim().toLowerCase(),

  getByNome(nome) {
    const k = Clientes._key(nome)
    return Clientes.getAll().find(c => Clientes._key(c.nome) === k) || null
  },

  // Cria ou atualiza um cliente pelo nome
  upsert(nome, dados = {}) {
    if (!nome || !nome.trim()) return
    const all = Clientes.getAll()
    const k   = Clientes._key(nome)
    const idx = all.findIndex(c => Clientes._key(c.nome) === k)
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...dados }
    } else {
      all.push({
        nome: nome.trim(),
        obs: '',
        criadoEm: new Date().toISOString().slice(0,10),
        ...dados,
      })
    }
    _save(KEYS.CLIENTES, all)
  },

  // Data Mining: indexa todos os nomes únicos do Diário + Agenda
  // Deve ser chamado ao abrir a tela de Clientes para garantir lista atualizada
  syncFromDiarioAgenda() {
    const nomesD = Diario.getAll().map(e => e.cliente).filter(Boolean)
    const nomesA = Agenda.getAll().map(e => e.cliente).filter(Boolean)
    const unicos = [...new Set(
      [...nomesD, ...nomesA].map(n => n.trim()).filter(Boolean)
    )]
    // Adiciona apenas os que ainda não existem
    unicos.forEach(nome => {
      if (!Clientes.getByNome(nome)) Clientes.upsert(nome, {})
    })
  },

  // Calcula estatísticas em tempo real — sem dados redundantes no storage
  calcStats(nome) {
    const k = Clientes._key(nome)
    const registros = Diario.getAll().filter(e =>
      Clientes._key(e.cliente || '') === k
    )
    const agendamentos = Agenda.getAll().filter(e =>
      Clientes._key(e.cliente || '') === k
    )
    const qtdTotal  = registros.reduce((s,e) => s+(parseInt(e.qtd)||1), 0)
    const fat       = registros.reduce((s,e) => s+(parseFloat(e.precoCobrado)||0)*(parseInt(e.qtd)||1), 0)
    const ticket    = qtdTotal > 0 ? fat / qtdTotal : 0
    const datas     = registros.map(e => e.data).filter(Boolean).sort()
    const ultimaVisita = datas.length ? datas[datas.length - 1] : null
    const primeiraVisita = datas.length ? datas[0] : null
    // Timeline unificada ordenada pela mais recente
    const timeline = [
      ...registros.map(e => ({ ...e, _origem: 'diario' })),
      ...agendamentos.map(e => ({ ...e, _origem: 'agenda' })),
    ].sort((a,b) => (b.data||'').localeCompare(a.data||''))

    return { registros, agendamentos, qtdTotal, fat, ticket, ultimaVisita, primeiraVisita, timeline }
  },
}

// ── Carrega dados do Supabase para o localStorage ──────
export async function loadFromSupabase() {
  return await _loadFromSupabase()
}

// ── Limpa localStorage ao fazer logout ─────────────────
export function clearLocalData() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k))
}

// ── Export / Import JSON (backup local) ───────────────
export function exportarDados() {
  const dados = {
    versao: '6.0', exportadoEm: new Date().toISOString(),
    config:   Config.get(),
    custos:   Custos.getAll(),
    receitas: Receitas.getAll(),
    servicos: Servicos.getAll(),
    diario:   Diario.getAll(),
    agenda:   Agenda.getAll(),
    produtos: Produtos.getAll(),   // v2.2
    clientes: Clientes.getAll(),   // v2.2
  }
  const blob = new Blob([JSON.stringify(dados,null,2)], {type:'application/json'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `salao-dados-${new Date().toISOString().slice(0,10)}.json`; a.click()
  URL.revokeObjectURL(url)
}

export function importarDados(json) {
  const d = JSON.parse(json)
  if (d.config)   _save(KEYS.CONFIG,   d.config)
  if (d.custos)   _save(KEYS.CUSTOS,   d.custos)
  if (d.receitas) _save(KEYS.RECEITAS, d.receitas)
  if (d.servicos) _save(KEYS.SERVICOS, d.servicos)
  if (d.diario)   _save(KEYS.DIARIO,   d.diario)
  if (d.agenda)   _save(KEYS.AGENDA,   d.agenda)
  if (d.produtos) _save(KEYS.PRODUTOS, d.produtos)   // v2.2 — arrays vazios em backups antigos
  if (d.clientes) _save(KEYS.CLIENTES, d.clientes)   // v2.2 — retrocompat. segura
}

export { MESES }
