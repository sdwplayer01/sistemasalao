// ═══════════════════════════════════════════════════════
// pages/servicos.js
// ═══════════════════════════════════════════════════════
import { Servicos, Receitas, Config } from '../storage.js';
import { R$, toast, openModal, closeModal, emptyState } from '../utils.js';

export function renderServicos(container) {
  const cfg  = Config.get();
  const svcs = Servicos.getAll();
  const cfr  = Receitas.mediaCustoFixoReal();
  const custoFixoPorCliente = cfg.atendMedios > 0 ? cfr / cfg.atendMedios : 0;

  container.innerHTML = `
    <div class="section-title">Tabela de Serviços</div>
    <div class="section-sub">Precificação automática com custo de produto, tempo e rateio de custo fixo</div>

    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;background:var(--lavender);padding:12px 16px;border-radius:var(--radius);margin-bottom:20px;border:1px solid var(--border)">
      <span style="font-size:12px;color:var(--plum)">⚙ Parâmetros:</span>
      <span class="badge badge-plum">Hora: ${R$(cfg.valorHora)}</span>
      <span class="badge badge-plum">Custo Fixo/Cliente: ${R$(custoFixoPorCliente)}</span>
      <span class="badge badge-plum">Atend. médios: ${cfg.atendMedios}/mês</span>
      <span class="badge badge-rose">×${cfg.multMin} Mín · ×${cfg.multIdeal} Ideal · ×${cfg.multPrem} Prem</span>
      <a href="#" id="linkAjustarParams" style="font-size:12px;color:var(--plum);margin-left:auto">Ajustar em Configurações →</a>
    </div>

    <div class="action-bar">
      <button class="btn btn-primary" id="btnNovoSvc">+ Novo Serviço</button>
    </div>

    <div id="svcsGrid"></div>
  `;

  document.getElementById('btnNovoSvc').onclick = () => abrirFormSvc(null, cfg, custoFixoPorCliente, () => renderServicos(container));
  document.getElementById('linkAjustarParams').onclick = e => {
    e.preventDefault();
    document.querySelector('[data-page="configuracoes"]').click();
  };

  renderGrid(container, svcs, cfg, custoFixoPorCliente);
}

