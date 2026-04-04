// ═══════════════════════════════════════════════════════
// pages/clientes.js — CRM de Clientes Otimizado v3.2
// ═══════════════════════════════════════════════════════
import { Clientes, Config } from '../storage.js';
import { R$, fmtData, toast, openModal, closeModal, emptyState, applyPhoneMask, limparTelefone, initIcons } from '../utils.js';
import { sectionHeader, statRow, timelineList } from '../ui.js';

const SEG_CFG = {
  nova: { label: 'Nova', badge: 'badge-blue', ordem: 2 },
  fiel: { label: 'Fiel', badge: 'badge-green', ordem: 1 },
  regular: { label: 'Regular', badge: 'badge-plum', ordem: 3 },
  ausente: { label: 'Ausente', badge: 'badge-warn', ordem: 4 },
  inativa: { label: 'Inativa', badge: 'badge-rose', ordem: 5 },
};

let _filtroNome = '';
let _filtroSeg = '';

function calcSegmento(stats) {
  if (!stats.ultimaVisita) return 'regular';
  const diasAus = Math.floor((Date.now() - new Date(stats.ultimaVisita + 'T12:00:00').getTime()) / 86400000);
  const diasCad = stats.primeiraVisita ? Math.floor((Date.now() - new Date(stats.primeiraVisita + 'T12:00:00').getTime()) / 86400000) : 999;

  if (diasAus > 90) return 'inativa';
  if (diasAus >= 31) return 'ausente';
  if (stats.qtdTotal >= 5 && diasAus <= 45) return 'fiel';
  if (diasCad <= 60 && stats.qtdTotal <= 2) return 'nova';
  return 'regular';
}

export function renderClientes(container) {
  try {
    Clientes.syncFromDiarioAgenda();
  } catch (e) {
    console.warn('syncFromDiarioAgenda falhou:', e?.message || e);
  }
  const todos = Clientes.getAll();

  // Contagem para os botões de filtro superior
  const cnt = { nova: 0, fiel: 0, regular: 0, ausente: 0, inativa: 0 };
  todos.forEach(c => cnt[calcSegmento(Clientes.calcStats(c.nome))]++);

  container.innerHTML = `
    ${sectionHeader('CRM de Clientes', 'Segmentação automática baseada no comportamento de visita.')}

    <div class="crm-segmentos mt-16">
      <button class="crm-seg-btn ${_filtroSeg === '' ? 'active' : ''}" data-seg="">Todos <span class="crm-seg-count">${todos.length}</span></button>
      ${Object.entries(SEG_CFG).map(([k, v]) => `
        <button class="crm-seg-btn ${k} ${_filtroSeg === k ? 'active' : ''}" data-seg="${k}">
          ${v.label} <span class="crm-seg-count">${cnt[k] || 0}</span>
        </button>
      `).join('')}
    </div>

    <div class="action-bar mt-16">
      <div class="search-input-wrapper" style="flex: 1; max-width: 300px;">
        <i data-lucide="search" style="width:16px; position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--txt-muted)"></i>
        <input type="text" id="crmBusca" placeholder="Buscar por nome..." value="${_filtroNome}" style="padding-left:36px" />
      </div>
      <button class="btn btn-primary" id="btnNovoCliente"><i data-lucide="plus"></i> Cadastrar Cliente</button>
    </div>

    <div id="crmTabela" class="mt-16"></div>
  `;

  // Eventos de filtro
  document.querySelectorAll('.crm-seg-btn').forEach(btn => {
    btn.onclick = () => { _filtroSeg = btn.dataset.seg; renderClientes(container); };
  });

  document.getElementById('crmBusca').oninput = e => {
    _filtroNome = e.target.value;
    renderTabela(container);
  };

  document.getElementById('btnNovoCliente').onclick = () => abrirModalNovoCliente(container);

  renderTabela(container);
}

function renderTabela(container) {
  const el = document.getElementById('crmTabela');
  let clientes = Clientes.getAll().map(c => {
    const stats = Clientes.calcStats(c.nome);
    return { ...c, stats, segmento: calcSegmento(stats) };
  });

  if (_filtroNome) clientes = clientes.filter(c => c.nome.toLowerCase().includes(_filtroNome.toLowerCase()));
  if (_filtroSeg) clientes = clientes.filter(c => c.segmento === _filtroSeg);

  if (!clientes.length) {
    el.innerHTML = emptyState('Nenhum cliente encontrado com estes filtros.');
    return;
  }

  // Ordenação: Prioridade para o status (ordem definida no SEG_CFG), depois faturamento
  clientes.sort((a, b) => (SEG_CFG[a.segmento].ordem - SEG_CFG[b.segmento].ordem) || (b.stats.fat - a.stats.fat));

  el.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Status</th>
            <th class="td-center">Visitas</th>
            <th>Faturamento</th>
            <th>Última Visita</th>
            <th class="td-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${clientes.map(c => `
            <tr>
              <td class="fw-600">${c.nome}</td>
              <td><span class="badge ${SEG_CFG[c.segmento].badge}">${SEG_CFG[c.segmento].label}</span></td>
              <td class="td-center">${c.stats.qtdTotal}</td>
              <td class="fw-600 text-green">${R$(c.stats.fat)}</td>
              <td class="text-muted" style="font-size:12px">${fmtData(c.stats.ultimaVisita)}</td>
              <td class="td-right">
                <button class="btn btn-icon-sm btn-secondary" onclick="window.__abrirPerfil('${c.nome}')">
                  <i data-lucide="user"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  window.__abrirPerfil = (nome) => abrirPerfilModal(nome, () => renderClientes(container));
  initIcons();
}

