// ═══════════════════════════════════════════════════════
// pages/dashboard.js — Dashboard Operacional v3.0
// - KPIs pesados removidos do topo → ficam em Diário/Caixa
// - Painel focado em: lembretes rotativos, agenda,
//   caixa do dia, estoque, retenção
// - Renderização instantânea (sem await bloqueante)
// - Onboarding modal no primeiro acesso
// ═══════════════════════════════════════════════════════
import { Config, Diario, Servicos, Custos, Receitas, Agenda, Produtos, MESES } from '../storage.js';
import { R$, pct, num, mesKey, fmtData, linkWA, formatarTelefone } from '../utils.js';
import { getRetencao30dias } from './clientes.js';


// ── Onboarding modal (só no primeiro acesso) ──────────
function checkOnboarding() {
  if (localStorage.getItem('onboarding_complete')) return;

  const { openModal, closeModal } = window.__utils || {};
  if (!openModal) return;

  const body = `
    <div style="margin-bottom:16px;font-family:var(--font-serif);font-size:18px;color:var(--noir);font-weight:600">
      Bem-vinda ao seu sistema de gestão!
    </div>
    <p style="font-size:13px;color:var(--txt-muted);margin-bottom:20px;line-height:1.6">
      Em poucos minutos você já pode usar tudo. Siga esta ordem:
    </p>
    <div class="onboarding-step">
      <div class="onboarding-num">1</div>
      <div class="onboarding-txt"><strong>Configurações</strong> — nome do salão, valor da hora e profissionais</div>
    </div>
    <div class="onboarding-step">
      <div class="onboarding-num">2</div>
      <div class="onboarding-txt"><strong>Custos Fixos</strong> — aluguel, energia, internet e outros</div>
    </div>
    <div class="onboarding-step">
      <div class="onboarding-num">3</div>
      <div class="onboarding-txt"><strong>Receitas Internas</strong> — repasses e aluguel de cadeiras</div>
    </div>
    <div class="onboarding-step">
      <div class="onboarding-num">4</div>
      <div class="onboarding-txt"><strong>Serviços & Produtos</strong> — cadastre os serviços para ver os preços sugeridos</div>
    </div>
    <div class="onboarding-step">
      <div class="onboarding-num">5</div>
      <div class="onboarding-txt"><strong>Diário / Caixa</strong> — registre cada atendimento e o sistema atualiza tudo</div>
    </div>
  `;

  const footer = `
    <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--txt-muted);cursor:pointer;margin-right:auto">
      <input type="checkbox" id="onbDontShow" /> Não mostrar novamente
    </label>
    <button class="btn btn-primary" id="onbClose">Entendido, vamos começar!</button>
  `;

  openModal('✦ Primeiros passos', body, footer);

  document.getElementById('onbClose')?.addEventListener('click', () => {
    if (document.getElementById('onbDontShow')?.checked) {
      localStorage.setItem('onboarding_complete', 'true');
    }
    closeModal();
  });
}

