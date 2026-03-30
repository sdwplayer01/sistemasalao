// ═══════════════════════════════════════════════════════
// pages/diario.js — Diário de Atendimentos (com receita)
// ═══════════════════════════════════════════════════════
import { Diario, Servicos, Config, MESES } from '../storage.js';
import { R$, pct, fmtData, hoje, diaSemana, formatarTelefone,
         linkWA, limparTelefone, toast, openModal, closeModal, emptyState } from '../utils.js';

let _filtroMes  = '';
let _filtroProf = '';

export function renderDiario(container) {
  const cfg   = Config.get();
  const svcs  = Servicos.getAll();
  const profs = cfg.profissionais || [];
  const formas = cfg.formasPagamento || ['Dinheiro','PIX','Cartão Débito','Cartão Crédito','Transferência'];

  container.innerHTML = `
    <div class="section-title">Diário de Atendimentos</div>
    <div class="section-sub">Registre o atendimento e o valor cobrado — tudo mais é automático.</div>

    <div class="action-bar">
      <button class="btn btn-primary" id="btnNovoAtend">+ Novo Atendimento</button>
      <select id="filtroMes" style="max-width:160px">
        <option value="">Todos os meses</option>
        ${MESES.map((m,i)=>`<option value="${i}">${m}</option>`).join('')}
      </select>
      <select id="filtroProf" style="max-width:160px">
        <option value="">Todas as profissionais</option>
        ${profs.map(p=>`<option value="${p}">${p}</option>`).join('')}
      </select>
    </div>

    <div id="diarioResumo"></div>
    <div id="diarioTabela"></div>
  `;

  document.getElementById('btnNovoAtend').onclick = () =>
    abrirFormAtend(null, svcs, profs, formas, cfg, () => renderDiario(container));
  document.getElementById('filtroMes').onchange   = e => { _filtroMes  = e.target.value; renderTabela(svcs, formas, cfg); };
  document.getElementById('filtroProf').onchange  = e => { _filtroProf = e.target.value; renderTabela(svcs, formas, cfg); };

  renderTabela(svcs, formas, cfg);
}

function renderResumoMes(entries) {
  const resumoEl = document.getElementById('diarioResumo');
  if (!resumoEl || !entries.length) { if(resumoEl) resumoEl.innerHTML=''; return; }

  const atend = entries.reduce((s,e) => s+(parseInt(e.qtd)||1), 0);
  const fat   = entries.reduce((s,e) => s+(parseFloat(e.precoCobrado)||0)*(parseInt(e.qtd)||1), 0);
  const custo = entries.reduce((s,e) => s+(parseFloat(e.custoTotal)||0)*(parseInt(e.qtd)||1), 0);
  const lucro = fat - custo;
  const margem = fat > 0 ? lucro/fat : 0;

  resumoEl.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px">
      <div class="kpi-card plum" style="padding:12px 16px">
        <div class="kpi-label">Atendimentos</div>
        <div class="kpi-value" style="font-size:22px">${atend}</div>
      </div>
      <div class="kpi-card green" style="padding:12px 16px">
        <div class="kpi-label">Faturamento</div>
        <div class="kpi-value" style="font-size:22px">${R$(fat)}</div>
      </div>
      <div class="kpi-card rose" style="padding:12px 16px">
        <div class="kpi-label">Custo Total</div>
        <div class="kpi-value" style="font-size:22px">${R$(custo)}</div>
      </div>
      <div class="kpi-card ${lucro >= 0 ? 'green' : 'warn'}" style="padding:12px 16px">
        <div class="kpi-label">Lucro Estimado</div>
        <div class="kpi-value" style="font-size:22px">${R$(lucro)}</div>
      </div>
      <div class="kpi-card blue" style="padding:12px 16px">
        <div class="kpi-label">Margem</div>
        <div class="kpi-value" style="font-size:22px">${pct(margem)}</div>
      </div>
    </div>
  `;
}

function renderTabela(svcs, formas, cfg) {
  const container = document.getElementById('diarioTabela');
  if (!container) return;

  let entries = Diario.getAll();

  if (_filtroMes !== '') {
    const m = parseInt(_filtroMes);
    entries = entries.filter(e => e.data && new Date(e.data + 'T12:00:00').getMonth() === m);
  }
  if (_filtroProf) {
    entries = entries.filter(e => e.profissional === _filtroProf);
  }

  renderResumoMes(entries);

  if (!entries.length) {
    container.innerHTML = emptyState('Nenhum atendimento registrado. Clique em "+ Novo Atendimento" para começar.');
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Dia</th>
            <th>👤 Cliente</th>
            <th>📱</th>
            <th>Serviço</th>
            <th>Profissional</th>
            <th class="td-center">Qtd</th>
            <th class="td-right">Custo</th>
            <th class="td-right" style="color:var(--txt-green)">Cobrado</th>
            <th class="td-right">Lucro</th>
            <th>Pgto</th>
            <th>Obs.</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${entries.map(e => rowHTML(e, svcs, cfg)).join('')}
        </tbody>
      </table>
    </div>
  `;

  container.querySelectorAll('[data-edit]').forEach(btn => {
    btn.onclick = () => {
      const entry = Diario.getAll().find(e => e.id == btn.dataset.edit);
      if (entry) abrirFormAtend(entry, svcs, cfg.profissionais||[], formas, cfg, () => renderTabela(svcs, formas, cfg));
    };
  });

  container.querySelectorAll('[data-del]').forEach(btn => {
    btn.onclick = () => {
      if (confirm('Remover este atendimento?')) {
        Diario.remove(parseInt(btn.dataset.del));
        renderTabela(svcs, formas, cfg);
        toast('Atendimento removido.', 'default');
      }
    };
  });
}

