import * as UI from '../ui.js';
// ═══════════════════════════════════════════════════════
// pages/agenda.js — Agenda com WhatsApp integrado
// ═══════════════════════════════════════════════════════
import { Agenda, Servicos, Config, MESES } from '../storage.js';
import { fmtData, hoje, diaSemana, formatarTelefone,
         limparTelefone, toast, openModal, closeModal, emptyState } from '../utils.js';

// ── Helpers de WhatsApp com mensagem pré-preenchida ────
function linkWAMsg(telefone, mensagem) {
  let n = limparTelefone(telefone);
  if (n.length > 11 && n.startsWith('55')) n = n.slice(2);
  if (n.length < 10 || n.length > 11) return null;
  return `https://wa.me/55${n}?text=${encodeURIComponent(mensagem)}`;
}

function msgConfirmacao(nome, data, horario, nomeSalao) {
  const dataFmt = data ? fmtData(data) : '—';
  return `Oiii, ${nome}! 🌸 Seu horário está confirmado pra ${dataFmt} às ${horario}. Qualquer coisa é só me chamar aqui, tá? Te espero! — ${nomeSalao}`;
}

function msgLembrete(nome, horario, nomeSalao) {
  return `Oiii, ${nome}! 💜 Passando pra lembrar que amanhã te espero às ${horario}. Vai ser um prazer te atender! — ${nomeSalao}`;
}

function msgAgradecimento(nome, nomeSalao) {
  return `Oiii, ${nome}! 🌷 Foi um prazer te atender hoje! Espero que tenha amado o resultado. Até a próxima, saudades já! — ${nomeSalao}`;
}

// ── Render principal ────────────────────────────────────
export function renderAgenda(container) {
  const cfg   = Config.get();
  const svcs  = Servicos.getAll();
  const profs = cfg.profissionais || [];

  container.innerHTML = `
    <div class="section-title">Agenda de Horários</div>
    <div class="section-sub">Agende clientes e envie mensagens WhatsApp com um clique.</div>

    <div id="agendaAmanha"></div>

    <div class="action-bar">
      <button class="btn btn-primary" id="btnNovoAgend">+ Novo Agendamento</button>
      <select id="agFiltroMes" style="max-width:170px">
        <option value="">Todos os meses</option>
        ${MESES.map((m,i) => `<option value="${i}">${m}</option>`).join('')}
      </select>
      <select id="agFiltroStatus" style="max-width:160px">
        <option value="">Todos os status</option>
        <option value="agendado">Agendado</option>
        <option value="confirmado">Confirmado</option>
        <option value="realizado">Realizado</option>
        <option value="cancelado">Cancelado</option>
      </select>
    </div>

    <div id="agendaTabela"></div>
  `;

  renderAmanha(cfg);
  renderTabela(svcs, profs, cfg);

  document.getElementById('btnNovoAgend').onclick = () =>
    abrirForm(null, svcs, profs, cfg, () => {
      renderAmanha(cfg);
      renderTabela(svcs, profs, cfg);
    });

  document.getElementById('agFiltroMes').onchange = () =>
    renderTabela(svcs, profs, cfg);

  document.getElementById('agFiltroStatus').onchange = () =>
    renderTabela(svcs, profs, cfg);
}

