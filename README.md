# Como publicar

A página fica no **GitHub Pages** (repositório `thiagoflach/cartinhas-natal`).
A planilha e os e-mails ficam com um **Google Apps Script** na sua conta Google, que funciona como a "API" da página.
O GitHub não consegue gravar na planilha nem mandar e-mail, por isso as duas partes são necessárias.

## Parte 1: Apps Script (só você consegue fazer, uns 5 minutos)

1. Abra a planilha **2026 - Cartinhas de Natal** > **Extensões > Apps Script**.
2. No arquivo `Código.gs`, apague tudo e cole o conteúdo de **Code.gs** (está no repositório, em `apps-script/Code.gs`).
3. Salve. No menu de funções lá em cima, escolha **testarLeitura** e clique em **Executar**.
   O Google vai pedir autorização: escolha sua conta > "Avançado" > "Acessar projeto (não seguro)" > Permitir.
   (O aviso aparece porque o script é seu e não passou por verificação do Google. É normal.)
4. **Implantar > Nova implantação** > engrenagem > **App da Web**:
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
5. Clique em **Implantar** e copie o **URL do app da Web** (termina em `/exec`). Mande esse link para o Claude, que coloca na página.
   (Ou edite você mesmo a linha `var API_URL = '';` do `index.html`.)

Os e-mails de confirmação saem do Gmail da conta que fez a implantação, com o nome
"Cartinhas de Natal · Educandário São Luiz". Você recebe uma cópia oculta de cada um.

## Parte 2: GitHub Pages

Em **Settings > Pages** do repositório: Source = "Deploy from a branch", Branch = `main`, pasta `/ (root)`.
O link fica: `https://thiagoflach.github.io/cartinhas-natal/`

## Depois de publicado
- Se mudar o Code.gs: **Implantar > Gerenciar implantações > editar (lápis) > Versão: Nova versão**. Assim o link `/exec` continua o mesmo.
- Criança nova: basta adicionar a linha na planilha. Para um apelido personalizado, inclua o nome em `PERFIS` no Code.gs.
- Liberar uma cartinha de novo: troque ADOTADO para "Não" e apague Nome, E-mail e Telefone.
- Limite do Gmail gratuito: 100 e-mails por dia.

## O que o script escreve na planilha
Só as colunas **B (ADOTADO = "SIM")**, **I (Nome)**, **J (E-mail)** e **K (Telefone)**. O resto é só lido.
A página mostra só o primeiro nome e a inicial do sobrenome. O nome completo vai apenas no e-mail para o padrinho ou a madrinha.
