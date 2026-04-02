// ═══════════════════════════════════════════════════════
// js/ui.js — Helpers de render compartilhados (Fase 2)
// Funções que geram HTML padronizado para padrões que
// se repetem em 3+ páginas do sistema.
//
// REGRA: nenhuma lógica de negócio aqui.
// Só recebe dados, retorna HTML string.
// Nunca importa de storage.js.
// ═══════════════════════════════════════════════════════
import { R$, fmtData, linkWA, formatarTelefone } from './utils.js';

// ── Cabeçalho de seção ─────────────────────────────────
// Uso: container.innerHTML = sectionHeader('Diário', 'Subtítulo') + ...
// Substitui o par <div class="section-title"> + <div class="section-sub">
// que aparece em todos os arquivos de página
export function sectionHeader(title, sub = '') {
  return `
    <div class="section-title">${title}</div>
    ${sub ? `<div class="section-sub">${sub}</div>` : ''}
  `;
}

// ── Grid de mini-KPIs ──────────────────────────────────
// Uso: resumoCards([{ label, value, sub, cor }])
// Substitui o inline style grid em diario.js, controle.js
// cor: 'green' | 'plum' | 'rose' | 'blue' | 'warn' | 'green-border' | 'plum-mid-border'
export function resumoCards(items) {
  if (!items.length) return '';
  const cards = items.map(({ label, value, sub = '', cor = '' }) => `
    <div class="kpi-mini-card ${cor}">
      <div class="kpi-label">${label}</div>
      <div class="kpi-value">${value}</div>
      ${sub ? `<div class="kpi-sub">${sub}</div>` : ''}
    </div>
  `).join('');
  return `<div class="kpi-mini-grid">${cards}</div>`;
}

// ── Linha de timeline ──────────────────────────────────
// Uso: timelineItem({ data, nome, valor, origem, status, profissional })
// Substitui o HTML inline em clientes.js e diario.js
// origem: 'diario' | 'agenda'
export function timelineItem({ data, nome, valor = null, origem = 'diario', status = '', profissional = '' }) {
  const badge = origem === 'diario'
    ? `<span class="badge badge-green" style="font-size:10px">Atend.</span>`
    : `<span class="badge badge-plum" style="font-size:10px">Agenda</span>`;

  const valorHTML = valor !== null && valor > 0
    ? `<span class="timeline-valor">${R$(valor)}</span>`
    : status
      ? `<span class="badge badge-${status === 'confirmado' ? 'green' : 'plum'}" style="font-size:10px">${status}</span>`
      : '';

  const profHTML = profissional
    ? `<span class="text-muted" style="font-size:11px"> · ${profissional}</span>`
    : '';

  return `
    <div class="timeline-item">
      ${badge}
      <span class="timeline-data">${fmtData(data)}</span>
      <span class="timeline-item-nome">${nome}${profHTML}</span>
      ${valorHTML}
    </div>
  `;
}

// ── Lista de timeline completa ─────────────────────────
// Uso: timelineList(entries, maxItems)
// entries: array de objetos do Diario/Agenda com _origem
export function timelineList(entries, maxItems = 999) {
  if (!entries.length) {
    return `<p class="text-muted" style="font-size:13px;padding:8px 0">Nenhum registro ainda.</p>`;
  }
  const slice = entries.slice(0, maxItems);
  const html  = slice.map(t => {
    const nome  = t._origem === 'diario'
      ? (t.servicoNome || t.produtoNome || '—')
      : (t.servicoNome || t.obs || '—');
    const valor = t.precoCobrado
      ? parseFloat(t.precoCobrado) * (parseInt(t.qtd) || 1)
      : null;
    return timelineItem({
      data:         t.data,
      nome,
      valor,
      origem:       t._origem,
      status:       t.status || '',
      profissional: t.profissional || '',
    });
  }).join('');

  const extra = entries.length > maxItems
    ? `<p class="text-muted" style="font-size:12px;margin-top:8px">
         Exibindo ${maxItems} de ${entries.length}. Ver todos em <strong>Clientes</strong>.
       </p>`
    : '';

  return html + extra;
}

// ── Linha de stat (modal de perfil) ───────────────────
// Uso: statRow('Label', 'Valor', 'green')
// Substitui tabela inline com style em clientes.js e diario.js
// corValor: '' | 'green' | 'red' | 'plum'
export function statRow(label, valor, corValor = '') {
  return `
    <div class="stat-row">
      <span class="stat-label">${label}</span>
      <span class="stat-val ${corValor}">${valor}</span>
    </div>
  `;
}

