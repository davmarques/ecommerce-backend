# Backend da Ecommerce

API REST da plataforma de ecommerce, construída com NestJS, Prisma e PostgreSQL. O backend atende a loja virtual e o CRM, com autenticação por bearer token e suporte a múltiplas lojas.

## Requisitos

- Node.js 20 ou superior
- PostgreSQL
- npm

## Configuração

Na pasta `backend`, crie um arquivo `.env`:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/ecommerce"
DIRECT_URL="postgresql://usuario:senha@localhost:5432/ecommerce"
AUTH_SECRET="troque-por-um-segredo-forte"
PORT=4000
```

`DATABASE_URL` é usada pela aplicação. `DIRECT_URL` é usada pelo Prisma para migrations. Em produção, defina um `AUTH_SECRET` forte e não use o valor padrão de desenvolvimento.

## Instalação e banco

```bash
npm install
npx prisma generate
npx prisma migrate deploy
```

Altere essa senha antes de usar o ambiente fora do desenvolvimento.

## Executando

```bash
# Desenvolvimento com hot reload
npm run start:dev

# Produção
npm run build
npm run start:prod
```

Por padrão, a API fica disponível em `http://localhost:4000`.

## Autenticação e lojas

Rotas protegidas exigem:

```http
Authorization: Bearer <token>
```

As rotas públicas que consultam dados da loja aceitam o domínio no header:

```http
x-store-domain: lojademonstracao.com.br
```

O token retornado por login ou cadastro é válido por 7 dias e contém o usuário, a loja e o perfil de acesso. Os perfis disponíveis são `CLIENT`, `ADMIN` e `SUPERADMIN`.

## Endpoints

### Autenticação

| Método | Rota | Acesso |
| --- | --- | --- |
| `POST` | `/auth/signup` | Público |
| `POST` | `/auth/login` | Público |
| `GET` | `/auth/me` | Autenticado |
| `PATCH` | `/auth/me` | Autenticado |

O cadastro e o login podem receber `x-store-domain`. O `PATCH /auth/me` atualiza nome, e-mail, CPF, telefone e endereço padrão.

### Catálogo

| Método | Rota | Acesso |
| --- | --- | --- |
| `GET` | `/products` | Público |
| `GET` | `/products/:slug` | Público |
| `POST` | `/products` | Autenticado |
| `PATCH` | `/products/:id` | Autenticado |
| `DELETE` | `/products/:id` | Autenticado |
| `GET` | `/categories` | Público |
| `POST` | `/categories` | Autenticado |
| `PATCH` | `/categories/:id` | Autenticado |
| `DELETE` | `/categories/:id` | Autenticado |

Produtos suportam variantes por tamanho, SKU e estoque. Operações administrativas validam o perfil do usuário e a loja associada ao token.

### Favoritos

Todas as rotas exigem autenticação:

| Método | Rota |
| --- | --- |
| `GET` | `/favorites` |
| `POST` | `/favorites/:productId` |
| `DELETE` | `/favorites/:productId` |

### CRM

Todas as rotas exigem autenticação:

| Método | Rota |
| --- | --- |
| `GET` | `/crm/contacts` |
| `GET` | `/crm/contacts/:contactId` |
| `GET` | `/crm/deals` |
| `PATCH` | `/crm/deals/:productId/stage` |
| `GET` | `/crm/tasks` |
| `POST` | `/crm/tasks` |
| `PATCH` | `/crm/tasks/:taskId/toggle` |
| `GET` | `/crm/activities` |

### Integrações da loja

Todas as rotas exigem autenticação:

| Método | Rota |
| --- | --- |
| `GET` | `/store-config/integrations` |
| `PATCH` | `/store-config/integrations` |

O `GET` não retorna tokens de integração; ele informa apenas se cada token está configurado.

## Scripts

| Comando | Função |
| --- | --- |
| `npm run start:dev` | Inicia o servidor com reload |
| `npm run build` | Compila o projeto |
| `npm run lint` | Executa o ESLint e corrige problemas aplicáveis |
| `npm test` | Executa os testes unitários |
| `npm run test:e2e` | Executa os testes end-to-end |
| `npm run test:cov` | Gera relatório de cobertura |
| `npx prisma migrate dev` | Cria/aplica migration em desenvolvimento |
| `npx prisma db seed` | Executa a seed |

## Estrutura

```text
src/
	auth/          Cadastro, login e sessões
	categories/    Categorias do catálogo
	crm/           Contatos, negócios, tarefas e atividades
	favorites/     Favoritos dos clientes
	products/      Produtos, imagens e variantes
	prisma/        Cliente Prisma e conexão com PostgreSQL
	store-config/  Configurações e integrações da loja
	tenancy/       Resolução do tenant por domínio
```
