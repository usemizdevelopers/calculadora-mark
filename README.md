# Calculadora de preços especiais

Sistema interno para calcular a margem de tecidos vendidos por metro linear, simular preços especiais, registrar os preços aprovados e enviá-los por WhatsApp.

Next.js (App Router) + TypeScript + Tailwind CSS + Supabase (`@supabase/ssr`) + Vitest.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # já aponta para o projeto grupo-mark
npm run dev
```

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run test` | Testes das regras de cálculo e formatação |
| `npm run lint` | ESLint |
| `npm run build` | Build de produção (inclui checagem de tipos) |

## Variáveis de ambiente

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://lwpvtfamqvsyqntbyevf.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | chave publicável do projeto (está em `.env.example`) |

A chave publicável é pública por natureza; a proteção dos dados vem do login e das políticas RLS.

## Supabase

Projeto **grupo-mark**. As tabelas desta calculadora usam o prefixo `calc_` para não conflitar com o outro sistema do mesmo banco:

- `calc_configuracoes`: uma única linha (id = 1) com custo operacional, limites das faixas e destinatário do WhatsApp.
- `calc_precos_aprovados`: cada preço aprovado, com todas as entradas, resultados e as configurações usadas na época.

Qualquer usuário autenticado lê e altera tudo (RLS só exige login). O SQL está em `supabase/migrations/` e já foi aplicado.

### Configuração no painel

1. **Usuários:** crie em *Authentication → Users → Add user* (não há cadastro público).
2. **Redefinição de senha:** em *Authentication → URL Configuration*, defina o *Site URL* com o domínio da Vercel e adicione em *Redirect URLs*:
   - `https://SEU-DOMINIO/auth/confirmar`
   - `http://localhost:3000/auth/confirmar` (para testar localmente)

## Deploy na Vercel

Importe o repositório, cadastre as duas variáveis de ambiente acima e publique. Não há outra configuração.

## Deploy no Easypanel

O repositório tem um `Dockerfile` (build standalone do Next.js, porta 3000).

1. Crie um projeto e, dentro dele, um serviço **App**.
2. Em *Source*, escolha **GitHub**, repositório `usemizdevelopers/calculadora-mark` e o branch desejado.
3. Em *Build*, escolha **Dockerfile** (caminho `Dockerfile`).
4. Em *Environment*, cadastre as duas variáveis acima (opcional: o Dockerfile já traz esses valores como padrão).
5. Em *Domains*, adicione o domínio e aponte para a **porta 3000**. O HTTPS é emitido pelo próprio Easypanel.
6. Clique em **Deploy**.
7. No Supabase, adicione `https://SEU-DOMINIO/auth/confirmar` em *Redirect URLs* e use o domínio como *Site URL*.

## Estrutura

- `lib/calculos.ts`: toda a matemática (módulo puro, sem React ou Supabase), testada em `lib/calculos.test.ts`.
- `lib/formatacao.ts`: moeda, percentual, metragem, máscaras de entrada e link do WhatsApp.
- `lib/dados.ts`: leitura e escrita nas tabelas.
- `proxy.ts`: protege todas as rotas, exceto login e redefinição de senha (no Next.js 16 o antigo `middleware.ts` passou a se chamar `proxy.ts`).
- `app/(app)/`: Calculadora, Histórico e Configurações.
- `components/ReguaMargem.tsx`: a régua de margem.