// ── Mini-cards de perfil de cliente ───────────────────
// Uso: clienteStatCards({ qtdTotal, ticket, fat, ultimaVisita })
// Substitui o grid inline 2 colunas nos dois modais de perfil
export function clienteStatCards({ qtdTotal = 0, ticket = 0, fat = 0, ultimaVisita = null }) {
  return `
    <div class="kpi-mini-grid" style="grid-template-columns:1fr 1fr;margin-bottom:16px">
      <div class="kpi-mini-card plum">
        <div class="kpi-label">Total de Visitas</div>
        <div class="kpi-value">${qtdTotal || 0}</div>
      </div>
      <div class="kpi-mini-card green">
        <div class="kpi-label">Ticket Médio</div>
        <div class="kpi-value">${R$(ticket)}</div>
      </div>
      <div class="kpi-mini-card green-border">
        <div class="kpi-label">Faturamento Total</div>
        <div class="kpi-value" style="color:var(--txt-green)">${R$(fat)}</div>
      </div>
      <div class="kpi-mini-card plum-mid-border">
        <div class="kpi-label">Última Visita</div>
        <div class="kpi-value" style="font-size:16px">${fmtData(ultimaVisita) || '—'}</div>
      </div>
    </div>
  `;
}

// ── Linha de agendamento (agenda + dashboard widget) ───
// Uso: agendaRow(agendamento)
// Substitui o HTML inline em agenda.js e dashboard.js
export function agendaRow(a, { showServico = false } = {}) {
  const statusBadge = a.status === 'confirmado' ? 'badge-green'
    : a.status === 'realizado' ? 'badge-rose'
    : a.status === 'cancelado' ? 'badge-warn'
    : 'badge-plum';

  return `
    <div class="agenda-row">
      <span class="badge badge-plum agenda-row-horario">${a.horario || '—'}</span>
      <span class="agenda-row-cliente">${a.cliente || '—'}</span>
      ${showServico && a.servicoNome
        ? `<span class="agenda-row-servico">${a.servicoNome}</span>`
        : ''}
      <span class="badge ${statusBadge}" style="font-size:10px">${a.status || 'agendado'}</span>
    </div>
  `;
}

// ── Link WhatsApp inline ───────────────────────────────
// Uso: waLink(telefone)  → retorna <a> ou <span> vazio
// Substitui o ternário inline em clientes.js e diario.js
export function waLink(telefone) {
  const url = linkWA(telefone);
  if (!url) return `<span class="text-muted" style="font-size:11px">Sem tel</span>`;
  return `<a href="${url}" target="_blank" rel="noopener" class="wa-link" title="${formatarTelefone(telefone)}">
    <i data-lucide="message-circle" style="width:14px;height:14px"></i>
  </a>`;
}

// ── Empty state com ícone Lucide ───────────────────────
// Uso: emptyStateLucide('calendar', 'Nenhum agendamento hoje')
// Substitui o emptyState() do utils.js quando tem ícone Lucide
export function emptyStateLucide(icone, mensagem, sub = '') {
  return `
    <div class="empty-state">
      <div class="empty-icon">
        <i data-lucide="${icone}" style="width:36px;height:36px;stroke-width:1.5;opacity:.4"></i>
      </div>
      <p>${mensagem}</p>
      ${sub ? `<p class="text-muted" style="font-size:12px;margin-top:4px">${sub}</p>` : ''}
    </div>
  `;
}

// ── Bloco de form agrupado ─────────────────────────────
// Uso: formBloco('O que e para quem', conteudoHTML)
// Substitui o agrupamento visual do formulário de lançamento
export function formBloco(titulo, conteudo, icone = '') {
  return `
    <div class="form-bloco">
      <div class="form-bloco-titulo">
        ${icone ? `<i data-lucide="${icone}" style="width:12px;height:12px"></i>` : ''}
        ${titulo}
      </div>
      ${conteudo}
    </div>
  `;
}

// ── Rodapé de totais por forma de pagamento ────────────
// Uso: pgtoTotalsBar(entries)
// entries: array de lançamentos do Diario com formaPagamento e precoCobrado
// Retorna HTML da barra. Fase 4 vai usar isso na Caixa.
export function pgtoTotalsBar(entries) {
  if (!entries.length) return '';

  // Agrupa por forma de pagamento
  const totais = {};
  let totalGeral = 0;

  entries.forEach(e => {
    const forma  = e.formaPagamento || 'Sem forma';
    const valor  = (parseFloat(e.precoCobrado) || 0) * (parseInt(e.qtd) || 1);
    totais[forma] = (totais[forma] || 0) + valor;
    totalGeral   += valor;
  });

  if (totalGeral === 0) return '';

  const itens = Object.entries(totais)
    .sort((a, b) => b[1] - a[1])
    .map(([forma, val]) => `
      <div class="pgto-total-item">
        <span class="pgto-total-label">${forma}</span>
        <span class="pgto-total-valor">${R$(val)}</span>
      </div>
    `).join('');

  return `
    <div class="pgto-totals">
      ${itens}
      <div class="pgto-total-item total-geral" style="margin-left:auto">
        <span class="pgto-total-label">Total do Dia</span>
        <span class="pgto-total-valor">${R$(totalGeral)}</span>
      </div>
    </div>
  `;
}
