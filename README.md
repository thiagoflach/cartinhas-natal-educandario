# Como publicar

A página fica no **GitHub Pages** (repositório `thiagoflach/cartinhas-natal-educandario`).
A planilha e os e-mails ficam com um **Google Apps Script** publicado pelo Gmail da campanha, que funciona como a "API" da página.
O GitHub não consegue gravar na planilha nem mandar e-mail, por isso as duas partes são necessárias.

## Parte 1: Apps Script com o Gmail da campanha

Todo o script roda numa conta Gmail criada só para a campanha. A conta pessoal não dá nenhuma permissão.

1. Crie um Gmail para a campanha (ex.: cartinhas.educandario@gmail.com).
2. Com a sua conta, compartilhe a planilha com esse Gmail como **Editor**.
3. Abra uma **janela anônima** do navegador, entre com o Gmail da campanha e abra a planilha.
4. **Extensões > Apps Script**. Apague o que estiver no `Código.gs` e cole o código de
   [apps-script/Code.gs](https://raw.githubusercontent.com/thiagoflach/cartinhas-natal-educandario/main/apps-script/Code.gs). Salve.
5. Escolha a função **testarLeitura** > **Executar** > Revisar permissões > conta da campanha >
   Avançado > Acessar (não seguro) > marque as duas permissões > Permitir.
   Ele pede só: esta planilha e enviar e-mail como a conta da campanha.
6. **Implantar > Nova implantação** > engrenagem > **App da Web**. Executar como: **Eu**. Quem pode acessar: **Qualquer pessoa**. Implantar.
7. Copie o **URL do app da Web** (termina em `/exec`) e coloque na linha `var API_URL = '';` do `index.html` (ou mande para o Claude).

Os e-mails de confirmação saem do Gmail da campanha, com o nome "Cartinhas de Natal · Educandário São Luiz".
Para receber uma cópia oculta de cada confirmação, preencha `EMAIL_COPIA` no Code.gs.

## Parte 2: GitHub Pages

Em **Settings > Pages** do repositório: Source = "Deploy from a branch", Branch = `main`, pasta `/ (root)`.
O link fica: `https://thiagoflach.github.io/cartinhas-natal-educandario/`

## Depois de publicado
- Se mudar o Code.gs: **Implantar > Gerenciar implantações > editar (lápis) > Versão: Nova versão**. Assim o link `/exec` continua o mesmo.
- Criança nova: basta adicionar a linha na planilha. Para um apelido personalizado, inclua o nome em `PERFIS` no Code.gs.
- Liberar uma cartinha de novo: troque ADOTADO para "Não" e apague Nome, E-mail e Telefone.
- Limite do Gmail gratuito: 100 e-mails por dia.

## O que o script escreve na planilha
Só as colunas **B (ADOTADO = "SIM")**, **I (Nome)**, **J (E-mail)** e **K (Telefone)**. O resto é só lido.
A página mostra só o primeiro nome e a inicial do sobrenome. O nome completo vai apenas no e-mail para o padrinho ou a madrinha.
