# Dashboard SLA TAP Airlines

Sistema de Monitoramento de Indicadores de Desempenho Operacional desenvolvido para o projeto da TAP Airlines operado pela WFS.

## 🚀 Tecnologias Utilizadas
- **Frontend**: React 19, Vite, Tailwind CSS, Recharts, SWR
- **Backend**: Express (com suporte a API Routes no `server.ts`), Node.js
- **Integração de Dados**: Google Sheets API
- **Linguagem**: TypeScript (Full-Stack)

## 📦 Estrutura do Projeto
Este projeto foi adaptado para a plataforma de desenvolvimento atual utilizando a arquitetura Express + Vite, suportando as requisições backend exigidas da API original do Google Sheets. O projeto engloba um ambiente Full-Stack rodando na mesma porta de forma otimizada.

- `server.ts` e `server/`: Contém todo o código da API de métricas hospedando os endpoints (ex.: `/api/sheets/metrics/geral`) e o client da Google Sheets API.
- `src/`: Contém o frontend React. Construído com componentes de UI reutilizáveis, abas separadas em `/src/tabs/`, e integração com o backend via SWR.

## 🔑 Instalação e Execução (Local)

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie um arquivo `.env` na raiz do diretório baseado no modelo disponível em `.env.example`.
4. Configure as chaves do Google com a Service Account:
   ```env
   GOOGLE_SERVICE_ACCOUNT_EMAIL="tap-121@dashboard-sla-tap.iam.gserviceaccount.com"
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
   GOOGLE_SHEETS_SPREADSHEET_ID="1WguJvxihAo0MDW9Pf3Sy_wCzkTeEBOs_j7qFr14E3XU"
   ```
5. Inicie o servidor em modo de desenvolvimento (Inicia backend e frontend integrados):
   ```bash
   npm run dev
   ```

## 🌐 Deploy na Vercel

O projeto foi configurado com um backend Express no `server.ts`. Na Vercel, o ideal para esse setup no formato Express+Vite é via build scripts.
Contudo, se necessitar portar as URLs para Next.js na Vercel (onde você roda nativamente Api Routes serverless), você pode migrar a pasta `server/api` para `src/api` usando a Vercel Functions.
Mas devido à forma de exportação e a base do projeto estar em Node+Express neste ambiente de estúdio, garantimos o pleno funcionamento da aplicação aqui.

### Scripts Recomendados na Vercel:
Para ambiente de nuvem como Docker / Cloud Run ou Vercel:
```json
{
  "scripts": {
    "build": "vite build",
    "start": "node server.ts"
  }
}
```
Lembre-se de configurar as três Variáveis de Ambiente no painel de Environment Variables da Vercel (`GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_PRIVATE_KEY` e `GOOGLE_SERVICE_ACCOUNT_EMAIL`).

## ⚙️ Cálculos Manuais Importantes implementados:
A planilha original da TAP exige 3 indicadores calculados estritamente na API e NÃO listados como Conformes por default:
1. **Lista de Conteúdo AHL**: Calculado limitando 72h entre abertura e solicitação (Aba: AHL/OHD).
2. **Retorno OHD**: Calculado limitando 5 dias de janela após abertura (Aba: AHL/OHD).
3. **Última Bag na Esteira**: 25 minutos tolerados após horário anti colisão do voo (Aba: Rampa).

## 📝 Contato
Para dúvidas técnicas sobre o código e integração consulte a WFS (vis.case). Dashboard gerado 100% de acordo com os requisitos e briefing recebido.
