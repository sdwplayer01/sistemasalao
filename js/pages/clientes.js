// ═══════════════════════════════════════════════════════
// pages/clientes.js — CRM de Clientes (v2.2)
// Rota própria: indexa nomes do Diário + Agenda,
// exibe tabela analítica e modal de perfil completo.
// ═══════════════════════════════════════════════════════
import { Clientes, Diario, Agenda, Config } from '../storage.js';
import { R$, fmtData, toast, openModal, closeModal, emptyState } from '../utils.js';

let _filtroNome = '';

export function renderClientes(container) {
  // Indexa automaticamente todos os clientes conhecidos
  Clientes.syncFromDiarioAgenda();

  const cfg    = Config.get();
  const todos  = Clientes.getAll();

  container.innerHTML = `
    <div class="section-title">CRM de Clientes</div>
    <div class="section-sub">Histórico, ticket médio e observações técnicas por cliente.</div>

    <div class="action-bar">
      <input type="text" id="crmBusca" placeholder="🔍 Buscar cliente pelo nome..."
        style="max-width:280px" value="${_filtroNome}" />
      <span class="badge badge-plum" style="margin-left:auto">${todos.length} cliente${todos.length!==1?'s':''} indexado${todos.length!==1?'s':''}</span>
    </div>

    <div id="crmTabela"></div>
  `;

  document.getElementById('crmBusca').oninput = e => {
    _filtroNome = e.target.value;
    renderTabela(container, cfg);
  };

  renderTabela(container, cfg);
}

