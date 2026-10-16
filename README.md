# Estúdio de Tatuagem

Aplicação web em React para clientes agendarem sessões e para a administração gerenciar a agenda do estúdio, tatuadores, serviços, horários e avaliações.

## Requisitos

- Node.js 20.19+ ou 22.12+
- npm
- A API de Agendamentos da disciplina

## Desenvolvimento

```sh
npm install
npm run dev
```

O cliente usa a API configurada em `VITE_API_URL` e a organização configurada em `VITE_ORGANIZACAO`. Por padrão, usa a API da disciplina e o slug `estudio-de-tatuagem`. Para sobrescrever esses valores localmente, copie `.env.example` para `.env.local`.

## Funcionalidades

- Cadastro, login, recuperação e alteração de senha, sessão persistida e renovação automática do token;
- Agendamento em quatro etapas, incluindo seleção de serviço, tatuador e horário livre;
- Próximas sessões, histórico, cancelamento e avaliação;
- Perfil de tatuadores, portfólio e avaliações;
- Área administrativa com agenda diária, pedidos a confirmar e gestão do negócio;
- Cadastro de tatuadores, serviços e disponibilidades, com envio de imagens;
- Interface e ações exibidas conforme as permissões devolvidas pela API.

## Verificação

```sh
npm run lint
npm run build
```

## Publicação

O projeto é uma aplicação Vite de página única. A configuração do Vercel encaminha as rotas para `index.html`; defina `VITE_API_URL` e `VITE_ORGANIZACAO` nas variáveis de ambiente do projeto, se precisar substituir os valores padrão.
