// ═══════════════════════════════════════════════════════
// pages/diario.js
// ═══════════════════════════════════════════════════════
import { Diario, Servicos, Config, MESES } from '../storage.js';
import { R$, fmtData, hoje, diaSemana, formatarTelefone,
         linkWA, limparTelefone, toast, openModal, closeModal, emptyState } from '../utils.js';

let _filtroMes  = '';
let _filtroProf = '';

export function renderDiario(container) {
  const cfg    = Config.get();
  const svcs   = Servicos.getAll();
  const profs  = cfg.profissionais || [];

  container.innerHTML = `
    <div class="section-title">Diário de Atendimentos</div>
    <div class="section-sub">Registro diário — dados automáticos ao selecionar o serviço</div>

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

    <div id="diarioTabela"></div>
  `;

  document.getElementById('btnNovoAtend').onclick = () => abrirFormAtend(null, svcs, profs, cfg, () => renderDiario(container));
  document.getElementById('filtroMes').onchange   = e => { _filtroMes  = e.target.value; renderTabela(svcs, cfg); };
  document.getElementById('filtroProf').onchange  = e => { _filtroProf = e.target.value; renderTabela(svcs, cfg); };

  renderTabela(svcs, cfg);
}

function renderTabela(svcs, cfg) {
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
            <th>📱 WhatsApp</th>
            <th>Serviço</th>
            <th>Profissional</th>
            <th class="td-center">Qtd</th>
            <th class="td-center">Tempo</th>
            <th class="td-right">Custo Prod.</th>
            <th class="td-right">Custo Total</th>
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

  // Ações
  container.querySelectorAll('[data-edit]').forEach(btn => {
    btn.onclick = () => {
      const entry = Diario.getAll().find(e => e.id == btn.dataset.edit);
      if (entry) abrirFormAtend(entry, svcs, cfg.profissionais || [], cfg, () => renderTabela(svcs, cfg));
    };
  });

  container.querySelectorAll('[data-del]').forEach(btn => {
    btn.onclick = () => {
      if (confirm('Remover este atendimento?')) {
        Diario.remove(parseInt(btn.dataset.del));
        renderTabela(svcs, cfg);
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
  const custoP = (parseFloat(e.custoProduto) || 0) * qtd;
  const custoT = (parseFloat(e.custoTotal)   || 0) * qtd;
  const tempoMin = (parseFloat(e.tempoMin) || 0) * qtd;

  return `<tr>
    <td>${fmtData(e.data)}</td>
    <td><span class="badge badge-plum">${diaSemana(e.data)}</span></td>
    <td class="fw-600">${e.cliente || '—'}</td>
    <td>${url
      ? `<a class="wa-link" href="${url}" target="_blank" rel="noopener">📱 ${formatarTelefone(tel)}</a>`
      : `<span class="text-muted">${e.telefone ? formatarTelefone(tel) : '—'}</span>`
    }</td>
    <td>${svc ? svc.nome : (e.servicoNome || '—')}</td>
    <td><span class="badge badge-rose">${e.profissional || '—'}</span></td>
    <td class="td-center">${qtd}</td>
    <td class="td-center text-muted">${tempoMin ? Math.floor(tempoMin/60)+'h'+tempoMin%60+'m' : '—'}</td>
    <td class="td-right td-mono">${R$(custoP)}</td>
    <td class="td-right td-mono fw-600 text-plum">${R$(custoT)}</td>
    <td class="text-muted" style="font-size:12px;max-width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.obs || ''}</td>
    <td style="white-space:nowrap">
      <button class="btn btn-sm btn-secondary" data-edit="${e.id}">✎</button>
      <button class="btn btn-sm btn-danger" data-del="${e.id}">×</button>
    </td>
  </tr>`;
}

function abrirFormAtend(entry, svcs, profs, cfg, onSave) {
  const isEdit = !!entry;
  const e = entry || { data: hoje(), qtd: 1 };

  // Calcular custos ao selecionar serviço
  function calcCustos(servicoId, qtd) {
    const svc = svcs.find(s => s.id == servicoId);
    if (!svc) return { custoProduto: 0, custoTotal: 0, tempoMin: 0, categoria: '', servicoNome: '' };
    const custoFixoR   = cfg.atendMedios > 0 ? (Servicos.calcPrecos(svc, cfg, 0).custoTotal) : 0;
    // recalc com custo fixo real
    const { Receitas } = window.__storage || {};
    const cfr = 0; // simplificado — usuário pode ajustar
    const p = Servicos.calcPrecos(svc, cfg, cfr);
    return {
      custoProduto: svc.custoProduto || 0,
      custoTotal:   p.custoTotal,
      tempoMin:     svc.tempoMin || 0,
      categoria:    svc.categoria || '',
      servicoNome:  svc.nome,
    };
  }

  const svcOptions = svcs.map(s =>
    `<option value="${s.id}" ${e.servicoId == s.id ? 'selected' : ''}>${s.nome}</option>`
  ).join('');

  const profOptions = profs.map(p =>
    `<option value="${p}" ${e.profissional === p ? 'selected' : ''}>${p}</option>`
  ).join('');

  const body = `
    <div class="form-grid cols-2">
      <div class="form-group">
        <label>📅 Data</label>
        <input type="date" id="fa-data" value="${e.data || hoje()}" />
      </div>
      <div class="form-group">
        <label>✏️ Qtd de Atendimentos</label>
        <input type="number" id="fa-qtd" value="${e.qtd || 1}" min="1" />
      </div>
      <div class="form-group">
        <label>👤 Nome da Cliente</label>
        <input type="text" id="fa-cliente" class="rose-input" value="${e.cliente || ''}" placeholder="Nome da cliente" />
      </div>
      <div class="form-group">
        <label>📱 Telefone / WhatsApp</label>
        <input type="text" id="fa-tel" class="rose-input" value="${e.telefone || ''}" placeholder="(43) 99999-1234" />
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
        <label>✏️ Profissional</label>
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
        <label>Custo Produto (auto)</label>
        <input type="text" id="fa-cprod" readonly value="${e.custoProduto ? Number(e.custoProduto).toFixed(2) : ''}" />
      </div>
      <div class="form-group">
        <label>Custo Total Serviço (auto)</label>
        <input type="text" id="fa-ctotal" readonly value="${e.custoTotal ? Number(e.custoTotal).toFixed(2) : ''}" />
      </div>
      <div class="form-group full">
        <label>✏️ Observações</label>
        <textarea id="fa-obs" rows="2">${e.obs || ''}</textarea>
      </div>
    </div>
    <div id="fa-wa-preview" style="margin-top:8px"></div>
  `;

  const footer = `
    <button class="btn btn-secondary" id="fa-cancel">Cancelar</button>
    <button class="btn btn-primary" id="fa-save">${isEdit ? 'Salvar alterações' : 'Registrar atendimento'}</button>
  `;

  openModal(isEdit ? 'Editar Atendimento' : 'Novo Atendimento', body, footer);

  // Eventos do formulário
  const svcSel = document.getElementById('fa-svc');
  svcSel.onchange = () => {
    const dados = calcCustos(svcSel.value);
    document.getElementById('fa-cat').value   = dados.categoria;
    document.getElementById('fa-tempo').value = dados.tempoMin;
    document.getElementById('fa-cprod').value = Number(dados.custoProduto).toFixed(2);
    document.getElementById('fa-ctotal').value= Number(dados.custoTotal).toFixed(2);
  };

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
    const cliente = document.getElementById('fa-cliente').value.trim();
    const tel     = document.getElementById('fa-tel').value.trim();
    const svcId   = parseInt(document.getElementById('fa-svc').value);
    const prof    = document.getElementById('fa-prof').value;
    const qtd     = parseInt(document.getElementById('fa-qtd').value) || 1;
    const obs     = document.getElementById('fa-obs').value.trim();
    const svc     = svcs.find(s => s.id === svcId);

    if (!data)  return toast('Informe a data.', 'error');
    if (!svcId) return toast('Selecione um serviço.', 'error');
    if (!prof)  return toast('Selecione a profissional.', 'error');

    const entry = {
      data, cliente, telefone: tel,
      servicoId: svcId,
      servicoNome: svc ? svc.nome : '',
      categoria:   svc ? svc.categoria : '',
      profissional: prof,
      qtd,
      tempoMin:     parseFloat(document.getElementById('fa-tempo').value) || 0,
      custoProduto: parseFloat(document.getElementById('fa-cprod').value) || 0,
      custoTotal:   parseFloat(document.getElementById('fa-ctotal').value) || 0,
      obs,
    };

    if (isEdit) {
      Diario.update(entry.id || e.id, { ...entry, id: e.id });
    } else {
      Diario.add(entry);
    }

    closeModal();
    toast(isEdit ? 'Atendimento atualizado! ✓' : 'Atendimento registrado! ✓', 'success');
    onSave();
  };
}
