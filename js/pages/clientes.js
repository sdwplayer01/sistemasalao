// ═══════════════════════════════════════════════════════
// pages/clientes.js — CRM de Clientes (v3.0)
// Item 6: segmentação visual por comportamento
//
// MUDANÇAS:
//   - Filtro rápido por segmento na action bar
//   - Badge de segmento em cada linha
//   - calcSegmento() com thresholds configuráveis no topo
//   - Ordenação inteligente: ausentes/inativas sobem
//
// SEM MUDANÇA:
//   - Lógica de storage, modal de perfil, getRetencao30dias
// ═══════════════════════════════════════════════════════
import { Clientes, Config } from '../storage.js';
import { R$, fmtData, toast, openModal, closeModal, emptyState } from '../utils.js';

// ── Thresholds de segmentação (ajuste aqui se necessário)
const SEG = {
  NOVA_DIAS:    60,   // dias desde 1ª visita → Nova
  NOVA_MAX_VIS: 2,    // máximo de visitas para ser Nova
  FIEL_VIS:     5,    // mínimo de visitas para Fiel
  FIEL_AUS:     45,   // máximo dias ausente para Fiel
  AUSENTE_MIN:  31,   // início de Ausente (dias)
  INATIVA_MIN:  90,   // início de Inativa (dias)
};

const SEG_CFG = {
  nova:    { label: 'Nova',     badge: 'badge-blue',  ordem: 2 },
  fiel:    { label: 'Fiel',     badge: 'badge-green', ordem: 1 },
  regular: { label: 'Regular',  badge: 'badge-plum',  ordem: 3 },
  ausente: { label: 'Ausente',  badge: 'badge-warn',  ordem: 4 },
  inativa: { label: 'Inativa',  badge: 'badge-rose',  ordem: 5 },
};

function calcSegmento(stats) {
  if (!stats.ultimaVisita) return 'regular';
  const hoje   = Date.now();
  const ultTs  = new Date(stats.ultimaVisita + 'T12:00:00').getTime();
  const primTs = stats.primeiraVisita
    ? new Date(stats.primeiraVisita + 'T12:00:00').getTime()
    : null;
  const diasAus  = Math.floor((hoje - ultTs) / 86400000);
  const diasCad  = primTs ? Math.floor((hoje - primTs) / 86400000) : 999;

  if (diasAus > SEG.INATIVA_MIN)                                    return 'inativa';
  if (diasAus >= SEG.AUSENTE_MIN)                                    return 'ausente';
  if (stats.qtdTotal >= SEG.FIEL_VIS && diasAus <= SEG.FIEL_AUS)   return 'fiel';
  if (diasCad <= SEG.NOVA_DIAS && stats.qtdTotal <= SEG.NOVA_MAX_VIS) return 'nova';
  return 'regular';
}

let _filtroNome    = '';
let _filtroSeg     = '';

