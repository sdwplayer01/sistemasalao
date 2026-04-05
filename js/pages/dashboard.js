// ═══════════════════════════════════════════════════════
// pages/dashboard.js — v3.1
// ═══════════════════════════════════════════════════════
import { Config, Diario, Custos, Receitas, Agenda, Produtos, MESES } from '../storage.js';
import { R$, pct, num, mesKey, hoje, fmtData } from '../utils.js';
import { getRetencao30dias } from './clientes.js';

// Mantém referência ao intervalo da barra rotativa para não vazar
let _rotatingInterval = null;

const MSGS_ROTATIVAS = [
  'Tem alguma conta fixa para pagar hoje?',
  'Você já registrou o caixa de hoje?',
  'Confira seu estoque baixo',
  'Quantos atendimentos você teve hoje?',
  'Seu preço está alinhado com seu custo?',
  'Você já lançou os custos fixos deste mês?',
  'Existe alguma cliente para retorno hoje?',
  'Seu lucro está saudável neste mês?',
  'Revise sua agenda de amanhã',
  'Você está precificando com estratégia?',
];

export function renderDashboard(container) {
  const cfg = Config.get();
  const ano = cfg.ano;
  const mesAtual = new Date().getMonth();
  const key = mesKey(ano, mesAtual);

  // ── Dados do mês atual ─────────────────────────────
  const res = Diario.resumoMes(ano, mesAtual);
  const cfReal = Receitas.custoFixoRealMes(key);

  // ── Agenda ─────────────────────────────────────────
  const agHoje = Agenda.getHoje();
  const agAmanha = Agenda.getAmanha();

  // ── Estoque baixo ──────────────────────────────────
  const lowStock = Produtos.getLowStock();

  // ── CRM ────────────────────────────────────────────
  const crm = getRetencao30dias();
  const totalClientes = crm.total || 0;
  const pFiel = totalClientes > 0 ? (crm.fiel / totalClientes) * 100 : 0;
  const pNova = totalClientes > 0 ? (crm.nova / totalClientes) * 100 : 0;
  const pAusente = totalClientes > 0 ? (crm.ausente / totalClientes) * 100 : 0;
  const pizzaStyle = `background: conic-gradient(
    var(--txt-green) 0% ${pFiel}%,
    var(--plum)      ${pFiel}% ${pFiel + pNova}%,
    var(--txt-red)   ${pFiel + pNova}% ${pFiel + pNova + pAusente}%,
    var(--bg-soft)   ${pFiel + pNova + pAusente}% 100%
  );`;

  // ── Mini gráfico: últimos 6 meses ──────────────────
  const ultimos6 = [];
  for (let d = 5; d >= 0; d--) {
    const m = ((mesAtual - d) + 12) % 12;
    const a = mesAtual - d < 0 ? ano - 1 : ano;
    const r = Diario.resumoMes(a, m);
    ultimos6.push({ label: MESES[m].slice(0, 3), fat: r.faturamento, lucro: r.lucroReal });
  }
  const maxFat = Math.max(...ultimos6.map(d => d.fat), 1);

  // ── HTML ───────────────────────────────────────────
  container.innerHTML = `

    <!-- Barra rotativa de lembretes -->
    <div class="rotating-msg-bar" id="rotatingMsgBar">
      ${MSGS_ROTATIVAS.map((m, i) =>
    `<span class="rotating-msg-text${i === 0 ? ' is-active' : ''}">${m}</span>`
  ).join('')}
    </div>

    <!-- KPIs do mês -->
    <div class="grid-kpi mt-16">

      <div class="kpi-card green">
        <div class="kpi-card-label">Faturamento — ${MESES[mesAtual]}</div>
        <div class="kpi-card-value">${R$(res.faturamento)}</div>
        <div class="kpi-card-sub">${num(res.atendimentos)} atendimento${res.atendimentos !== 1 ? 's' : ''}</div>
      </div>

      <div class="kpi-card ${res.lucroReal >= 0 ? 'plum' : 'rose'}">
        <div class="kpi-card-label">Lucro Real — ${MESES[mesAtual]}</div>
        <div class="kpi-card-value">${R$(res.lucroReal)}</div>
        <div class="kpi-card-sub">Margem ${pct(res.margem)}</div>
      </div>

      <div class="kpi-card blue">
        <div class="kpi-card-label">Custo Fixo Real</div>
        <div class="kpi-card-value">${R$(cfReal)}</div>
        <div class="kpi-card-sub">Mês atual</div>
      </div>

      <div class="kpi-card warn">
        <div class="kpi-card-label">Ticket Médio</div>
        <div class="kpi-card-value">${res.atendimentos > 0 ? R$(res.faturamento / res.atendimentos) : '—'}</div>
        <div class="kpi-card-sub">Comissões ${R$(res.comissaoTotal)}</div>
      </div>

    </div>

    ${lowStock.length > 0 ? `
    <!-- Alerta de estoque baixo -->
    <div class="alert-estoque mt-16">
      <i data-lucide="alert-triangle" style="width:15px;height:15px;flex-shrink:0"></i>
      <span>
        <strong>${lowStock.length} produto${lowStock.length !== 1 ? 's' : ''} com estoque baixo:</strong>
        ${lowStock.map(p => p.nome).join(', ')}
      </span>
      <a href="#" class="alert-link" id="linkVerEstoque">Ver estoque →</a>
    </div>` : ''}

    <!-- Grade principal -->
    <div class="grid-dashboard mt-16">

      <!-- Agenda do dia -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">📅 Agenda de Hoje</span>
          <span class="badge badge-plum" style="font-size:11px">${fmtData(hoje())}</span>
        </div>
        <div class="card-body" style="padding:0">
          ${agHoje.length === 0
      ? `<p class="text-muted" style="padding:16px;font-size:13px">Nenhum agendamento para hoje.</p>`
      : agHoje.map(a => _agendaRow(a)).join('')
    }
        </div>
        ${agAmanha.length > 0 ? `
        <div class="card-header" style="border-top:1px solid var(--bg-soft)">
          <span class="card-title" style="font-size:12px;color:var(--txt-muted)">
            💜 Amanhã — ${agAmanha.length} cliente${agAmanha.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div class="card-body" style="padding:0">
          ${agAmanha.map(a => _agendaRow(a)).join('')}
        </div>` : ''}
        <div class="card-footer">
          <a href="#" id="linkVerAgenda" class="text-plum fw-500" style="font-size:13px">Ver agenda completa →</a>
        </div>
      </div>

      <!-- Saúde da carteira -->
      <div class="card">
        <div class="card-header"><span class="card-title">✦ Saúde da Carteira</span></div>
        <div class="card-body" style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">
          ${totalClientes > 0
      ? `<div style="${pizzaStyle} width:100px;height:100px;border-radius:50%;flex-shrink:0"></div>`
      : `<div style="width:100px;height:100px;border-radius:50%;background:var(--bg-soft);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--txt-muted);text-align:center">Sem<br>dados</div>`
    }
          <div style="flex:1;min-width:120px;display:flex;flex-direction:column;gap:6px">
            <div class="legend-item"><span class="dot dot-green"></span> Fiéis: <strong>${crm.fiel}</strong></div>
            <div class="legend-item"><span class="dot dot-plum"></span> Novas: <strong>${crm.nova}</strong></div>
            <div class="legend-item"><span class="dot" style="background:var(--bg-soft);border:1px solid var(--border)"></span> Regulares: <strong>${crm.regular}</strong></div>
            <div class="legend-item"><span class="dot dot-warn"></span> Ausentes: <strong>${crm.ausente}</strong></div>
            <div class="legend-item"><span class="dot dot-red"></span> Inativas: <strong>${crm.inativa}</strong></div>
          </div>
        </div>
        <div class="card-footer" style="display:flex;justify-content:space-between;align-items:center">
          <span class="text-muted" style="font-size:12px">
            Retenção 30 dias: <strong class="text-green">${crm.taxa}%</strong>
          </span>
          <a href="#" id="linkVerCRM" class="text-plum fw-500" style="font-size:13px">Ver CRM →</a>
        </div>
      </div>

    </div>

    <!-- Gráfico: últimos 6 meses -->
    ${maxFat > 0 ? `
    <div class="card mt-16">
      <div class="card-header"><span class="card-title">📊 Faturamento — Últimos 6 Meses</span></div>
      <div class="card-body">
        <div class="chart-placeholder" id="chartSemestral"></div>
        <div style="display:flex;gap:16px;margin-top:8px;font-size:11px;color:var(--txt-muted)">
          <span><span style="display:inline-block;width:10px;height:10px;background:var(--plum);border-radius:2px;margin-right:4px"></span>Faturamento</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:var(--txt-green);border-radius:2px;opacity:.7;margin-right:4px"></span>Lucro real</span>
        </div>
      </div>
    </div>` : ''}

  `;

  // ── Gráfico semestral ──────────────────────────────
  if (maxFat > 0) {
    const chartEl = document.getElementById('chartSemestral');
    if (chartEl) {
      chartEl.innerHTML = ultimos6.map(d => `
        <div class="chart-bar-wrap">
          <div class="chart-val" style="font-size:9px">${d.fat ? R$(d.fat).replace('R$\xa0', '') : ''}</div>
          <div style="display:flex;gap:2px;align-items:flex-end;height:120px">
            <div class="chart-bar" style="height:${Math.round((d.fat / maxFat) * 120)}px;width:16px" title="Faturamento: ${R$(d.fat)}"></div>
            <div class="chart-bar rose" style="height:${d.lucro > 0 ? Math.round((d.lucro / maxFat) * 120) : 2}px;width:12px;opacity:.7" title="Lucro: ${R$(d.lucro)}"></div>
          </div>
          <div class="chart-label">${d.label}</div>
        </div>
      `).join('');
    }
  }

  // ── Links de navegação ─────────────────────────────
  container.querySelector('#linkVerAgenda')?.addEventListener('click', e => {
    e.preventDefault(); window.__navigateTo('agenda');
  });
  container.querySelector('#linkVerCRM')?.addEventListener('click', e => {
    e.preventDefault(); window.__navigateTo('clientes');
  });
  container.querySelector('#linkVerEstoque')?.addEventListener('click', e => {
    e.preventDefault(); window.__navigateTo('servicos');
  });

  // ── Barra rotativa ─────────────────────────────────
  // Limpa intervalo anterior para não vazar ao re-renderizar
  if (_rotatingInterval) { clearInterval(_rotatingInterval); _rotatingInterval = null; }
  const msgEls = container.querySelectorAll('.rotating-msg-text');
  if (msgEls.length > 1) {
    let idx = 0;
    _rotatingInterval = setInterval(() => {
      // Para sozinho se o dashboard não estiver mais na tela ativa
      if (!container.closest('.page.active')) {
        clearInterval(_rotatingInterval);
        _rotatingInterval = null;
        return;
      }
      msgEls[idx].classList.remove('is-active');
      idx = (idx + 1) % msgEls.length;
      msgEls[idx].classList.add('is-active');
    }, 6000);
  }

  // ── Ícones ─────────────────────────────────────────
  if (window.lucide) window.lucide.createIcons();
}

// ── Helper: linha de agendamento ──────────────────────
function _agendaRow(a) {
  const statusBadge = {
    confirmado: 'badge-green',
    realizado: 'badge-rose',
    cancelado: 'badge-warn',
  }[a.status] || 'badge-plum';

  return `
    <div style="display:flex;align-items:center;gap:8px;padding:10px 16px;border-bottom:1px solid var(--bg-soft)">
      <span class="badge badge-plum" style="font-size:11px;flex-shrink:0">${a.horario || '—'}</span>
      <span style="flex:1;font-size:13px;font-weight:500">${a.cliente || '—'}</span>
      ${a.servicoNome ? `<span class="text-muted" style="font-size:11px">${a.servicoNome}</span>` : ''}
      <span class="badge ${statusBadge}" style="font-size:10px">${a.status || 'agendado'}</span>
    </div>
  `;
}