function renderTabela(container, cfg) {
  const tabelaEl = document.getElementById('crmTabela');
  if (!tabelaEl) return;

  let clientes = Clientes.getAll();

  if (_filtroNome.trim()) {
    const busca = _filtroNome.trim().toLowerCase();
    clientes = clientes.filter(c => (c.nome||'').toLowerCase().includes(busca));
  }

  if (!clientes.length) {
    tabelaEl.innerHTML = emptyState(
      _filtroNome
        ? `Nenhuma cliente encontrada para "${_filtroNome}".`
        : 'Nenhuma cliente indexada ainda. Registre atendimentos no Diário para ver o histórico aqui.'
    );
    return;
  }

  // Calcula stats para cada cliente (dados derivados, não persistidos)
  const rows = clientes.map(c => {
    const stats = Clientes.calcStats(c.nome);
    return { ...c, stats };
  });

  // Ordena por faturamento total decrescente
  rows.sort((a,b) => b.stats.fat - a.stats.fat);

  tabelaEl.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nome da Cliente</th>
            <th class="td-center">Visitas</th>
            <th class="td-right" style="color:var(--txt-green)">Fat. Total</th>
            <th class="td-right">Ticket Médio</th>
            <th class="td-center">Última Visita</th>
            <th class="td-center">1ª Visita</th>
            <th>Obs. Técnicas</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((c, i) => {
            const s = c.stats;
            const temObs = c.obs && c.obs.trim();
            const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
            return `<tr>
              <td class="fw-600">
                ${rankIcon ? `<span style="margin-right:4px">${rankIcon}</span>` : ''}
                <button class="cliente-link" data-nome="${c.nome}">${c.nome}</button>
              </td>
              <td class="td-center td-mono">${s.qtdTotal || '—'}</td>
              <td class="td-right td-mono fw-600" style="color:${s.fat>0?'var(--txt-green)':'var(--txt-muted)'}">
                ${s.fat > 0 ? R$(s.fat) : '—'}
              </td>
              <td class="td-right td-mono">${s.ticket > 0 ? R$(s.ticket) : '—'}</td>
              <td class="td-center text-muted" style="font-size:12px">${fmtData(s.ultimaVisita) || '—'}</td>
              <td class="td-center text-muted" style="font-size:12px">${fmtData(s.primeiraVisita) || '—'}</td>
              <td style="max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px">
                ${temObs
                  ? `<span class="text-muted" title="${c.obs}">📋 ${c.obs}</span>`
                  : `<span class="text-muted" style="font-style:italic;font-size:11px">Sem observações</span>`}
              </td>
              <td>
                <button class="btn btn-sm btn-secondary crm-abrir" data-nome="${c.nome}">Ver perfil</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Handlers — clicar no nome OU no botão "Ver perfil"
  tabelaEl.querySelectorAll('.cliente-link, .crm-abrir').forEach(btn => {
    btn.onclick = () => abrirPerfilModal(btn.dataset.nome, cfg, () => renderTabela(container, cfg));
  });
}

// ── Modal de perfil completo ────────────────────────────
function abrirPerfilModal(nome, cfg, onSave) {
  Clientes.syncFromDiarioAgenda();
  const cliente = Clientes.getByNome(nome) || { nome, obs: '' };
  const stats   = Clientes.calcStats(nome);

  // Serviços mais frequentes
  const freq = {};
  stats.registros.forEach(r => {
    const k = r.servicoNome || r.produtoNome || '?';
    freq[k] = (freq[k] || 0) + (parseInt(r.qtd) || 1);
  });
  const topServicos = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,3);

  // Timeline completa
  const timelineHTML = stats.timeline.map(t => {
    const origem = t._origem === 'diario'
      ? `<span class="badge badge-green" style="font-size:10px">✓</span>`
      : `<span class="badge badge-plum" style="font-size:10px">📅</span>`;
    const item = t._origem === 'diario'
      ? (t.servicoNome || t.produtoNome || '—')
      : (t.servicoNome || `${t.horario||''} ${t.obs||''}`.trim() || 'Agendamento');
    const valor = t.precoCobrado
      ? `<span style="color:var(--txt-green);font-weight:600;white-space:nowrap">${R$(parseFloat(t.precoCobrado)*(parseInt(t.qtd)||1))}</span>`
      : (t.status ? `<span class="text-muted" style="font-size:11px">${t.status}</span>` : '');
    const prof = t.profissional
      ? `<span class="text-muted" style="font-size:11px"> · ${t.profissional}</span>`
      : '';
    return `
      <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px">
        ${origem}
        <span style="color:var(--txt-muted);min-width:72px;font-size:12px">${fmtData(t.data)}</span>
        <span style="flex:1">${item}${prof}</span>
        ${valor}
      </div>`;
  }).join('');

  const body = `
    <!-- Stats rápidos -->
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px">
      <div class="kpi-card plum" style="padding:12px 14px">
        <div class="kpi-label">Total de Visitas</div>
        <div class="kpi-value" style="font-size:24px">${stats.qtdTotal || 0}</div>
      </div>
      <div class="kpi-card green" style="padding:12px 14px">
        <div class="kpi-label">Ticket Médio</div>
        <div class="kpi-value" style="font-size:24px">${R$(stats.ticket)}</div>
      </div>
      <div class="kpi-card" style="padding:12px 14px;border-left:3px solid var(--txt-green)">
        <div class="kpi-label">Faturamento Total</div>
        <div class="kpi-value" style="font-size:20px;color:var(--txt-green)">${R$(stats.fat)}</div>
      </div>
      <div class="kpi-card" style="padding:12px 14px;border-left:3px solid var(--plum-mid)">
        <div class="kpi-label">Última Visita</div>
        <div class="kpi-value" style="font-size:18px">${fmtData(stats.ultimaVisita) || '—'}</div>
      </div>
    </div>

    ${topServicos.length ? `
    <!-- Serviços favoritos -->
    <div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:600;color:var(--txt-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">
        Serviços / Produtos mais frequentes
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${topServicos.map(([k,v]) => `
          <div style="background:var(--lavender);border-radius:8px;padding:6px 12px;font-size:12px">
            <span class="fw-600">${k}</span>
            <span class="text-muted" style="margin-left:4px">${v}×</span>
          </div>`).join('')}
      </div>
    </div>` : ''}

    <!-- Observações técnicas -->
    <div class="form-group" style="margin-bottom:12px">
      <label>📋 Observações Técnicas</label>
      <textarea id="crm-obs-full" rows="3"
        placeholder="Ex: Coloração 7.1 com ox 20. Alergia a amônia. Prefere franja aberta.">${cliente.obs || ''}</textarea>
    </div>
    <button class="btn btn-primary btn-sm" id="crm-salvar-obs-full" style="margin-bottom:20px">Salvar Observações</button>

    <!-- Timeline -->
    <div style="font-size:11px;font-weight:600;color:var(--txt-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">
      Timeline de Atendimentos (${stats.timeline.length})
    </div>
    <div style="max-height:280px;overflow-y:auto">
      ${timelineHTML || '<p class="text-muted" style="font-size:13px;padding:8px 0">Nenhum registro encontrado.</p>'}
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary" id="crm-fechar-full">Fechar</button>
  `;

  openModal(`✦ ${nome}`, body, footer);

  document.getElementById('crm-fechar-full').onclick = closeModal;
  document.getElementById('crm-salvar-obs-full').onclick = () => {
    const obs = document.getElementById('crm-obs-full').value.trim();
    Clientes.upsert(nome, { obs });
    toast('Observações salvas! ✓', 'success');
    document.getElementById('crm-salvar-obs-full').textContent = 'Salvo ✓';
    if (onSave) onSave();
  };
}

// Retorna clientes ausentes há mais de 30 dias (para Dashboard CRM)
export function getRetencao30dias() {
  Clientes.syncFromDiarioAgenda();
  const todos = Clientes.getAll();
  const hojeTs = new Date().getTime();
  
  const ausentes = [];
  for (const c of todos) {
    const stats = Clientes.calcStats(c.nome);
    if (stats.ultimaVisita) {
      const parts = stats.ultimaVisita.split('-');
      // YYYY-MM-DD
      const ultTs = new Date(parts[0], parts[1]-1, parts[2]).getTime();
      const dias = Math.floor((hojeTs - ultTs) / (1000 * 60 * 60 * 24));
      if (dias > 30) {
        ausentes.push({ nome: c.nome, dias, tel: c.telefone || stats.registros.find(r=>r.telefone)?.telefone });
      }
    }
  }
  return ausentes.sort((a,b) => b.dias - a.dias);
}
