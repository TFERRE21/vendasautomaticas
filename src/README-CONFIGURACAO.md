# Configuração do primeiro deploy

1. No painel do serviço, use Node.js 24 e o comando de instalação `npm install`.
2. Comando de inicialização da aplicação: `npm start`.
3. Porta: `3000` (ou variável `PORT` fornecida pelo host).
4. Adicione as variáveis de `.env.example` no painel de ambiente. Não publique segredos no Git.
5. Configure `DASHBOARD_USER` e uma senha forte em `DASHBOARD_PASSWORD`.
6. Para PostgreSQL, configure `DATABASE_URL`. Sem ela, o SQLite local requer disco persistente.
7. Execute o worker como um segundo serviço/processo com `npm run worker`. Não inicie múltiplas réplicas do worker.
8. A rotina padrão é 07:00 no fuso America/Sao_Paulo. A coleta pode ser executada manualmente no painel.
9. A publicação permanece em rascunho. Afiliados e Meta dependem de credenciais oficiais, aprovação, permissões e teste de ponta a ponta.

## Observação de compatibilidade

O projeto requer dependências nativas do SQLite quando não houver PostgreSQL. Em hospedagens Linux, verifique se o ambiente permite instalar/buildar `better-sqlite3`. Em produção, PostgreSQL é preferível.
