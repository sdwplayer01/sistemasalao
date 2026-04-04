// dashboard.js — Integração com CRM de Clientes

import { Config, Diario, Servicos, Custos, Receitas, Agenda, Produtos, MESES } from '../storage.js';
import { R$, pct, num, mesKey, fmtData, linkWA, formatarTelefone } from '../utils.js';
import { getRetencao30dias } from './clientes.js'; // Certifique-se que o path está correto

export function renderDashboard(container) {
  // 1. Recupera os dados processados do CRM
  // A função getRetencao30dias deve retornar algo como: { fiel: 10, nova: 5, ausente: 3, inativa: 2 }
  const statsRetencao = getRetencao30dias();

  const totalClientes = Object.values(statsRetencao).reduce((a, b) => a + b, 0);

  // 2. Lógica de renderização do Gráfico de Pizza (CSS Conic-Gradient)
  // Calculamos as porcentagens para o gradiente
  const pFiel = totalClientes > 0 ? (statsRetencao.fiel / totalClientes) * 100 : 0;
  const pNova = totalClientes > 0 ? (statsRetencao.nova / totalClientes) * 100 : 0;
  const pAusente = totalClientes > 0 ? (statsRetencao.ausente / totalClientes) * 100 : 0;

  // Montagem do background do gráfico (Exemplo usando as cores do seu sistema)
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
          
          <div class="chart-pizza" style="${chartStyle} width: 120px; height: 120px; border-radius: 50%;"></div>
          
          <div class="chart-legend" style="margin-left: 20px; flex: 1;">
            <div class="legend-item"><span class="dot dot-green"></span> Fiéis: <strong>${statsRetencao.fiel}</strong></div>
            <div class="legend-item"><span class="dot dot-plum"></span> Novas: <strong>${statsRetencao.nova}</strong></div>
            <div class="legend-item"><span class="dot dot-red"></span> Ausentes: <strong>${statsRetencao.ausente}</strong></div>
            <div class="legend-item"><span class="dot dot-gray"></span> Inativas: <strong>${statsRetencao.inativa}</strong></div>
          </div>
          
        </div>
        <div class="card-footer">
          <a href="#" id="linkVerCRM" class="text-plum fw-500">Ver detalhes no CRM →</a>
        </div>
      </div>
      
      </div>
  `;

  // Listener para o link do CRM
  container.querySelector('#linkVerCRM')?.addEventListener('click', e => {
    e.preventDefault();
    window.__navigateTo('clientes');
  });
}