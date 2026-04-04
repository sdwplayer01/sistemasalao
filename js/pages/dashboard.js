// dashboard.js — Integração com CRM de Clientes

import { Config, Diario, Servicos, Custos, Receitas, Agenda, Produtos, MESES } from '../storage.js';
import { R$, pct, num, mesKey, fmtData, linkWA, formatarTelefone } from '../utils.js';
import { getRetencao30dias } from './clientes.js';

export function renderDashboard(container) {
  // getRetencao30dias já retorna contagem por segmento + total + taxa
  const segCount = getRetencao30dias();
  const { total: totalClientes, taxa } = segCount;

  // Conic-gradient para o gráfico de pizza
  const pFiel = totalClientes > 0 ? (segCount.fiel / totalClientes) * 100 : 0;
  const pNova = totalClientes > 0 ? (segCount.nova / totalClientes) * 100 : 0;
  const pAusente = totalClientes > 0 ? (segCount.ausente / totalClientes) * 100 : 0;

  const chartStyle = `
    background: conic-gradient(
      var(--txt-green) 0% ${pFiel}%,
      var(--plum) ${pFiel}% ${pFiel + pNova}%,
      var(--txt-red) ${pFiel + pNova}% ${pFiel + pNova + pAusente}%,
      var(--bg-soft) ${pFiel + pNova + pAusente}% 100%
    );
  `;

  container.innerHTML = `
    <div class="section-title">Visão Geral</div>

    <div class="grid-dashboard">
      <div class="card shadow-sm">
        <div class="card-header"><span class="card-title">✦ Saúde da Carteira</span></div>
        <div class="card-body d-flex align-center">

          <div class="chart-pizza" style="${chartStyle} width:120px; height:120px; border-radius:50%;"></div>

          <div class="chart-legend" style="margin-left:20px; flex:1;">
            <div class="legend-item"><span class="dot dot-green"></span> Fiéis: <strong>${segCount.fiel}</strong></div>
            <div class="legend-item"><span class="dot dot-plum"></span> Novas: <strong>${segCount.nova}</strong></div>
            <div class="legend-item"><span class="dot dot-red"></span> Ausentes: <strong>${segCount.ausente}</strong></div>
            <div class="legend-item"><span class="dot dot-gray"></span> Inativas: <strong>${segCount.inativa}</strong></div>
          </div>

        </div>
        <div class="card-footer" style="display:flex; justify-content:space-between; align-items:center;">
          <span class="text-muted" style="font-size:12px">
            Retenção 30 dias: <strong class="text-green">${taxa}%</strong> (${totalClientes} clientes)
          </span>
          <a href="#" id="linkVerCRM" class="text-plum fw-500">Ver detalhes no CRM →</a>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#linkVerCRM')?.addEventListener('click', e => {
    e.preventDefault();
    window.__navigateTo('clientes');
  });
}