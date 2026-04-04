# ✦ Salão Premium — Sistema Web de Gestão (v3.0)

Sistema web completo para gestão de salão de beleza focado em alta performance (offline-first com background sync), design atraente interativo e uma experiência "premium".

## ✦ O que há de novo na v3.0?

A versão 3.0 trouxe um redesenho de arquitetura estrutural e visual:
- **Backend com Supabase**: Sincronização em nuvem, gestão global e login seguro.
- **Offline-First**: Continua rodando de maneira instantânea usando *LocalStorage* e sincroniza os dados via background no Supabase quando a rede permite (com fallback e timeout robustos).
- **Design System Aprimorado**: Migrado para uma abordagem orientada à paleta "Lilás e Dourado", com suporte completo a **Dark Mode** e layout 100% responsivo com Flexbox nativo para Desktop/Celular.
- **Ícones Premium**: Transição de Emojis para vetores profissionais através do **Lucide Icons** / Phosphor Icons.
- **Dashboard Redesenhado**: Incluindo novos *Widgets* operacionais de Destaques, e uma inovadora Barra de Lembretes Rotativa ("Lembretes de Operação").
- **Novos Módulos Integrados**:
  - Nova aba **Agenda**
  - Nova aba **Clientes** (com histórico em CRM)
  - Abordagem de cores focada em cada profissional.

## ✦ Módulos Disponíveis

1. **Dashboard** — KPIs anuais, gráfico de atendimentos, barra de mensagens de gestão com giro automático (carrossel de perguntas estratégicas).
2. **Agenda** — Gerenciamento de horários para a organização diária.
3. **Diário / Caixa** — Registro de atendimentos do dia, com cálculo unificado e embutido de **comissões por profissional**, suporte dinâmico a cores dos prestadores, e atalho automático para WhatsApp.
4. **Serviços & Produtos** — Tabela de precificação com metodologias de Preço Mínimo, Ideal e Premium.
5. **Custos Fixos** — Lançamento simplificado mensal para entendimento de sangrias.
6. **Receitas Internas** — Controle de aluguéis e taxas de bancada/cadeira.
7. **Controle Anual** — Visão financeira integral do resultado real de lucratividade (receitas, custos, saldos).
8. **Clientes (CRM)** — Cadastro e busca de histórico com total de visitas, simplificando os contatos para retorno.
9. **Configurações** — Painel de ajustes técnicos (nome do salão, profissionais, categorias) e de aparência (Light/Dark Mode e resetações de UI).

## 🚀 Como Executar Localmente

Você precisará de um servidor web rápido ou rodar internamente com o pacote *Live Server* do VS Code (pois agora operamos com arquivos JS em Módulos nativos (`type="module"`)).

1. Clone o repositório.
2. Ajuste as credenciais no bloco de autenticação em nuvem (`js/supabase.js`), se necessário gerenciar seu próprio projeto:
   ```javascript
   export const SUPABASE_URL = "Sua URL";
   export const SUPABASE_ANON_KEY = "Sua Chave Pública";
   ```
3. Abra a pasta através do Live Server.
4. Faça o login.

---

## 📂 Estrutura do Sistema

```text
salao-web/
├── index.html              ← App Shell + Menu Interativo Lateral (Sidebar)
├── css/
│   └── style.css           ← Motor de estilo: Variáveis globais, Temas, Layout Flex
├── js/
│   ├── app.js              ← Inicialização, Boot PWA Logic, e Roteamento Vanilla
│   ├── storage.js          ← Arquitetura forte Offline-First & Sincronizador de Fila 
│   ├── supabase.js         ← Client Supabase Integrado (Autenticação e Nuvem)
│   ├── utils.js            ← Cálculos, Máscaras, e Geração Dinâmica de Dados
│   ├── ui.js               ← Gerenciamento do DOM Geração de Alertas, e Toasts
│   └── pages/
│       ├── login.js        ← Tela de Acesso Seguro (Auth)
│       ├── dashboard.js    ← Painel Principal (Lógica de Gráficos e Widgets)
│       ├── agenda.js       ← Painel Calendário
│       ├── diario.js       ← Tabela Diária / Motor Comissão
│       ├── servicos.js     ← Motor de Precificação
│       ├── custos.js       ← Contas Gerais do Salão
│       ├── receitas.js     ← Lançamento de Receitas Internas
│       ├── controle.js     ← DRE Anual e Consolidado
│       ├── clientes.js     ← Motor Novo de CRM & Repasses
│       └── configuracoes.js← Edições de Categoria e Troca Tema
└── README.md
```

## 💾 Sobre os dados (Arquitetura)

O Salão Premium foi refeito visando velocidade e acessibilidade de ponta à ponta:
- **Resiliência Nativa**: Tudo passa pelo `storage.js`. Ele faz proxy dos dados guardando-os no local do navegador e dispara requests para a nuvem de maneira assíncrona.
- Os cálculos complexos (como despesas e comissões do diário) acontecem *Client-Side* reduzindo custos de API Serverless e melhorando a fluidez.

## 📱 Integração com WhatsApp (CRM)

Acesso a apenas 1-click ao portfólio de clientes:  
- Retira-se automaticamente dados indesejados (como espaço, hifens ou pontos) antes de disparar o link curto `wa.me`.
