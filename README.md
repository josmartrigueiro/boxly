# Boxly

Sistema de gestão de estoque, pedidos de compra, fornecedores e vendas da Tangerina Paper.

## Desenvolvimento

```bash
bun install
bun run dev
```

## Verificações

```bash
bun run check
bunx tsc --noEmit -p tsconfig.json
bun run build
```

## Publicação na Vercel

O projeto usa TanStack Start com Nitro, que gera o formato de deploy aceito pela Vercel.

1. Importe o repositório na Vercel.
2. Mantenha o comando de build como `bun run build`.
3. Configure as variáveis descritas em `.env.example` em **Production** e, se necessário, em **Preview**.
4. Defina `BETTER_AUTH_URL` com o domínio público principal, por exemplo `https://seu-projeto.vercel.app`.
5. Caso use login Google, inclua o callback `https://seu-dominio/api/auth/callback/google` nas credenciais OAuth.

`NEON_DATABASE_URL`, `BETTER_AUTH_SECRET`, as credenciais OAuth e o DSN do Sentry são segredos: nunca devem ir para o Git.
