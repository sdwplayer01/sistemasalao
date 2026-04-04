// dashboard.js — Integração com CRM de Clientes

import { Config, Diario, Servicos, Custos, Receitas, Agenda, Produtos, MESES } from '../storage.js';
import { R$, pct, num, mesKey, fmtData, linkWA, formatarTelefone } from '../utils.js';
import { getRetencao30dias } from './clientes.js'; // Certifique-se que o path está correto

export function renderDashboard(container) {
  // 1. getRetencao30dias retorna: { taxa: number, qtd: number }
  const { taxa, qtd } = getRetencao30dias();

  // 2. Contagem por segmento para o gráfico de pizza
  //    Reutiliza a lógica de calcSegmento localmente (espelho de clientes.js)
  let segCount = { fiel: 0, nova: 0, regular: 0, ausente: 0, inativa: 0 };

  const calcSegmento = (stats) => {
    if (!stats.ultimaVisita) return 'regular';
    const diasAus = Math.floor((Date.now() - new Date(stats.ultimaVisita + 'T12:00:00').getTime()) / 86400000);
    const diasCad = stats.primeiraVisita
      ? Math.floor((Date.now() - new Date(stats.primeiraVisita + 'T12:00:00').getTime()) / 86400000)
      : 999;
    if (diasAus > 90) return 'inativa';
    if (diasAus >= 31) return 'ausente';
    if (stats.qtdTotal >= 5 && diasAus <= 45) return 'fiel';
    if (diasCad <= 60 && stats.qtdTotal <= 2) return 'nova';
    return 'regular';
  };

  // Importação dinâmica do storage via window para evitar dependência circular
  try {
    const Clientes = window.__Clientes;
    if (Clientes) {
      Clientes.syncFromDiarioAgenda();
      Clientes.getAll().forEach(c => {
        const seg = calcSegmento(Clientes.calcStats(c.nome));
        segCount[seg] = (segCount[seg] || 0) + 1;
      });
    }
  } catch (e) { /* storage indisponível */ }

  const totalClientes = Object.values(segCount).reduce((a, b) => a + b, 0);

  // 3. Conic-gradient para o gráfico de pizza
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
          
          <div class="chart-pizza" style="${chartStyle} width: 120px; height: 120px; border-radius: 50%;"></div>
          
          <div class="chart-legend" style="margin-left: 20px; flex: 1;">
            <div class="legend-item"><span class="dot dot-green"></span> Fiéis: <strong>${segCount.fiel}</strong></div>
            <div class="legend-item"><span class="dot dot-plum"></span> Novas: <strong>${segCount.nova}</strong></div>
            <div class="legend-item"><span class="dot dot-red"></span> Ausentes: <strong>${segCount.ausente}</strong></div>
            <div class="legend-item"><span class="dot dot-gray"></span> Inativas: <strong>${segCount.inativa}</strong></div>
          </div>

        </div>
        <div class="card-footer" style="display:flex; justify-content:space-between; align-items:center;">
          <span class="text-muted" style="font-size:12px">
            Retenção 30 dias: <strong class="text-green">${taxa}%</strong> (${qtd} clientes)
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