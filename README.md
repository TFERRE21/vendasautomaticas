# Vendas Automáticas

Robô diário de tendências, seleção de oportunidades de afiliados, geração de conteúdo e publicação na Meta.

## Estado inicial
O sistema opera em **modo rascunho**. Não publica nem compra anúncios por padrão. Só habilite publicação depois de conectar e validar as contas e permissões.

## Executar
- Node.js 24+
- `npm install`
- Copie `.env.example` para `.env` e configure uma senha forte.
- `npm start`
- Painel: `http://localhost:3000`
- Worker diário separado: `npm run worker`

Use PostgreSQL com `DATABASE_URL` em produção. SQLite local é usado quando a variável não está configurada.

## Fluxo
1. Coleta tendências do RSS público do Google Trends Brasil.
2. Pontua termos com intenção comercial (sinal heurístico, não volume real de buscas).
3. Consulta adaptadores de afiliados apenas quando credenciais e APIs aprovadas estiverem configuradas.
4. Gera rascunhos sem inventar preço, estoque, comissão ou link.
5. Publicação requer token válido da Meta e `AUTO_PUBLISH=true`.

## Integrações
- Google Trends RSS: tendências são sinais de interesse; não representam todas as pesquisas nem volume absoluto.
- Shopee/Amazon/Mercado Livre: exigem inscrição, aprovação, identificadores e regras próprias. O adaptador deve ser concluído com o contrato/API disponibilizado à conta.
- Meta: Página do Facebook via Graph API; Instagram exige conta profissional conectada e permissões adicionais.
- `DAILY_BUDGET_BRL=10` é limite de controle. Não compra mídia; anúncios pagos ficam desligados.
- Sempre identifique links/publicações de afiliado e respeite regras das plataformas, direitos de imagem e políticas antispam.

## API
- `GET /health`
- `GET /api/summary`
- `GET /api/trends`
- `GET /api/products`
- `GET /api/posts`
- `POST /api/run`

Todos os endpoints /api exigem autenticação Basic. Configure os segredos no painel do host, nunca no Git.