function renderGrid(container, svcs, cfg, custoFixoPorCliente) {
  const gridEl = document.getElementById('svcsGrid');
  if (!gridEl) return;

  if (!svcs.length) {
    gridEl.innerHTML = emptyState('Nenhum serviço cadastrado. Clique em "+ Novo Serviço" para começar.');
    return;
  }

  gridEl.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nome do Serviço</th>
            <th>Categoria</th>
            <th class="td-center">Tempo</th>
            <th class="td-right">C. Produto</th>
            <th class="td-right">C. Tempo</th>
            <th class="td-right">C. Fixo</th>
            <th class="td-right">C. Total</th>
            <th class="td-right" style="background:#7B1414">Mín ×${cfg.multMin}</th>
            <th class="td-right" style="background:#1B5E20">Ideal ×${cfg.multIdeal}</th>
            <th class="td-right" style="background:#856404">Prem ×${cfg.multPrem}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${svcs.map(s => {
            const p = Servicos.calcPrecos(s, cfg, custoFixoPorCliente);
            return `<tr>
              <td class="fw-600">${s.nome}</td>
              <td><span class="badge badge-plum">${s.categoria || '—'}</span></td>
              <td class="td-center">${s.tempoMin || 0}min</td>
              <td class="td-right td-mono">${R$(p.custoProduto)}</td>
              <td class="td-right td-mono">${R$(p.custoTempo)}</td>
              <td class="td-right td-mono">${R$(p.custoFixo)}</td>
              <td class="td-right td-mono fw-600">${R$(p.custoTotal)}</td>
              <td class="td-right td-mono" style="background:#FEE2E2;color:var(--txt-red);font-weight:600">${R$(p.precoMin)}</td>
              <td class="td-right td-mono" style="background:var(--sage);color:var(--txt-green);font-weight:700">${R$(p.precoIdeal)}</td>
              <td class="td-right td-mono" style="background:#FFF3CD;color:#856404;font-weight:600">${R$(p.precoPrem)}</td>
              <td style="white-space:nowrap">
                <button class="btn btn-sm btn-secondary" data-edit="${s.id}">✎</button>
                <button class="btn btn-sm btn-danger" data-del="${s.id}">×</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  gridEl.querySelectorAll('[data-edit]').forEach(btn => {
    btn.onclick = () => {
      const svc = Servicos.byId(parseInt(btn.dataset.edit));
      if (svc) abrirFormSvc(svc, cfg, custoFixoPorCliente, () => renderServicos(container));
    };
  });

  gridEl.querySelectorAll('[data-del]').forEach(btn => {
    btn.onclick = () => {
      if (confirm('Remover este serviço?')) {
        Servicos.remove(parseInt(btn.dataset.del));
        renderServicos(container);
        toast('Serviço removido.', 'default');
      }
    };
  });
}

function abrirFormSvc(svc, cfg, custoFixoPorCliente, onSave) {
  const s = svc || {};
  const cats = cfg.categorias || [];
  const profs = cfg.profissionais || [];

  const calcPreview = () => {
    const tempo = parseFloat(document.getElementById('sv-tempo')?.value) || 0;
    const custo = parseFloat(document.getElementById('sv-cprod')?.value) || 0;
    const p = Servicos.calcPrecos(
      { tempoMin: tempo, custoProduto: custo },
      cfg, custoFixoPorCliente
    );
    const prevEl = document.getElementById('sv-preview');
    if (prevEl) prevEl.innerHTML = `
      <div class="preco-grid" style="margin-top:12px">
        <div class="preco-box preco-min">
          <div class="preco-label">Mínimo</div>
          <div class="preco-val">${R$(p.precoMin)}</div>
        </div>
        <div class="preco-box preco-ideal">
          <div class="preco-label">Ideal</div>
          <div class="preco-val">${R$(p.precoIdeal)}</div>
        </div>
        <div class="preco-box preco-prem">
          <div class="preco-label">Premium</div>
          <div class="preco-val">${R$(p.precoPrem)}</div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--txt-muted);margin-top:8px;text-align:center">
        Custo total: ${R$(p.custoTotal)} (produto + tempo + fixo)
      </div>
    `;
  };

  const body = `
    <div class="form-grid cols-2">
      <div class="form-group full">
        <label>Nome do Serviço</label>
        <input type="text" id="sv-nome" value="${s.nome || ''}" placeholder="Ex: Corte Feminino" />
      </div>
      <div class="form-group">
        <label>Categoria</label>
        <select id="sv-cat">
          <option value="">— Selecione —</option>
          ${cats.map(c => `<option value="${c}" ${s.categoria===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Profissional Padrão</label>
        <select id="sv-prof">
          <option value="">— Selecione —</option>
          ${profs.map(p => `<option value="${p}" ${s.profissional===p?'selected':''}>${p}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Tempo estimado (minutos)</label>
        <input type="number" id="sv-tempo" value="${s.tempoMin || ''}" min="1" placeholder="60" />
      </div>
      <div class="form-group">
        <label>Custo do Produto (R$)</label>
        <input type="number" id="sv-cprod" value="${s.custoProduto || ''}" min="0" step="0.01" placeholder="0.00" />
      </div>
    </div>
    <div id="sv-preview"></div>
  `;

  const footer = `
    <button class="btn btn-secondary" id="sv-cancel">Cancelar</button>
    <button class="btn btn-primary" id="sv-save">${svc ? 'Salvar alterações' : 'Adicionar serviço'}</button>
  `;

  openModal(svc ? 'Editar Serviço' : 'Novo Serviço', body, footer);

  document.getElementById('sv-tempo').oninput = calcPreview;
  document.getElementById('sv-cprod').oninput = calcPreview;
  calcPreview();

  document.getElementById('sv-cancel').onclick = closeModal;
  document.getElementById('sv-save').onclick = () => {
    const nome = document.getElementById('sv-nome').value.trim();
    if (!nome) return toast('Informe o nome do serviço.', 'error');

    const data = {
      nome,
      categoria:    document.getElementById('sv-cat').value,
      profissional: document.getElementById('sv-prof').value,
      tempoMin:     parseFloat(document.getElementById('sv-tempo').value) || 0,
      custoProduto: parseFloat(document.getElementById('sv-cprod').value) || 0,
    };

    if (svc) Servicos.update(svc.id, data);
    else     Servicos.add(data);

    closeModal();
    toast(svc ? 'Serviço atualizado! ✓' : 'Serviço adicionado! ✓', 'success');
    onSave();
  };
}