// ── Banner: lembrar amanhã ──────────────────────────────
function renderAmanha(cfg) {
  const el = document.getElementById('agendaAmanha');
  if (!el) return;

  const amanha = Agenda.getAmanha();
  if (!amanha.length) { el.innerHTML = ''; return; }

  el.innerHTML = `
    <div class="card mb-16" style="border-left:4px solid var(--rose);background:var(--rose-light)">
      <div class="card-header" style="background:transparent;border:none">
        <span class="card-title" style="color:var(--plum)">💜 Lembrar Amanhã — ${amanha.length} cliente${amanha.length > 1 ? 's' : ''}</span>
      </div>
      <div class="card-body" style="padding-top:0">
        <div style="display:flex;flex-direction:column;gap:10px">
          ${amanha.map(a => {
            const tel = limparTelefone(a.telefone || '');
            const url = tel.length >= 10
              ? linkWAMsg(tel, msgLembrete(a.cliente || 'Cliente', a.horario || '', cfg.nomeSalao))
              : null;
            return `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
              <span class="fw-600" style="min-width:140px">${a.cliente || '—'}</span>
              <span class="badge badge-plum">${a.horario || '—'}</span>
              <span class="text-muted" style="font-size:13px">${a.servicoNome || '—'}</span>
              ${url
                ? `<a class="btn btn-sm btn-primary" href="${url}" target="_blank" rel="noopener" style="text-decoration:none">
                    💬 Enviar Lembrete
                   </a>`
                : `<span class="text-muted" style="font-size:12px">Sem telefone</span>`
              }
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

// ── Tabela de agendamentos ──────────────────────────────
function renderTabela(svcs, profs, cfg) {
  const container = document.getElementById('agendaTabela');
  if (!container) return;

  const filtroMes    = document.getElementById('agFiltroMes')?.value;
  const filtroStatus = document.getElementById('agFiltroStatus')?.value;

  let entries = Agenda.getAll();

  if (filtroMes !== '') {
    const m = parseInt(filtroMes);
    if (!isNaN(m)) {
      entries = entries.filter(e => e.data && new Date(e.data + 'T12:00:00').getMonth() === m);
    }
  }
  if (filtroStatus) {
    entries = entries.filter(e => e.status === filtroStatus);
  }

  if (!entries.length) {
    container.innerHTML = emptyState('Nenhum agendamento encontrado. Clique em "+ Novo Agendamento".');
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Dia</th>
            <th>Horário</th>
            <th>👤 Cliente</th>
            <th>Serviço</th>
            <th>Profissional</th>
            <th>Status</th>
            <th class="td-center">WhatsApp</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${entries.map(e => rowHTML(e, cfg)).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Editar
  container.querySelectorAll('[data-edit]').forEach(btn => {
    btn.onclick = () => {
      const entry = Agenda.getAll().find(e => e.id == btn.dataset.edit);
      if (entry) abrirForm(entry, svcs, profs, cfg, () => {
        renderAmanha(cfg);
        renderTabela(svcs, profs, cfg);
      });
    };
  });

  // Deletar
  container.querySelectorAll('[data-del]').forEach(btn => {
    btn.onclick = () => {
      if (confirm('Remover este agendamento?')) {
        Agenda.remove(parseInt(btn.dataset.del));
        renderAmanha(cfg);
        renderTabela(svcs, profs, cfg);
        toast('Agendamento removido.', 'default');
      }
    };
  });

  // Mudar status inline
  container.querySelectorAll('[data-status-id]').forEach(sel => {
    sel.onchange = () => {
      Agenda.update(parseInt(sel.dataset.statusId), { status: sel.value });
      renderAmanha(cfg);
      renderTabela(svcs, profs, cfg);
      toast('Status atualizado! ✓', 'success');
    };
  });
}

// ── Linha da tabela ─────────────────────────────────────
function rowHTML(e, cfg) {
  const tel = limparTelefone(e.telefone || '');
  const temTel = tel.length >= 10;

  const urlConfirm   = temTel ? linkWAMsg(tel, msgConfirmacao(e.cliente || 'Cliente', e.data, e.horario || '', cfg.nomeSalao)) : null;
  const urlLembrete  = temTel ? linkWAMsg(tel, msgLembrete(e.cliente || 'Cliente', e.horario || '', cfg.nomeSalao)) : null;
  const urlAgradec   = temTel ? linkWAMsg(tel, msgAgradecimento(e.cliente || 'Cliente', cfg.nomeSalao)) : null;

  const statusColors = {
    agendado:   'badge-plum',
    confirmado: 'badge-green',
    realizado:  'badge-rose',
    cancelado:  '',
  };

  const statusOpts = ['agendado','confirmado','realizado','cancelado']
    .map(s => `<option value="${s}" ${e.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`)
    .join('');

  return `<tr class="${e.status === 'cancelado' ? 'row-muted' : ''}">
    <td>${fmtData(e.data)}</td>
    <td><span class="badge badge-plum">${diaSemana(e.data)}</span></td>
    <td class="fw-600" style="color:var(--plum)">${e.horario || '—'}</td>
    <td class="fw-600">${e.cliente || '—'}</td>
    <td>${e.servicoNome || '—'}</td>
    <td><span class="badge badge-rose">${e.profissional || '—'}</span></td>
    <td>
      <select class="badge ${statusColors[e.status] || ''}" data-status-id="${e.id}"
        style="border:none;cursor:pointer;font-size:11px;padding:2px 6px;border-radius:99px;font-weight:600">
        ${statusOpts}
      </select>
    </td>
    <td style="white-space:nowrap;text-align:center">
      ${temTel ? `
        <a href="${urlConfirm}"  target="_blank" rel="noopener" title="Confirmar agendamento"
          class="btn btn-sm btn-secondary" style="text-decoration:none;margin:1px">✅</a>
        <a href="${urlLembrete}" target="_blank" rel="noopener" title="Lembrete véspera"
          class="btn btn-sm btn-secondary" style="text-decoration:none;margin:1px">💜</a>
        <a href="${urlAgradec}"  target="_blank" rel="noopener" title="Agradecimento pós-atendimento"
          class="btn btn-sm btn-secondary" style="text-decoration:none;margin:1px">🌷</a>
      ` : `<span class="text-muted" style="font-size:11px">Sem tel.</span>`}
    </td>
    <td style="white-space:nowrap">
      <button class="btn btn-sm btn-secondary" data-edit="${e.id}">✎</button>
      <button class="btn btn-sm btn-danger" data-del="${e.id}">×</button>
    </td>
  </tr>`;
}

// ── Formulário de novo / editar agendamento ─────────────
function abrirForm(entry, svcs, profs, cfg, onSave) {
  const isEdit = !!entry;
  const e = entry || { data: hoje(), status: 'agendado' };

  const svcOptions = svcs.map(s =>
    `<option value="${s.id}" data-nome="${s.nome}" ${e.servicoId == s.id ? 'selected' : ''}>${s.nome}</option>`
  ).join('');

  const profOptions = profs.map(p =>
    `<option value="${p}" ${e.profissional === p ? 'selected' : ''}>${p}</option>`
  ).join('');

  // Gerar horários de 07:00 até 20:00 em intervalos de 30min
  const horarios = [];
  for (let h = 7; h <= 20; h++) {
    horarios.push(`${String(h).padStart(2,'0')}:00`);
    if (h < 20) horarios.push(`${String(h).padStart(2,'0')}:30`);
  }
  const horarioOptions = horarios.map(h =>
    `<option value="${h}" ${e.horario === h ? 'selected' : ''}>${h}</option>`
  ).join('');

  const body = `
    <div class="form-grid cols-2">
      <div class="form-group">
        <label>📅 Data</label>
        <input type="date" id="ag-data" value="${e.data || hoje()}" />
      </div>
      <div class="form-group">
        <label>🕐 Horário</label>
        <select id="ag-horario">
          <option value="">— Selecione —</option>
          ${horarioOptions}
        </select>
      </div>
      <div class="form-group">
        <label>👤 Nome da Cliente</label>
        <input type="text" id="ag-cliente" value="${e.cliente || ''}" placeholder="Nome da cliente" />
      </div>
      <div class="form-group">
        <label>📱 Telefone / WhatsApp</label>
        <input type="text" id="ag-tel" value="${e.telefone || ''}" placeholder="(43) 99999-1234" />
      </div>
      <div class="form-group full">
        <label>✂ Serviço</label>
        <select id="ag-svc">
          <option value="">— Selecione o serviço —</option>
          ${svcOptions}
        </select>
      </div>
      <div class="form-group">
        <label>✏️ Profissional</label>
        <select id="ag-prof">
          <option value="">— Selecione —</option>
          ${profOptions}
        </select>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="ag-status">
          <option value="agendado"   ${e.status==='agendado'  ?'selected':''}>Agendado</option>
          <option value="confirmado" ${e.status==='confirmado'?'selected':''}>Confirmado</option>
          <option value="realizado"  ${e.status==='realizado' ?'selected':''}>Realizado</option>
          <option value="cancelado"  ${e.status==='cancelado' ?'selected':''}>Cancelado</option>
        </select>
      </div>
      <div class="form-group full">
        <label>✏️ Observações</label>
        <textarea id="ag-obs" rows="2">${e.obs || ''}</textarea>
      </div>
    </div>

    <div id="ag-wa-preview" style="margin-top:12px;display:flex;flex-direction:column;gap:8px"></div>
  `;

  const footer = `
    <button class="btn btn-secondary" id="ag-cancel">Cancelar</button>
    <button class="btn btn-primary" id="ag-save">${isEdit ? 'Salvar alterações' : 'Agendar cliente'}</button>
  `;

  openModal(isEdit ? 'Editar Agendamento' : 'Novo Agendamento', body, footer);

  // Preview WhatsApp ao preencher dados
  function atualizarPreview() {
    const tel     = document.getElementById('ag-tel').value;
    const cliente = document.getElementById('ag-cliente').value.trim() || 'Cliente';
    const data    = document.getElementById('ag-data').value;
    const horario = document.getElementById('ag-horario').value;
    const preview = document.getElementById('ag-wa-preview');
    if (!preview) return;

    const n = limparTelefone(tel);
    if (n.length < 10) { preview.innerHTML = ''; return; }

    const urlC = linkWAMsg(n, msgConfirmacao(cliente, data, horario, cfg.nomeSalao));
    const urlL = linkWAMsg(n, msgLembrete(cliente, horario, cfg.nomeSalao));
    const urlA = linkWAMsg(n, msgAgradecimento(cliente, cfg.nomeSalao));

    preview.innerHTML = `
      <div style="font-size:11px;font-weight:600;color:var(--plum);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">
        Ações rápidas de WhatsApp:
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <a href="${urlC}" target="_blank" rel="noopener" class="btn btn-sm btn-primary" style="text-decoration:none">
          ✅ Confirmar agendamento
        </a>
        <a href="${urlL}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary" style="text-decoration:none">
          💜 Lembrete véspera
        </a>
        <a href="${urlA}" target="_blank" rel="noopener" class="btn btn-sm btn-secondary" style="text-decoration:none">
          🌷 Agradecimento
        </a>
      </div>
    `;
  }

  document.getElementById('ag-tel').oninput     = atualizarPreview;
  document.getElementById('ag-cliente').oninput = atualizarPreview;
  document.getElementById('ag-horario').onchange= atualizarPreview;
  document.getElementById('ag-data').onchange   = atualizarPreview;
  if (isEdit) atualizarPreview();

  document.getElementById('ag-cancel').onclick = closeModal;

  document.getElementById('ag-save').onclick = () => {
    const data     = document.getElementById('ag-data').value;
    const horario  = document.getElementById('ag-horario').value;
    const cliente  = document.getElementById('ag-cliente').value.trim();
    const tel      = document.getElementById('ag-tel').value.trim();
    const svcEl    = document.getElementById('ag-svc');
    const svcId    = parseInt(svcEl.value) || null;
    const svcNome  = svcId ? svcEl.options[svcEl.selectedIndex]?.dataset.nome || '' : '';
    const prof     = document.getElementById('ag-prof').value;
    const status   = document.getElementById('ag-status').value;
    const obs      = document.getElementById('ag-obs').value.trim();

    if (!data)    return toast('Informe a data.', 'error');
    if (!horario) return toast('Selecione o horário.', 'error');
    if (!cliente) return toast('Informe o nome da cliente.', 'error');

    const novo = { data, horario, cliente, telefone: tel, servicoId: svcId, servicoNome: svcNome, profissional: prof, status, obs };

    if (isEdit) Agenda.update(e.id, { ...novo, id: e.id });
    else        Agenda.add(novo);

    closeModal();
    toast(isEdit ? 'Agendamento atualizado! ✓' : 'Cliente agendada! ✓', 'success');
    onSave();
  };
}
