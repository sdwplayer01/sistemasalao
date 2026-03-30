# ✦ Salão Premium — Sistema Web de Gestão

Sistema web completo para gestão de salão de beleza.  
Funciona 100% no navegador, sem servidor, sem instalação.

## ✦ Funcionalidades

- **Dashboard** — KPIs anuais, gráfico de atendimentos, destaques automáticos
- **Diário** — Registro diário com dropdown de serviços, link WhatsApp automático
- **Serviços** — Tabela de precificação com preço Mínimo / Ideal / Premium
- **Custos Fixos** — Lançamento mensal, resumo anual automático
- **Receitas Internas** — Repasses e aluguéis que abatam o custo fixo
- **Controle Anual** — Visão consolidada mês a mês
- **Configurações** — Nome do salão, parâmetros, profissionais e categorias
- **Export / Import** — Backup completo em JSON

## 🚀 Publicar no GitHub Pages (passo a passo)

### 1. Criar o repositório

1. Acesse [github.com](https://github.com) e faça login
2. Clique em **"New repository"**
3. Nome sugerido: `salao-premium`
4. Deixe **Public** ✓
5. Clique em **"Create repository"**

### 2. Fazer upload dos arquivos

**Opção A — Interface web (mais fácil):**
1. No repositório criado, clique em **"uploading an existing file"**
2. Arraste a pasta inteira do projeto
3. Clique em **"Commit changes"**

**Opção B — Git (recomendado):**
```bash
cd salao-web
git init
git add .
git commit -m "feat: salão premium v1.0"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/salao-premium.git
git push -u origin main
```

### 3. Ativar o GitHub Pages

1. No repositório, vá em **Settings → Pages**
2. Em "Source", selecione: **Deploy from a branch**
3. Branch: **main** / Folder: **/ (root)**
4. Clique em **Save**
5. Aguarde ~2 minutos
6. Acesse: `https://SEU_USUARIO.github.io/salao-premium`

---

## 📂 Estrutura de Arquivos

```
salao-web/
├── index.html              ← Página principal
├── css/
│   └── style.css           ← Design system premium
├── js/
│   ├── app.js              ← Roteador principal
│   ├── storage.js          ← Banco de dados (localStorage)
│   ├── utils.js            ← Funções utilitárias
│   └── pages/
│       ├── dashboard.js    ← Dashboard com KPIs
│       ├── diario.js       ← Diário de atendimentos
│       ├── servicos.js     ← Tabela de preços
│       ├── custos.js       ← Custos fixos
│       ├── receitas.js     ← Receitas internas
│       ├── controle.js     ← Controle anual
│       └── configuracoes.js← Configurações
└── README.md
```

## 💾 Sobre os dados

Os dados ficam salvos no **localStorage do navegador**.  
Isso significa:
- ✅ Funciona offline
- ✅ Nenhum servidor necessário
- ✅ Completamente gratuito
- ⚠️ Os dados ficam no navegador daquele dispositivo
- ⚠️ Limpar o cache do navegador apaga os dados

**Faça backup regularmente** usando o botão **"↓ Exportar JSON"** na barra lateral.  
Para transferir para outro dispositivo, exporte e depois importe no novo dispositivo.

## 📱 WhatsApp

O link do WhatsApp é gerado automaticamente ao cadastrar o telefone da cliente no Diário.  
- Aceita número com ou sem máscara
- Remove automaticamente parênteses, espaços e hífens
- Exige DDD (10 ou 11 dígitos)
- Abre o WhatsApp Web ou app diretamente

## ⚙️ Personalização

Para mudar as cores, edite as variáveis CSS no início de `css/style.css`:

```css
:root {
  --noir:    #2C1654;  /* Header escuro */
  --plum:    #7B4F8E;  /* Cor principal */
  --rose:    #C4879A;  /* Destaques rosa */
  --ivory:   #FFFDF7;  /* Fundo dos inputs */
}
```

## 🔮 Próximos passos sugeridos

- [ ] Integração com Supabase para dados em nuvem
- [ ] Acesso multi-dispositivo (celular + computador)
- [ ] Cadastro de clientes com histórico
- [ ] Agendamento básico
- [ ] Relatório mensal em PDF
- [ ] Login com senha