// ── Render principal ──────────────────────────────────
export function renderDashboard(container) {
  const cfg = Config.get();
  const ano = cfg.ano;
  const mesAtual = new Date().getMonth();
  const hoje = new Date().toISOString().slice(0, 10);

  // ── Dados OPERACIONAIS (rápidos — apenas hoje/este mês) ──
  const agendaHoje = Agenda.getHoje().slice(0, 6);
  const agendaAmanha = Agenda.getAmanha().slice(0, 3);
  const lancHoje = Diario.getAll().filter(e => e.data === hoje);
  const estoqBaixo = Produtos.getLowStock();
  const retencao = getRetencao30dias().slice(0, 5);
  const caixaHoje = lancHoje.reduce((s, e) => s + (parseFloat(e.precoCobrado) || 0) * (parseInt(e.qtd) || 1), 0);
  const caixaAtend = lancHoje.reduce((s, e) => s + (parseInt(e.qtd) || 1), 0);

  // ── Resumo do mês atual (leve — só este mês) ─────────────
  const resMes = Diario.resumoMes(ano, mesAtual);
  const cfPorCliente = Servicos.custoFixoPorClienteCalc(cfg);

  // ── Indicadores minimalistas do topo ─────────────────────
  const cfReal = Receitas.mediaCustoFixoReal();

  container.innerHTML = `
    <div class="flex-between" style="margin-bottom:4px">
      <div>
        <div class="section-title">Dashboard</div>
        <div class="section-sub">${MESES[mesAtual]} ${ano} — visão operacional</div>
      </div>
    </div>


    <!-- Mini-KPIs operacionais (carrossel mobile) -->
    <div class="kpi-grid" style="margin-bottom:20px">
      <div class="kpi-card green">
        <div class="kpi-label">Caixa Hoje</div>
        <div class="kpi-value">${R$(caixaHoje)}</div>
        <div class="kpi-sub">${caixaAtend} atend. registrados</div>
      </div>
      <div class="kpi-card plum">
        <div class="kpi-label">Agenda Hoje</div>
        <div class="kpi-value">${agendaHoje.length}</div>
        <div class="kpi-sub">agendamentos confirmados</div>
      </div>
      <div class="kpi-card ${estoqBaixo.length > 0 ? 'warn' : 'rose'}">
        <div class="kpi-label">Estoque Baixo</div>
        <div class="kpi-value">${estoqBaixo.length}</div>
        <div class="kpi-sub">${estoqBaixo.length > 0 ? 'produto(s) em alerta' : 'tudo em ordem'}</div>
      </div>
      <div class="kpi-card rose">
        <div class="kpi-label">Retenção</div>
        <div class="kpi-value">${retencao.length}</div>
        <div class="kpi-sub">cliente${retencao.length !== 1 ? 's' : ''} sem visita +30d</div>
      </div>
      <div class="kpi-card blue">
        <div class="kpi-label">Atend. ${MESES[mesAtual].slice(0, 3)}</div>
        <div class="kpi-value">${num(resMes.atendimentos)}</div>
        <div class="kpi-sub">neste mês</div>
      </div>
      <div class="kpi-card plum">
        <div class="kpi-label">CF Real / Mês</div>
        <div class="kpi-value">${R$(cfReal)}</div>
        <div class="kpi-sub">para precificação</div>
      </div>
    </div>

    <!-- Widgets operacionais -->
    <div class="widget-grid">

      <!-- Agenda do Dia -->
      <div class="widget-card">
        <div class="widget-title">
          <i data-lucide="calendar-check" style="width:13px;height:13px"></i>
          Agenda de Hoje
        </div>
        ${agendaHoje.length
      ? agendaHoje.map(a => `
            <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px">
              <span class="badge badge-plum" style="min-width:46px;text-align:center;font-weight:600">${a.horario || '—'}</span>
              <span style="flex:1;font-weight:500;color:var(--txt-dark)">${a.cliente || '—'}</span>
              <span class="badge ${a.status === 'confirmado' ? 'badge-green' : a.status === 'realizado' ? 'badge-rose' : 'badge-plum'}" style="font-size:10px">${a.status || 'agendado'}</span>
            </div>`).join('')
      : `<div style="text-align:center;padding:20px 0;color:var(--txt-muted);font-size:13px">
               Nenhum agendamento hoje
             </div>`
    }
        <a href="#" id="linkVerAgenda" style="font-size:12px;color:var(--plum);display:block;margin-top:8px;text-decoration:none;font-weight:500">Ver agenda completa →</a>
      </div>

      <!-- Caixa do Dia -->
      <div class="widget-card">
        <div class="widget-title">
          <i data-lucide="banknote" style="width:13px;height:13px"></i>
          Caixa de Hoje
        </div>
        ${lancHoje.length
      ? `<div style="text-align:center;padding:10px 0">
               <div style="font-size:30px;font-weight:700;font-family:var(--font-serif);color:var(--txt-green)">${R$(caixaHoje)}</div>
               <div style="font-size:12px;color:var(--txt-muted);margin-top:4px">${caixaAtend} atendimento${caixaAtend !== 1 ? 's' : ''}</div>
             </div>
             <div style="margin-top:10px">
               ${(() => {
        const fatSvc = lancHoje.filter(e => (e.tipo ?? 'servico') === 'servico').reduce((s, e) => s + (parseFloat(e.precoCobrado) || 0) * (parseInt(e.qtd) || 1), 0);
        const fatProd = lancHoje.filter(e => e.tipo === 'produto').reduce((s, e) => s + (parseFloat(e.precoCobrado) || 0) * (parseInt(e.qtd) || 1), 0);
        const rows = [];
        if (fatSvc > 0) rows.push(`<div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0;color:var(--txt-dark)"><span class="text-muted">Servicos</span><span class="fw-600">${R$(fatSvc)}</span></div>`);
        if (fatProd > 0) rows.push(`<div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0;color:var(--txt-dark)"><span class="text-muted">Produtos</span><span class="fw-600">${R$(fatProd)}</span></div>`);
        return rows.join('');
      })()}
             </div>`
      : `<div style="text-align:center;padding:20px 0;color:var(--txt-muted);font-size:13px">
               Nenhum lançamento hoje
             </div>`
    }
        <a href="#" id="linkVerDiario" style="font-size:12px;color:var(--plum);display:block;margin-top:8px;text-decoration:none;font-weight:500">Abrir Diário / Caixa →</a>
      </div>

      <!-- Alertas de Estoque -->
      <div class="widget-card">
        <div class="widget-title">
          <i data-lucide="package-open" style="width:13px;height:13px"></i>
          Alertas de Estoque
        </div>
        ${estoqBaixo.length
      ? `<div style="font-size:11px;color:var(--txt-muted);margin-bottom:8px">${estoqBaixo.length} produto${estoqBaixo.length !== 1 ? 's' : ''} abaixo do mínimo:</div>
             ${estoqBaixo.slice(0, 5).map(p => `
               <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px">
                 <span class="badge badge-warn" style="font-family:monospace;font-size:10px">${p.sku}</span>
                 <span style="flex:1;color:var(--txt-dark)">${p.nome}</span>
                 <span style="color:var(--txt-red);font-weight:600">${p.estoque ?? 0}</span>
               </div>`).join('')}
             ${estoqBaixo.length > 5 ? `<p style="font-size:11px;color:var(--txt-muted);margin-top:6px">+${estoqBaixo.length - 5} outros.</p>` : ''}
             <a href="#" id="linkVerEstoque" style="font-size:12px;color:var(--plum);display:block;margin-top:8px;text-decoration:none;font-weight:500">Ver produtos →</a>`
      : `<div style="text-align:center;padding:20px 0;color:var(--txt-muted);font-size:13px">
               Estoque em dia
             </div>`
    }
      </div>

      <!-- Retenção CRM -->
      <div class="widget-card">
        <div class="widget-title">
          <i data-lucide="user-check" style="width:13px;height:13px"></i>
          Retenção — mais de 30 dias
        </div>
        ${retencao.length
      ? retencao.map(r => `
            <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px">
              <span class="badge badge-rose" style="min-width:36px;text-align:center;font-weight:600">${r.dias}d</span>
              <span style="flex:1;font-weight:500;color:var(--txt-dark)">${r.nome}</span>
              ${r.tel && linkWA(r.tel)
          ? `<a href="${linkWA(r.tel)}" target="_blank" class="wa-link" title="${formatarTelefone(r.tel)}"><i data-lucide="message-circle" style="width:14px;height:14px"></i></a>`
          : `<span class="text-muted" style="font-size:11px">sem tel</span>`}
            </div>`).join('')
      : `<div style="text-align:center;padding:20px 0;color:var(--txt-muted);font-size:13px">
               Retencao em dia!
             </div>`
    }
        ${retencao.length ? `<a href="#" id="linkVerCRM" style="font-size:12px;color:var(--plum);display:block;margin-top:8px;text-decoration:none;font-weight:500">Ver todos no CRM →</a>` : ''}
      </div>

    </div><!-- /widget-grid -->

    <!-- Resumo do mês (compacto) -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Resumo — ${MESES[mesAtual]}</span>
        </div>
        <div class="card-body" style="padding:14px 18px">
          <table style="width:100%;font-size:13px">
            <tr>
              <td class="text-muted" style="padding:5px 0">Atendimentos</td>
              <td class="text-right fw-600" style="padding:5px 0">${num(resMes.atendimentos)}</td>
            </tr>
            <tr>
              <td class="text-muted" style="padding:5px 0">Faturamento</td>
              <td class="text-right fw-600 text-green" style="padding:5px 0">${R$(resMes.faturamento)}</td>
            </tr>
            <tr>
              <td class="text-muted" style="padding:5px 0">Lucro real</td>
              <td class="text-right fw-600 ${resMes.lucroReal >= 0 ? 'text-green' : 'text-red'}" style="padding:5px 0">${R$(resMes.lucroReal)}</td>
            </tr>
            ${resMes.comissaoTotal > 0 ? `
            <tr>
              <td class="text-muted" style="padding:5px 0">Comissoes pagas</td>
              <td class="text-right text-plum" style="padding:5px 0">${R$(resMes.comissaoTotal)}</td>
            </tr>` : ''}
            <tr>
              <td class="text-muted" style="padding:5px 0">Horas trabalhadas</td>
              <td class="text-right" style="padding:5px 0">${Math.floor(resMes.tempoMin / 60)}h ${resMes.tempoMin % 60}min</td>
            </tr>
          </table>
          <div style="margin-top:10px;text-align:right">
            <a href="#" id="linkVerDiario2" style="font-size:12px;color:var(--plum);text-decoration:none;font-weight:500">Ver detalhes financeiros →</a>
          </div>
        </div>
      </div>

      <!-- Amanhã (bônus) -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Agenda de Amanha</span>
        </div>
        <div class="card-body" style="padding:14px 18px">
          ${agendaAmanha.length
      ? agendaAmanha.map(a => `
              <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px">
                <span class="badge badge-plum" style="min-width:46px;text-align:center;font-weight:600">${a.horario || '—'}</span>
                <span style="flex:1;color:var(--txt-dark)">${a.cliente || '—'}</span>
                <span style="font-size:11px;color:var(--txt-muted)">${a.servicoNome || ''}</span>
              </div>`).join('')
      : `<div style="text-align:center;padding:20px 0;color:var(--txt-muted);font-size:13px">
                 Nenhum agendamento para amanha
               </div>`
    }
          <a href="#" id="linkVerAgenda2" style="font-size:12px;color:var(--plum);display:block;margin-top:8px;text-decoration:none;font-weight:500">Ver agenda completa →</a>
        </div>
      </div>
    </div>
  `;

  // ── Event listeners dos links ──────────────────────
  const nav = (page) => document.querySelector(`[data-page="${page}"]`)?.click();

  container.getElementById?.('linkVerAgenda')?.addEventListener('click', e => { e.preventDefault(); nav('agenda'); });
  container.querySelector?.('#linkVerAgenda')?.addEventListener('click', e => { e.preventDefault(); nav('agenda'); });
  container.querySelector?.('#linkVerAgenda2')?.addEventListener('click', e => { e.preventDefault(); nav('agenda'); });
  container.querySelector?.('#linkVerDiario')?.addEventListener('click', e => { e.preventDefault(); nav('diario'); });
  container.querySelector?.('#linkVerDiario2')?.addEventListener('click', e => { e.preventDefault(); nav('diario'); });
  container.querySelector?.('#linkVerEstoque')?.addEventListener('click', e => { e.preventDefault(); nav('servicos'); });
  container.querySelector?.('#linkVerCRM')?.addEventListener('click', e => { e.preventDefault(); nav('clientes'); });


  // ── Onboarding (primeiro acesso) ───────────────────
  setTimeout(() => checkOnboarding(), 600);
}