function abrirPerfilModal(nome, onSave) {
  const c = Clientes.getByNome(nome) || { nome, obs: '' };
  const s = Clientes.calcStats(nome);
  const seg = SEG_CFG[calcSegmento(s)];

  const body = `
    <div style="margin-bottom:20px">
       <span class="badge ${seg.badge}" style="font-size:12px; padding:4px 12px">${seg.label}</span>
    </div>

    <div class="grid-cards cols-2 mb-16">
      ${statRow('Faturamento Total', R$(s.fat), 'green')}
      ${statRow('Ticket Médio', R$(s.ticket), 'plum')}
      ${statRow('Total Visitas', s.qtdTotal, 'blue')}
      ${statRow('Última Visita', fmtData(s.ultimaVisita), 'warn')}
    </div>

    <div class="form-group">
      <label>Ficha Técnica / Observações</label>
      <textarea id="cp-obs" rows="4" placeholder="Alergias, fórmulas usadas, preferências...">${c.obs || ''}</textarea>
    </div>

    <div class="divider"></div>
    <div class="section-sub mb-8" style="font-weight:600; color:var(--noir)">Histórico Recente</div>
    <div style="max-height:200px; overflow-y:auto; border:1px solid var(--bg-soft); border-radius:8px">
      ${timelineList(s.timeline, 10)}
    </div>
  `;

  openModal(`Perfil: ${nome}`, body, `
    <button class="btn btn-secondary" onclick="window.__utils.closeModal()">Fechar</button>
    <button class="btn btn-primary" id="btnSalvarObs">Salvar Ficha</button>
  `);

  document.getElementById('btnSalvarObs').onclick = () => {
    Clientes.upsert(nome, { obs: document.getElementById('cp-obs').value.trim() });
    toast('Ficha técnica atualizada!');
    if (onSave) onSave();
  };
}

function abrirModalNovoCliente(container) {
  const body = `
    <div class="form-group"><label>Nome Completo *</label><input type="text" id="nc-nome" autocomplete="off"></div>
    <div class="form-group"><label>WhatsApp</label><input type="text" id="nc-tel" data-phone placeholder="(00) 00000-0000"></div>
    <div class="form-group"><label>Observações Iniciais</label><textarea id="nc-obs" rows="2"></textarea></div>
  `;

  openModal('Novo Cadastro', body, `<button class="btn btn-primary" id="btnSalvarNc">Cadastrar</button>`);
  applyPhoneMask(document.getElementById('modalBody'));

  document.getElementById('btnSalvarNc').onclick = () => {
    const nome = document.getElementById('nc-nome').value.trim();
    if (!nome) return toast('O nome é obrigatório.', 'error');

    Clientes.upsert(nome, {
      telefone: limparTelefone(document.getElementById('nc-tel').value),
      obs: document.getElementById('nc-obs').value.trim()
    });

    closeModal();
    renderClientes(container);
    toast('Cliente cadastrado com sucesso!');
  };
}

// ── getRetencao30dias — Retorna contagem por segmento para o Dashboard ──────
export function getRetencao30dias() {
  try {
    Clientes.syncFromDiarioAgenda();
  } catch (e) {
    console.warn('syncFromDiarioAgenda falhou:', e?.message || e);
  }
  const todos = Clientes.getAll();
  const cnt   = { fiel: 0, nova: 0, regular: 0, ausente: 0, inativa: 0 };

  todos.forEach(c => {
    try {
      const s   = Clientes.calcStats(c.nome);
      const seg = calcSegmento(s);
      cnt[seg]  = (cnt[seg] || 0) + 1;
    } catch (e) {
      // ignora cliente com dados corrompidos
    }
  });

  const total  = todos.length;
  const ativos = total - cnt.inativa;
  const taxa   = total > 0 ? Math.round((ativos / total) * 100) : 0;

  return { ...cnt, total, taxa };
}