export function renderClientes(container) {
  Clientes.syncFromDiarioAgenda();
  const cfg   = Config.get();
  const todos = Clientes.getAll();

  // Pré-calcula segmentos para os contadores dos filtros
  const cnt = { nova: 0, fiel: 0, regular: 0, ausente: 0, inativa: 0 };
  todos.forEach(c => { cnt[calcSegmento(Clientes.calcStats(c.nome))]++; });

  container.innerHTML = `
    <div class="section-title">CRM de Clientes</div>
    <div class="section-sub">Histórico e status de cada cliente.</div>

    <!-- Filtros rápidos de segmento -->
    <div class="crm-segmentos" id="crmSegmentos">
      <button class="crm-seg-btn ${_filtroSeg===''?'active':''}" data-seg="">
        Todos <span class="crm-seg-count">${todos.length}</span>
      </button>
      ${Object.entries(SEG_CFG).map(([key, cfg]) => `
        <button class="crm-seg-btn ${key} ${_filtroSeg===key?'active':''}" data-seg="${key}">
          ${cfg.label} <span class="crm-seg-count">${cnt[key]||0}</span>
        </button>
      `).join('')}
    </div>

    <div class="action-bar" style="margin-top:12px">
      <input type="text" id="crmBusca" placeholder="Buscar pelo nome..."
        style="max-width:240px" value="${_filtroNome}" />
      <span class="badge badge-plum" style="margin-left:auto">
        ${todos.length} cliente${todos.length!==1?'s':''}
      </span>
      <button class="btn btn-primary btn-sm" id="btnNovoCliente">
        <i data-lucide="plus" style="width:14px;height:14px;margin-right:4px"></i> Novo
      </button>
    </div>

    <div id="crmTabela"></div>
  `;

  document.querySelectorAll('.crm-seg-btn').forEach(btn => {
    btn.onclick = () => {
      _filtroSeg = btn.dataset.seg;
      document.querySelectorAll('.crm-seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTabela(container, cfg);
    };
  });

  document.getElementById('crmBusca').oninput = e => {
    _filtroNome = e.target.value;
    renderTabela(container, cfg);
  };

  document.getElementById('btnNovoCliente').onclick = () => abrirModalNovoCliente(container, cfg);

  renderTabela(container, cfg);
}

function abrirModalNovoCliente(container, cfg) {
  const body = `
    <div class="form-group">
      <label>Nome da Cliente *</label>
      <input type="text" id="novoCliNome" placeholder="Ex: Maria Eduarda" autocomplete="off" />
    </div>
    <div class="form-group">
      <label>WhatsApp / Telefone</label>
      <input type="text" id="novoCliTel" placeholder="(00) 00000-0000" />
    </div>
    <div class="form-group">
      <label>Observações Técnicas</label>
      <textarea id="novoCliObs" rows="3" placeholder="Alergias, preferências..."></textarea>
    </div>
  `;
  const footer = `
    <button class="btn btn-secondary" id="btnFecharNovoCrm">Cancelar</button>
    <button class="btn btn-primary" id="btnSalvarNovoCrm">Salvar</button>
  `;
  openModal('Novo Cliente Manual', body, footer);
  document.getElementById('btnFecharNovoCrm').onclick = closeModal;
  document.getElementById('btnSalvarNovoCrm').onclick = () => {
    const nome = document.getElementById('novoCliNome').value.trim();
    if (!nome) return toast('Nome é obrigatório.', 'error');
    Clientes.upsert(nome, {
      telefone: document.getElementById('novoCliTel').value.trim(),
      obs:      document.getElementById('novoCliObs').value.trim(),
    });
    toast('Cliente salva!', 'success');
    closeModal();
    renderClientes(container);
    if (window.lucide) window.lucide.createIcons();
  };
}

function renderTabela(container, cfg) {
  const tabelaEl = document.getElementById('crmTabela');
  if (!tabelaEl) return;

  let clientes = Clientes.getAll();

  if (_filtroNome.trim()) {
    const b = _filtroNome.trim().toLowerCase();
    clientes = clientes.filter(c => (c.nome||'').toLowerCase().includes(b));
  }

  if (!clientes.length) {
    tabelaEl.innerHTML = emptyState(
      _filtroNome
        ? `Nenhuma cliente encontrada para "${_filtroNome}".`
        : 'Nenhuma cliente indexada ainda. Registre atendimentos no Diário.'
    );
    return;
  }

  // Calcula stats + segmento para cada cliente
  const rows = clientes.map(c => ({
    ...c,
    stats:    Clientes.calcStats(c.nome),
    segmento: calcSegmento(Clientes.calcStats(c.nome)),
  }));

  // Filtra por segmento se ativo
  const filtradas = _filtroSeg ? rows.filter(r => r.segmento === _filtroSeg) : rows;

  if (!filtradas.length) {
    tabelaEl.innerHTML = emptyState(`Nenhuma cliente no segmento "${SEG_CFG[_filtroSeg]?.label}".`);
    return;
  }

  // Ordenação: sem filtro → por prioridade de ação (ausentes/inativas primeiro)
  //            com filtro → por faturamento decrescente
  if (_filtroSeg) {
    filtradas.sort((a, b) => b.stats.fat - a.stats.fat);
  } else {
    filtradas.sort((a, b) => {
      const oA = SEG_CFG[a.segmento]?.ordem ?? 9;
      const oB = SEG_CFG[b.segmento]?.ordem ?? 9;
      return oA !== oB ? oA - oB : b.stats.fat - a.stats.fat;
    });
  }

  tabelaEl.innerHTML = `
    <div class="table-wrap mobile-reflow">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Status</th>
            <th class="td-center">Visitas</th>
            <th class="td-right">Fat. Total</th>
            <th class="td-right">Ticket</th>
            <th class="td-center">Última Visita</th>
            <th class="td-center">1ª Visita</th>
            <th>Observações</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${filtradas.map((c, i) => {
            const s   = c.stats;
            const seg = SEG_CFG[c.segmento] || SEG_CFG.regular;
            const diasAus = s.ultimaVisita
              ? Math.floor((Date.now() - new Date(s.ultimaVisita+'T12:00:00').getTime()) / 86400000)
              : null;
            const rankIcon = c.segmento === 'fiel' && i < 3 ? ['🥇','🥈','🥉'][i]||'' : '';
            const diasBadge = (c.segmento === 'ausente' || c.segmento === 'inativa') && diasAus
              ? `<span style="font-size:10px;color:var(--txt-muted);margin-left:4px">${diasAus}d</span>`
              : '';
            return `<tr>
              <td data-label="Nome" class="fw-600">
                ${rankIcon?`<span style="margin-right:4px">${rankIcon}</span>`:''}
                <button class="cliente-link" data-nome="${c.nome}">${c.nome}</button>
              </td>
              <td data-label="Status">
                <span class="badge ${seg.badge}">${seg.label}</span>${diasBadge}
              </td>
              <td data-label="Visitas" class="td-center td-mono">${s.qtdTotal||'—'}</td>
              <td data-label="Faturamento" class="td-right td-mono fw-600" style="color:${s.fat>0?'var(--txt-green)':'var(--txt-muted)'}">
                ${s.fat > 0 ? R$(s.fat) : '—'}
              </td>
              <td data-label="Ticket" class="td-right td-mono">${s.ticket>0?R$(s.ticket):'—'}</td>
              <td data-label="Última Visita" class="td-center text-muted" style="font-size:12px">${fmtData(s.ultimaVisita)||'—'}</td>
              <td data-label="1ª Visita" class="td-center text-muted" style="font-size:12px">${fmtData(s.primeiraVisita)||'—'}</td>
              <td data-label="Obs." style="max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px">
                ${c.obs?.trim()
                  ? `<span class="text-muted" title="${c.obs}">📋 ${c.obs}</span>`
                  : `<span class="text-muted" style="font-style:italic;font-size:11px">—</span>`}
              </td>
              <td class="td-actions">
                <button class="btn btn-sm btn-secondary crm-abrir" data-nome="${c.nome}">Ver perfil</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  tabelaEl.querySelectorAll('.cliente-link, .crm-abrir').forEach(btn => {
    btn.onclick = () => abrirPerfilModal(btn.dataset.nome, cfg, () => renderTabela(container, cfg));
  });
}

// ── Modal de perfil completo — preservado do v2.2 ───────
function abrirPerfilModal(nome, cfg, onSave) {
  Clientes.syncFromDiarioAgenda();
  const cliente = Clientes.getByNome(nome) || { nome, obs: '' };
  const stats   = Clientes.calcStats(nome);
  const seg     = SEG_CFG[calcSegmento(stats)] || SEG_CFG.regular;

  const freq = {};
  stats.registros.forEach(r => {
    const k = r.servicoNome || r.produtoNome || '?';
    freq[k] = (freq[k]||0) + (parseInt(r.qtd)||1);
  });
  const topServicos = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,3);

  const timelineHTML = stats.timeline.map(t => {
    const origem = t._origem === 'diario'
      ? `<span class="badge badge-green" style="font-size:10px">✓</span>`
      : `<span class="badge badge-plum"  style="font-size:10px">📅</span>`;
    const item  = t._origem === 'diario'
      ? (t.servicoNome || t.produtoNome || '—')
      : (t.servicoNome || `${t.horario||''} ${t.obs||''}`.trim() || 'Agendamento');
    const valor = t.precoCobrado
      ? `<span style="color:var(--txt-green);font-weight:600">${R$(parseFloat(t.precoCobrado)*(parseInt(t.qtd)||1))}</span>`
      : (t.status ? `<span class="badge badge-${t.status==='confirmado'?'green':'plum'}" style="font-size:10px">${t.status}</span>` : '');
    const prof  = t.profissional
      ? `<span class="text-muted" style="font-size:11px"> · ${t.profissional}</span>` : '';
    return `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px">
      ${origem}
      <span style="color:var(--txt-muted);min-width:72px;font-size:12px">${fmtData(t.data)}</span>
      <span style="flex:1">${item}${prof}</span>
      ${valor}
    </div>`;
  }).join('');

  const body = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <span class="badge ${seg.badge}" style="font-size:12px;padding:4px 12px">${seg.label}</span>
      ${stats.ultimaVisita
        ? `<span style="font-size:12px;color:var(--txt-muted)">Última visita: ${fmtData(stats.ultimaVisita)}</span>`
        : ''}
    </div>

    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px">
      <div class="kpi-mini-card plum">
        <div class="kpi-label">Visitas</div><div class="kpi-value">${stats.qtdTotal||0}</div>
      </div>
      <div class="kpi-mini-card green">
        <div class="kpi-label">Ticket Médio</div><div class="kpi-value">${R$(stats.ticket)}</div>
      </div>
      <div class="kpi-mini-card green-border">
        <div class="kpi-label">Faturamento Total</div>
        <div class="kpi-value" style="color:var(--txt-green)">${R$(stats.fat)}</div>
      </div>
      <div class="kpi-mini-card plum-mid-border">
        <div class="kpi-label">1ª Visita</div>
        <div class="kpi-value" style="font-size:16px">${fmtData(stats.primeiraVisita)||'—'}</div>
      </div>
    </div>

    ${topServicos.length ? `
      <div style="margin-bottom:16px">
        <div style="font-size:11px;font-weight:600;color:var(--txt-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Mais frequentes</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${topServicos.map(([k,v])=>`
            <div style="background:var(--lavender);border-radius:8px;padding:6px 12px;font-size:12px">
              <span class="fw-600">${k}</span>
              <span class="text-muted" style="margin-left:4px">${v}×</span>
            </div>`).join('')}
        </div>
      </div>` : ''}

    <div class="form-group" style="margin-bottom:12px">
      <label>Observações Técnicas</label>
      <textarea id="crm-obs-full" rows="3"
        placeholder="Ex: Coloração 7.1 com ox 20. Alergia a amônia.">${cliente.obs||''}</textarea>
    </div>
    <button class="btn btn-primary btn-sm" id="crm-salvar-obs-full" style="margin-bottom:20px">
      Salvar Observações
    </button>

    <div style="font-size:11px;font-weight:600;color:var(--txt-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">
      Timeline (${stats.timeline.length})
    </div>
    <div style="max-height:280px;overflow-y:auto">
      ${timelineHTML || '<p class="text-muted" style="font-size:13px;padding:8px 0">Nenhum registro encontrado.</p>'}
    </div>
  `;

  const footer = `<button class="btn btn-secondary" id="crm-fechar-full">Fechar</button>`;
  openModal(`✦ ${nome}`, body, footer);

  document.getElementById('crm-fechar-full').onclick = closeModal;
  document.getElementById('crm-salvar-obs-full').onclick = () => {
    Clientes.upsert(nome, { obs: document.getElementById('crm-obs-full').value.trim() });
    toast('Observações salvas! ✓', 'success');
    document.getElementById('crm-salvar-obs-full').textContent = 'Salvo ✓';
    if (onSave) onSave();
  };
}

// ── getRetencao30dias — exportado para o Dashboard ──────
export function getRetencao30dias() {
  Clientes.syncFromDiarioAgenda();
  const hojeTs  = Date.now();
  const ausentes = [];
  for (const c of Clientes.getAll()) {
    const stats = Clientes.calcStats(c.nome);
    if (stats.ultimaVisita) {
      const p    = stats.ultimaVisita.split('-');
      const ultTs= new Date(p[0], p[1]-1, p[2]).getTime();
      const dias = Math.floor((hojeTs - ultTs) / 86400000);
      if (dias > 30) {
        ausentes.push({
          nome: c.nome, dias,
          tel:  c.telefone || stats.registros.find(r => r.telefone)?.telefone,
        });
      }
    }
  }
  return ausentes.sort((a,b) => b.dias - a.dias);
}
