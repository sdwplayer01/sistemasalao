// ═══════════════════════════════════════════════════════
// dashboard.js — Dashboard completo com KPIs reais
// v4.0: Widget Financeiro + Saúde da Carteira + Agenda Hoje + Estoque
// ═══════════════════════════════════════════════════════
import { Config, Diario, Custos, Receitas, Agenda, Produtos, MESES } from '../storage.js';
import { R$, pct, num, fmtData, initIcons } from '../utils.js';
import { getRetencao30dias } from './clientes.js';

export function renderDashboard(container) {
  try {
    _render(container);
  } catch (e) {
    console.error('Dashboard render error:', e);
    container.innerHTML = `
      <div class="section-title">Dashboard</div>
      <div class="card" style="padding:40px;text-align:center;color:var(--txt-muted)">
        <p>Erro ao carregar o dashboard. Verifique o console.</p>
        <p style="font-size:12px;margin-top:8px;opacity:.6">${e?.message || ''}</p>
      </div>`;
  }
}

function _render(container) {
  const cfg   = Config.get();
  const ano   = cfg.ano;
  const now   = new Date();
  const mesIdx = now.getMonth();
  const mesKey = `${ano}-${String(mesIdx + 1).padStart(2, '0')}`;

  // ── Dados financeiros do mês ──────────────────────
  const resumo   = Diario.resumoMes(ano, mesIdx);
  const cfBruto  = Custos.totalMes(mesKey);
  const recInternas = Receitas.totalMes(mesKey);
  const cfReal   = Math.max(0, cfBruto - recInternas);

  // ── Saúde da carteira ─────────────────────────────
  let crm = { fiel: 0, nova: 0, regular: 0, ausente: 0, inativa: 0, total: 0, taxa: 0 };
  try { crm = getRetencao30dias(); } catch (e) { console.warn('CRM data error:', e); }

  // ── Agenda de hoje ────────────────────────────────
  const agendaHoje  = Agenda.getHoje();
  const agendaAmanha = Agenda.getAmanha();

  // ── Estoque baixo ─────────────────────────────────
  let lowStock = [];
  try { lowStock = Produtos.getLowStock(); } catch (e) {}

  // ── Gráfico de pizza ──────────────────────────────
  const totalCRM = crm.total || 1; // evita div/0
  const slices = [
    { key: 'fiel',    label: 'Fiéis',    count: crm.fiel,    color: 'var(--txt-green)' },
    { key: 'nova',    label: 'Novas',    count: crm.nova,    color: 'var(--plum)' },
    { key: 'regular', label: 'Regulares',count: crm.regular, color: 'var(--plum-light)' },
    { key: 'ausente', label: 'Ausentes', count: crm.ausente, color: '#e6a817' },
    { key: 'inativa', label: 'Inativas', count: crm.inativa, color: 'var(--txt-red)' },
  ];

  let cumPct = 0;
  const gradientParts = [];
  slices.forEach(s => {
    const pctVal = (s.count / totalCRM) * 100;
    if (pctVal > 0) {
      gradientParts.push(`${s.color} ${cumPct}% ${cumPct + pctVal}%`);
      cumPct += pctVal;
    }
  });
  if (cumPct < 100) gradientParts.push(`var(--bg-soft) ${cumPct}% 100%`);
  const chartBg = gradientParts.length ? `conic-gradient(${gradientParts.join(', ')})` : 'var(--bg-soft)';

  // ── Render ────────────────────────────────────────
  const msgBar = container.querySelector('#rotatingMsgBar');
  container.innerHTML = '';
  if (msgBar) container.appendChild(msgBar);

  container.insertAdjacentHTML('beforeend', `
    <div class="section-title">Dashboard — ${MESES[mesIdx]} ${ano}</div>
    <div class="section-sub">Visão geral do seu salão em tempo real.</div>

    <!-- KPIs financeiras -->
    <div class="kpi-mini-grid mt-16">
      <div class="kpi-mini-card green">
        <div class="kpi-label">Faturamento do Mês</div>
        <div class="kpi-value">${R$(resumo.faturamento)}</div>
        <div class="kpi-sub">${num(resumo.atendimentos)} atendimentos</div>
      </div>
      <div class="kpi-mini-card ${resumo.lucroReal >= 0 ? 'green-border' : ''}">
        <div class="kpi-label">Lucro Líquido</div>
        <div class="kpi-value" style="color:${resumo.lucroReal >= 0 ? 'var(--txt-green)' : 'var(--txt-red)'}">${R$(resumo.lucroReal)}</div>
        <div class="kpi-sub">Após comissões: ${R$(resumo.comissaoTotal)}</div>
      </div>
      <div class="kpi-mini-card plum">
        <div class="kpi-label">Margem de Lucro</div>
        <div class="kpi-value">${pct(resumo.margem)}</div>
        <div class="kpi-sub">Ticket médio: ${R$(resumo.atendimentos > 0 ? resumo.faturamento / resumo.atendimentos : 0)}</div>
      </div>
      <div class="kpi-mini-card">
        <div class="kpi-label">Custo Fixo Real</div>
        <div class="kpi-value">${R$(cfReal)}</div>
        <div class="kpi-sub">Bruto: ${R$(cfBruto)} − Receitas: ${R$(recInternas)}</div>
      </div>
    </div>

    <!-- Linha 2: Saúde da Carteira + Agenda Hoje -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px" class="dashboard-grid-2">

      <!-- Saúde da Carteira -->
      <div class="card shadow-sm">
        <div class="card-header"><span class="card-title">✦ Saúde da Carteira</span> <span class="badge badge-plum">${crm.total} clientes</span></div>
        <div class="card-body" style="display:flex;align-items:center;gap:24px">
          <div style="${chartBg};width:110px;height:110px;border-radius:50%;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,.08)"></div>
          <div style="flex:1;display:flex;flex-direction:column;gap:6px">
            ${slices.map(s => `
              <div style="display:flex;align-items:center;gap:8px;font-size:13px">
                <span style="width:10px;height:10px;border-radius:50%;background:${s.color};flex-shrink:0"></span>
                <span style="flex:1;color:var(--txt-dark)">${s.label}</span>
                <strong>${s.count}</strong>
              </div>
            `).join('')}
            <div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--bg-soft);font-size:12px;color:var(--txt-muted)">
              Taxa de retenção: <strong style="color:var(--plum)">${crm.taxa}%</strong>
            </div>
          </div>
        </div>
        <div class="card-footer">
          <a href="#" id="linkVerCRM" class="text-plum fw-500" style="font-size:13px">Ver detalhes no CRM →</a>
        </div>
      </div>

      <!-- Agenda de Hoje -->
      <div class="card shadow-sm">
        <div class="card-header">
          <span class="card-title"><i data-lucide="calendar-check" style="width:16px;height:16px;vertical-align:-2px"></i> Agenda de Hoje</span>
          <span class="badge badge-green">${agendaHoje.length}</span>
        </div>
        <div class="card-body" style="max-height:240px;overflow-y:auto">
          ${agendaHoje.length === 0
            ? `<div style="text-align:center;padding:20px;color:var(--txt-muted);font-size:13px">
                 <i data-lucide="calendar-off" style="width:28px;height:28px;opacity:.3;display:block;margin:0 auto 8px"></i>
                 Nenhum agendamento para hoje.
               </div>`
            : agendaHoje.map(a => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bg-soft)">
                <span class="badge badge-plum" style="min-width:50px;text-align:center">${a.horario || '—'}</span>
                <span class="fw-600" style="flex:1">${a.cliente || '—'}</span>
                <span class="text-muted" style="font-size:12px">${a.servicoNome || ''}</span>
                <span class="badge ${a.status === 'confirmado' ? 'badge-green' : a.status === 'realizado' ? 'badge-rose' : 'badge-plum'}" style="font-size:10px">${a.status || 'agendado'}</span>
              </div>
            `).join('')}
        </div>
        ${agendaAmanha.length > 0 ? `
          <div class="card-footer" style="font-size:12px;color:var(--txt-muted)">
            <i data-lucide="bell" style="width:12px;height:12px;vertical-align:-1px"></i>
            Amanhã: <strong>${agendaAmanha.length}</strong> agendamento${agendaAmanha.length > 1 ? 's' : ''}
          </div>
        ` : ''}
      </div>

    </div>

    <!-- Linha 3: Split Serviços/Produtos + Estoque Baixo -->
    <div style="display:grid;grid-template-columns:${lowStock.length > 0 ? '1fr 1fr' : '1fr'};gap:20px;margin-top:20px" class="dashboard-grid-2">

      <!-- Mix de Receita -->
      <div class="card shadow-sm">
        <div class="card-header"><span class="card-title"><i data-lucide="pie-chart" style="width:16px;height:16px;vertical-align:-2px"></i> Mix de Receita</span></div>
        <div class="card-body">
          <div style="display:flex;gap:16px;align-items:center">
            <div style="flex:1">
              <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
                <span>Serviços</span><strong style="color:var(--plum)">${R$(resumo.fatServicos)}</strong>
              </div>
              <div style="height:8px;background:var(--bg-soft);border-radius:4px;overflow:hidden">
                <div style="height:100%;background:var(--plum);border-radius:4px;width:${resumo.faturamento > 0 ? Math.round((resumo.fatServicos / resumo.faturamento) * 100) : 0}%"></div>
              </div>
            </div>
            <div style="flex:1">
              <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
                <span>Produtos</span><strong style="color:var(--txt-green)">${R$(resumo.fatProdutos)}</strong>
              </div>
              <div style="height:8px;background:var(--bg-soft);border-radius:4px;overflow:hidden">
                <div style="height:100%;background:var(--txt-green);border-radius:4px;width:${resumo.faturamento > 0 ? Math.round((resumo.fatProdutos / resumo.faturamento) * 100) : 0}%"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      ${lowStock.length > 0 ? `
      <!-- Estoque Baixo -->
      <div class="card shadow-sm" style="border-left:3px solid var(--txt-red)">
        <div class="card-header"><span class="card-title" style="color:var(--txt-red)"><i data-lucide="alert-triangle" style="width:16px;height:16px;vertical-align:-2px"></i> Estoque Baixo</span></div>
        <div class="card-body" style="max-height:160px;overflow-y:auto">
          ${lowStock.slice(0, 5).map(p => `
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bg-soft);font-size:13px">
              <span>${p.nome}</span>
              <span class="badge badge-warn">${p.estoque ?? 0} un.</span>
            </div>
          `).join('')}
          ${lowStock.length > 5 ? `<div class="text-muted" style="font-size:11px;margin-top:6px">+ ${lowStock.length - 5} outros itens</div>` : ''}
        </div>
      </div>
      ` : ''}

    </div>
  `;

  // ── Listeners ─────────────────────────────────────
  container.querySelector('#linkVerCRM')?.addEventListener('click', e => {
    e.preventDefault();
    window.__navigateTo('clientes');
  });

  initIcons();
}