function rowHTML(e, svcs, cfg) {
  const svc  = svcs.find(s => s.id == e.servicoId);
  const qtd  = parseInt(e.qtd) || 1;
  const tel  = e.telefone ? limparTelefone(e.telefone) : '';
  const url  = tel.length >= 10 ? linkWA(tel) : null;
  const custoT  = (parseFloat(e.custoTotal)||0) * qtd;
  const cobrado = (parseFloat(e.precoCobrado)||0) * qtd;
  const lucro   = cobrado - custoT;

  return `<tr>
    <td>${fmtData(e.data)}</td>
    <td><span class="badge badge-plum">${diaSemana(e.data)}</span></td>
    <td class="fw-600">${e.cliente || '—'}</td>
    <td>${url
      ? `<a class="wa-link" href="${url}" target="_blank" rel="noopener">📱</a>`
      : `<span class="text-muted">—</span>`
    }</td>
    <td>${svc ? svc.nome : (e.servicoNome || '—')}</td>
    <td><span class="badge badge-rose">${e.profissional || '—'}</span></td>
    <td class="td-center">${qtd}</td>
    <td class="td-right td-mono">${R$(custoT)}</td>
    <td class="td-right td-mono fw-600" style="color:var(--txt-green)">${cobrado ? R$(cobrado) : '<span class="text-muted">—</span>'}</td>
    <td class="td-right td-mono fw-600" style="color:${lucro >= 0 ? 'var(--txt-green)' : 'var(--txt-red)'}">${cobrado ? R$(lucro) : '<span class="text-muted">—</span>'}</td>
    <td><span class="badge" style="background:var(--lavender);color:var(--plum);font-size:10px">${e.formaPagamento || '—'}</span></td>
    <td class="text-muted" style="font-size:12px;max-width:100px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.obs || ''}</td>
    <td style="white-space:nowrap">
      <button class="btn btn-sm btn-secondary" data-edit="${e.id}">✎</button>
      <button class="btn btn-sm btn-danger" data-del="${e.id}">×</button>
    </td>
  </tr>`;
}

