// ═══════════════════════════════════════════════════════
// pages/configuracoes.js
// ═══════════════════════════════════════════════════════
import { Config } from '../storage.js';
import { toast } from '../utils.js';

export function renderConfiguracoes(container) {
  const cfg = Config.get();

  container.innerHTML = `
    <div class="section-title">Configurações</div>
    <div class="section-sub">Dados do salão, parâmetros de precificação e listas personalizáveis.</div>

    <!-- Dados do salão -->
    <div class="card mb-16">
      <div class="card-header"><span class="card-title">✦ Dados do Salão</span></div>
      <div class="card-body">
        <div class="form-grid cols-2">
          <div class="form-group">
            <label>Nome do Salão</label>
            <input type="text" id="cfg-nome" value="${cfg.nomeSalao || ''}" />
          </div>
          <div class="form-group">
            <label>Responsável</label>
            <input type="text" id="cfg-resp" value="${cfg.responsavel || ''}" />
          </div>
          <div class="form-group">
            <label>Cidade / Estado</label>
            <input type="text" id="cfg-cidade" value="${cfg.cidade || ''}" />
          </div>
          <div class="form-group">
            <label>Ano de Referência</label>
            <input type="number" id="cfg-ano" value="${cfg.ano || new Date().getFullYear()}" min="2020" max="2099" />
          </div>
          <div class="form-group">
            <label>Telefone / WhatsApp</label>
            <input type="text" id="cfg-tel" value="${cfg.telefone || ''}" placeholder="(43) 99999-1234" />
          </div>
          <div class="form-group">
            <label>Instagram / Site</label>
            <input type="text" id="cfg-ig" value="${cfg.instagram || ''}" placeholder="@meu.salao" />
          </div>
        </div>
      </div>
    </div>

    <!-- Parâmetros de precificação -->
    <div class="card mb-16">
      <div class="card-header"><span class="card-title">⚙ Parâmetros de Precificação</span></div>
      <div class="card-body">
        <div class="form-grid cols-3">
          <div class="form-group">
            <label>Valor da Hora (R$)</label>
            <input type="number" id="cfg-hora" value="${cfg.valorHora || 40}" min="0" step="0.01" />
          </div>
          <div class="form-group">
            <label>Atendimentos Médios / Mês</label>
            <input type="number" id="cfg-atend" value="${cfg.atendMedios || 80}" min="1" />
          </div>
          <div class="form-group">
            <label style="color:var(--txt-red)">Multiplicador Preço Mínimo</label>
            <input type="number" id="cfg-mult-min" value="${cfg.multMin || 2}" min="1" step="0.1" />
          </div>
          <div class="form-group">
            <label style="color:var(--txt-green)">Multiplicador Preço Ideal</label>
            <input type="number" id="cfg-mult-ideal" value="${cfg.multIdeal || 2.5}" min="1" step="0.1" />
          </div>
          <div class="form-group">
            <label style="color:#856404">Multiplicador Preço Premium</label>
            <input type="number" id="cfg-mult-prem" value="${cfg.multPrem || 3}" min="1" step="0.1" />
          </div>
        </div>
      </div>
    </div>

    <!-- Profissionais -->
    <div class="card mb-16">
      <div class="card-header"><span class="card-title">👩 Profissionais</span></div>
      <div class="card-body">
        <div id="profLista">
          ${(cfg.profissionais || []).map((p,i) => profRow(p, i)).join('')}
        </div>
        <button class="btn btn-secondary btn-sm mt-8" id="btnAddProf">+ Adicionar</button>
      </div>
    </div>

    <!-- Categorias -->
    <div class="card mb-16">
      <div class="card-header"><span class="card-title">🏷 Categorias de Serviço</span></div>
      <div class="card-body">
        <div id="catLista">
          ${(cfg.categorias || []).map((c,i) => catRow(c, i)).join('')}
        </div>
        <button class="btn btn-secondary btn-sm mt-8" id="btnAddCat">+ Adicionar</button>
      </div>
    </div>

    <div class="flex-between">
      <span class="text-muted" style="font-size:12px">Configurações salvas no seu navegador.</span>
      <button class="btn btn-primary" id="btnSalvarCfg">Salvar todas as configurações</button>
    </div>
  `;

  // Profissionais
  document.getElementById('btnAddProf').onclick = () => {
    const lista = document.getElementById('profLista');
    const idx = lista.children.length;
    const div = document.createElement('div');
    div.innerHTML = profRow('', idx);
    lista.appendChild(div.firstElementChild);
  };

  // Categorias
  document.getElementById('btnAddCat').onclick = () => {
    const lista = document.getElementById('catLista');
    const idx = lista.children.length;
    const div = document.createElement('div');
    div.innerHTML = catRow('', idx);
    lista.appendChild(div.firstElementChild);
  };

  document.getElementById('btnSalvarCfg').onclick = salvarConfig;
}

function profRow(p, i) {
  return `<div class="form-grid cols-2 mb-16" data-prof="${i}" style="align-items:flex-end">
    <div class="form-group">
      <input type="text" class="prof-input" value="${p}" placeholder="Nome da profissional" />
    </div>
    <button class="btn btn-danger btn-icon" onclick="this.closest('[data-prof]').remove()">×</button>
  </div>`;
}

function catRow(c, i) {
  return `<div class="form-grid cols-2 mb-16" data-cat="${i}" style="align-items:flex-end">
    <div class="form-group">
      <input type="text" class="cat-input" value="${c}" placeholder="Ex: Cabelo" />
    </div>
    <button class="btn btn-danger btn-icon" onclick="this.closest('[data-cat]').remove()">×</button>
  </div>`;
}

function salvarConfig() {
  const cfg = {
    nomeSalao:    document.getElementById('cfg-nome').value.trim(),
    responsavel:  document.getElementById('cfg-resp').value.trim(),
    cidade:       document.getElementById('cfg-cidade').value.trim(),
    ano:          parseInt(document.getElementById('cfg-ano').value) || new Date().getFullYear(),
    telefone:     document.getElementById('cfg-tel').value.trim(),
    instagram:    document.getElementById('cfg-ig').value.trim(),
    valorHora:    parseFloat(document.getElementById('cfg-hora').value) || 40,
    atendMedios:  parseInt(document.getElementById('cfg-atend').value) || 80,
    multMin:      parseFloat(document.getElementById('cfg-mult-min').value) || 2,
    multIdeal:    parseFloat(document.getElementById('cfg-mult-ideal').value) || 2.5,
    multPrem:     parseFloat(document.getElementById('cfg-mult-prem').value) || 3,
    profissionais: [...document.querySelectorAll('.prof-input')].map(i => i.value.trim()).filter(Boolean),
    categorias:    [...document.querySelectorAll('.cat-input')].map(i => i.value.trim()).filter(Boolean),
  };

  Config.save(cfg);

  // Atualiza nome na sidebar
  const el = document.getElementById('sidebarNomeSalao');
  if (el) el.textContent = cfg.nomeSalao;

  toast('Configurações salvas! ✓', 'success');
}