function abrirFormAtend(entry, svcs, profs, formas, cfg, onSave) {
  const isEdit = !!entry;
  const e = entry || { data: hoje(), qtd: 1 };

  const svcOptions  = svcs.map(s =>
    `<option value="${s.id}" ${e.servicoId == s.id ? 'selected' : ''}>${s.nome}</option>`
  ).join('');
  const profOptions = profs.map(p =>
    `<option value="${p}" ${e.profissional === p ? 'selected' : ''}>${p}</option>`
  ).join('');
  const pgtoOptions = formas.map(f =>
    `<option value="${f}" ${e.formaPagamento === f ? 'selected' : ''}>${f}</option>`
  ).join('');

  const body = `
    <div class="form-grid cols-2">
      <div class="form-group">
        <label>📅 Data</label>
        <input type="date" id="fa-data" value="${e.data || hoje()}" />
      </div>
      <div class="form-group">
        <label>Qtd de Atendimentos</label>
        <input type="number" id="fa-qtd" value="${e.qtd || 1}" min="1" />
      </div>
      <div class="form-group">
        <label>👤 Nome da Cliente</label>
        <input type="text" id="fa-cliente" value="${e.cliente || ''}" placeholder="Nome da cliente" />
      </div>
      <div class="form-group">
        <label>📱 Telefone / WhatsApp</label>
        <input type="text" id="fa-tel" value="${e.telefone || ''}" placeholder="(43) 99999-1234" />
      </div>
      <div class="form-group full">
        <label>✂ Serviço</label>
        <select id="fa-svc">
          <option value="">— Selecione o serviço —</option>
          ${svcOptions}
        </select>
      </div>
      <div class="form-group">
        <label>Categoria (auto)</label>
        <input type="text" id="fa-cat" readonly value="${e.categoria || ''}" />
      </div>
      <div class="form-group">
        <label>Profissional</label>
        <select id="fa-prof">
          <option value="">— Selecione —</option>
          ${profOptions}
        </select>
      </div>
      <div class="form-group">
        <label>Tempo (min, auto)</label>
        <input type="number" id="fa-tempo" readonly value="${e.tempoMin || ''}" />
      </div>
      <div class="form-group">
        <label>Custo Total do Serviço (auto)</label>
        <input type="text" id="fa-ctotal" readonly value="${e.custoTotal ? Number(e.custoTotal).toFixed(2) : ''}" />
      </div>

      <div class="form-group" style="background:var(--sage);padding:12px;border-radius:var(--radius);border:2px solid #4CAF50">
        <label style="color:var(--txt-green);font-weight:600">💰 Preço Cobrado (R$)</label>
        <input type="number" id="fa-cobrado" value="${e.precoCobrado || ''}" min="0" step="0.01" placeholder="0,00"
          style="background:white;font-size:16px;font-weight:600" />
      </div>

      <div class="form-group">
        <label>💳 Forma de Pagamento</label>
        <select id="fa-pgto">
          <option value="">— Selecione —</option>
          ${pgtoOptions}
        </select>
      </div>
      <div class="form-group full">
        <label>Observações</label>
        <textarea id="fa-obs" rows="2">${e.obs || ''}</textarea>
      </div>
    </div>
    <div id="fa-lucro-preview" style="margin-top:8px"></div>
    <div id="fa-wa-preview" style="margin-top:8px"></div>
  `;

  const footer = `
    <button class="btn btn-secondary" id="fa-cancel">Cancelar</button>
    <button class="btn btn-primary" id="fa-save">${isEdit ? 'Salvar alterações' : 'Registrar atendimento'}</button>
  `;

  openModal(isEdit ? 'Editar Atendimento' : 'Novo Atendimento', body, footer);

  // Auto-preenche ao selecionar serviço
  document.getElementById('fa-svc').onchange = () => {
    const svcId = parseInt(document.getElementById('fa-svc').value);
    const svc   = svcs.find(s => s.id === svcId);
    if (!svc) return;
    const custoFixoPorCliente = Servicos.custoFixoPorClienteCalc ? 0 : 0; // simplificado
    document.getElementById('fa-cat').value    = svc.categoria || '';
    document.getElementById('fa-tempo').value  = svc.tempoMin || '';
    // Calcula custo
    const tempoH = (parseFloat(svc.tempoMin)||0)/60;
    const custoTempo = tempoH * (parseFloat(cfg.valorHora)||0);
    let custoProd = 0;
    if (svc.qtdProduto && svc.custoPorUnidade) custoProd = (parseFloat(svc.qtdProduto)||0)*(parseFloat(svc.custoPorUnidade)||0);
    else custoProd = parseFloat(svc.custoProduto)||0;
    const custoTotal = custoProd + custoTempo;
    document.getElementById('fa-ctotal').value = custoTotal.toFixed(2);
    atualizarLucro();
  };

  // Preview lucro em tempo real
  function atualizarLucro() {
    const cobrado = parseFloat(document.getElementById('fa-cobrado').value) || 0;
    const custo   = parseFloat(document.getElementById('fa-ctotal').value)  || 0;
    const lucro   = cobrado - custo;
    const prev    = document.getElementById('fa-lucro-preview');
    if (!prev) return;
    if (cobrado > 0) {
      const margem = cobrado > 0 ? (lucro/cobrado*100).toFixed(1) : 0;
      prev.innerHTML = `<div style="display:flex;gap:16px;padding:10px 14px;background:${lucro>=0?'var(--sage)':'#FEE2E2'};border-radius:var(--radius);font-size:13px">
        <span>Lucro estimado: <strong style="color:${lucro>=0?'var(--txt-green)':'var(--txt-red)'}">${R$(lucro)}</strong></span>
        <span>Margem: <strong>${margem}%</strong></span>
      </div>`;
    } else {
      prev.innerHTML = '';
    }
  }
  document.getElementById('fa-cobrado').oninput = atualizarLucro;
  if (isEdit) atualizarLucro();

  // Preview WhatsApp
  const telInput = document.getElementById('fa-tel');
  telInput.onblur = () => {
    const n = limparTelefone(telInput.value);
    const preview = document.getElementById('fa-wa-preview');
    if (n.length >= 10) {
      const url = linkWA(n);
      preview.innerHTML = url
        ? `<a class="wa-link" href="${url}" target="_blank" rel="noopener">📱 Abrir WhatsApp → ${formatarTelefone(n)}</a>`
        : '';
    } else if (n.length > 0) {
      preview.innerHTML = `<span style="color:var(--txt-red);font-size:12px">⚠️ Número incompleto — inclua o DDD</span>`;
    } else {
      preview.innerHTML = '';
    }
  };

  document.getElementById('fa-cancel').onclick = closeModal;
  document.getElementById('fa-save').onclick = () => {
    const data    = document.getElementById('fa-data').value;
    const svcId   = parseInt(document.getElementById('fa-svc').value);
    const prof    = document.getElementById('fa-prof').value;
    if (!data)  return toast('Informe a data.', 'error');
    if (!svcId) return toast('Selecione um serviço.', 'error');
    if (!prof)  return toast('Selecione a profissional.', 'error');

    const svc = svcs.find(s => s.id === svcId);
    const entry = {
      data,
      cliente:     document.getElementById('fa-cliente').value.trim(),
      telefone:    document.getElementById('fa-tel').value.trim(),
      servicoId:   svcId,
      servicoNome: svc ? svc.nome : '',
      categoria:   svc ? svc.categoria : '',
      profissional: prof,
      qtd:          parseInt(document.getElementById('fa-qtd').value) || 1,
      tempoMin:     parseFloat(document.getElementById('fa-tempo').value) || 0,
      custoProduto: svc ? (parseFloat(svc.custoProduto)||0) : 0,
      custoTotal:   parseFloat(document.getElementById('fa-ctotal').value) || 0,
      precoCobrado: parseFloat(document.getElementById('fa-cobrado').value) || 0,
      formaPagamento: document.getElementById('fa-pgto').value,
      obs:          document.getElementById('fa-obs').value.trim(),
    };

    if (isEdit) Diario.update(e.id, { ...entry, id: e.id });
    else        Diario.add(entry);

    closeModal();
    toast(isEdit ? 'Atendimento atualizado! ✓' : 'Atendimento registrado! ✓', 'success');
    onSave();
  };
}
