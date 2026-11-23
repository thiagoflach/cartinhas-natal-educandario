/**
 * @OnlyCurrentDoc
 * (Esta anotação faz o Google pedir acesso SOMENTE a esta planilha, e não a todas as suas.)
 *
 * Campanha de Apadrinhamento das Cartinhas de Natal (2026)
 * Educandário São Luiz — Porto Alegre/RS
 *
 * Este script fica DENTRO da planilha (Extensões > Apps Script).
 * Ele é a API da landing page (hospedada no GitHub Pages): lê as crianças
 * da planilha, registra o padrinho/madrinha e envia o e-mail de confirmação.
 *
 * Colunas que o script ESCREVE (somente estas):
 *   B = ADOTADO (Sim/Não)   I = Nome   J = E-mail   K = Telefone (WhatsApp)
 * Todas as outras colunas são apenas lidas.
 */

// ===================== CONFIGURAÇÃO =====================
var CONFIG = {
  SHEET_NAME: 'Plan1',
  FIRST_DATA_ROW: 3,           // linha 1 = "PADRINHO / MADRINHA", linha 2 = cabeçalhos
  COL: {                       // números de coluna (A = 1)
    NOME: 1, ADOTADO: 2, IDADE: 3, PE: 4, ROUPA: 5,
    DESEJO1: 6, DESEJO2: 7, DESEJO3: 8,
    PADRINHO_NOME: 9, PADRINHO_EMAIL: 10, PADRINHO_TELEFONE: 11
  },
  // E-mail que recebe uma cópia oculta de cada confirmação ('' = nenhum).
  EMAIL_COPIA: '',
  NOME_REMETENTE: 'Cartinhas de Natal · Educandário São Luiz',
  CONTATO_TELEFONE: '(51) 98311-0020',
  CONTATO_WHATSAPP: '5551983110020',
  DATA_LIMITE: '4 de dezembro (sexta-feira)',
  DATA_ENTREGA_CRIANCAS: '12 de dezembro (sábado)',
  ENDERECO: 'R. Nicolau Coelho, 58 - Vila Ipiranga, Porto Alegre/RS',
  HORARIO: 'de segunda a sexta, das 8:30 às 16:50',
  MAPA_URL: 'https://maps.app.goo.gl/eDosKJzwDyscgrPQ6'
};

/**
 * Perfil de cada criança: gênero (para o bonequinho/bonequinha) e o apelido
 * carinhoso mostrado no envelope. Crianças novas que não estiverem aqui
 * recebem um apelido genérico e o gênero é deduzido pelo primeiro nome.
 */
var PERFIS = {
  'agatha fernandes':      { genero: 'F', apelido: 'Estilosa do Pretinho Básico' },
  'bryan lucca cruz':      { genero: 'M', apelido: 'Torcedor do Barça' },
  'cleomar cezar':         { genero: 'M', apelido: 'Boleiro de Coração Azul' },
  'henrique beal':         { genero: 'M', apelido: 'Fã do Batman e do One Piece' },
  'isaac soares':          { genero: 'M', apelido: 'Piloto Veloz e Craque da Bola' },
  'joao miguel rodrigues': { genero: 'M', apelido: 'Craque do Futsal, Fã de Portugal' },
  'joao miguel zanini':    { genero: 'M', apelido: 'Rei dos Squishies' },
  'lara antonia euzebio':  { genero: 'F', apelido: 'Atleta Multiesportes' },
  'lara ellen tomaz':      { genero: 'F', apelido: 'Artista da Make e do Desenho' },
  'pierry belmonte':       { genero: 'M', apelido: 'Pequeno Homem-Aranha Boleiro' }
};

var APELIDOS_GENERICOS = ['Coração Cheio de Sonhos', 'Sorriso que Ilumina', 'Pura Alegria'];

// Nomes próprios que devem manter maiúsculas ao formatar os desejos
var NOMES_PROPRIOS = ['Barcelona', 'Batman', 'One Piece', 'Portugal', 'Homem-Aranha',
  'All Star', 'Afropaty', 'Trionda', 'Butter', 'Squishy'];

// ===================== API (usada pela página no GitHub Pages) =====================
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** GET ?acao=lista  -> lista pública das crianças */
function doGet(e) {
  try {
    var acao = e && e.parameter && e.parameter.acao;
    if (acao === 'lista') return json_(getCriancas());
    return json_({ ok: true, info: 'API das Cartinhas de Natal. Use ?acao=lista' });
  } catch (err) {
    return json_({ erroInterno: String(err) });
  }
}

/** POST (corpo JSON: { id, nomeCrianca, nome, email, telefone }) -> apadrinha */
function doPost(e) {
  try {
    var dados = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    return json_(apadrinhar(dados));
  } catch (err) {
    return json_({ erroInterno: String(err) });
  }
}

// ===================== LEITURA =====================
function getSheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
}

function semAcento_(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function formatarDesejo_(texto) {
  var t = String(texto || '').trim().toLowerCase();
  if (!t) return '';
  t = t.charAt(0).toUpperCase() + t.slice(1);
  NOMES_PROPRIOS.forEach(function (np) {
    t = t.replace(new RegExp(np.replace('-', '\\-'), 'ig'), np);
  });
  return t;
}

function deduzirGenero_(nome) {
  var primeiro = semAcento_(nome).split(' ')[0];
  var femininosSemA = ['beatriz', 'raquel', 'isabel', 'ester', 'ruth', 'rute', 'liz', 'alice', 'yasmin', 'kemily', 'emily', 'nicole', 'evelyn', 'ingrid', 'agnes', 'esther', 'rachel', 'mel', 'sophie', 'maite', 'lis'];
  var masculinosComA = ['luca', 'joshua', 'noah', 'elias', 'jonas', 'nicolas', 'lucas', 'mateus', 'tomas'];
  if (femininosSemA.indexOf(primeiro) >= 0) return 'F';
  if (masculinosComA.indexOf(primeiro) >= 0) return 'M';
  return /a$/.test(primeiro) ? 'F' : 'M';
}

function linhaParaCrianca_(row, numeroLinha) {
  var c = CONFIG.COL;
  var nome = String(row[c.NOME - 1] || '').trim();
  if (!nome) return null;
  var chave = semAcento_(nome);
  var perfil = PERFIS[chave] || {};
  var desejos = [row[c.DESEJO1 - 1], row[c.DESEJO2 - 1], row[c.DESEJO3 - 1]]
    .map(formatarDesejo_).filter(function (d) { return d; });
  var partes = nome.split(/\s+/);
  // Na página mostramos só "Nome (+ segundo nome) + inicial do sobrenome", para proteger as crianças.
  var nomeExibicao = partes.length > 1
    ? partes.slice(0, -1).join(' ') + ' ' + partes[partes.length - 1].charAt(0).toUpperCase() + '.'
    : nome;
  return {
    id: numeroLinha,
    nome: nome,
    nomeExibicao: nomeExibicao,
    primeiroNome: nome.split(/\s+/)[0],
    idade: String(row[c.IDADE - 1] || '').trim(),
    pe: String(row[c.PE - 1] || '').trim(),
    roupa: String(row[c.ROUPA - 1] || '').trim(),
    desejos: desejos,
    adotado: semAcento_(row[c.ADOTADO - 1]) === 'sim',
    genero: perfil.genero || deduzirGenero_(nome),
    apelido: perfil.apelido || APELIDOS_GENERICOS[numeroLinha % APELIDOS_GENERICOS.length]
  };
}

/** Chamado pela página. Retorna só dados públicos (nunca os dados dos padrinhos). */
function getCriancas() {
  var sh = getSheet_();
  var ultima = sh.getLastRow();
  if (ultima < CONFIG.FIRST_DATA_ROW) return [];
  var valores = sh.getRange(CONFIG.FIRST_DATA_ROW, 1, ultima - CONFIG.FIRST_DATA_ROW + 1, CONFIG.COL.DESEJO3).getValues();
  var lista = [];
  valores.forEach(function (row, i) {
    var crianca = linhaParaCrianca_(row, CONFIG.FIRST_DATA_ROW + i);
    if (crianca) {
      delete crianca.nome; // o nome completo não sai da planilha (só vai no e-mail ao padrinho)
      lista.push(crianca);
    }
  });
  return lista;
}

// ===================== APADRINHAMENTO =====================
/**
 * Chamado pela página quando alguém confirma o apadrinhamento.
 * dados = { id, nomeCrianca, nome, email, telefone }
 */
function apadrinhar(dados) {
  dados = dados || {};
  var nome = String(dados.nome || '').trim();
  var email = String(dados.email || '').trim();
  var telefone = String(dados.telefone || '').trim();
  var digitos = telefone.replace(/\D/g, '');

  if (nome.length < 3 || nome.split(/\s+/).length < 2) return { ok: false, erro: 'Por favor, informe seu nome completo.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, erro: 'Esse e-mail não parece válido. Pode conferir?' };
  if (digitos.length < 10 || digitos.length > 13) return { ok: false, erro: 'Informe um telefone com DDD, por favor.' };

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, erro: 'Muita gente apadrinhando ao mesmo tempo! Tente de novo em alguns segundos.' };

  var crianca;
  try {
    var sh = getSheet_();
    var linha = Number(dados.id);
    if (!(linha >= CONFIG.FIRST_DATA_ROW)) return { ok: false, erro: 'Cartinha não encontrada.' };
    var row = sh.getRange(linha, 1, 1, CONFIG.COL.DESEJO3).getValues()[0];
    crianca = linhaParaCrianca_(row, linha);
    // confere que a linha ainda é da mesma criança (caso a planilha tenha sido reordenada)
    if (!crianca || semAcento_(crianca.nomeExibicao) !== semAcento_(dados.nomeCrianca)) {
      return { ok: false, erro: 'A lista foi atualizada. Recarregue a página e tente novamente.', recarregar: true };
    }
    if (crianca.adotado) {
      return { ok: false, erro: 'Que pena! ' + crianca.primeiroNome + ' acabou de ser apadrinhad' + (crianca.genero === 'F' ? 'a' : 'o') + ' por outra pessoa. Escolha outra cartinha 💛', recarregar: true };
    }
    // Escreve SOMENTE as colunas autorizadas: B, I, J, K
    sh.getRange(linha, CONFIG.COL.ADOTADO).setValue('SIM');
    sh.getRange(linha, CONFIG.COL.PADRINHO_NOME, 1, 3).setValues([[nome, email, telefone]]);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  var emailEnviado = true;
  try {
    enviarEmailConfirmacao_(crianca, { nome: nome, email: email, telefone: telefone });
  } catch (e) {
    emailEnviado = false;
    console.error('Falha ao enviar e-mail: ' + e);
  }
  return { ok: true, emailEnviado: emailEnviado };
}

// ===================== E-MAIL =====================
function esc_(s) {
  return String(s || '').replace(/[&<>"']/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}

function enviarEmailConfirmacao_(crianca, padrinho) {
  var ela = crianca.genero === 'F';
  var artigo = ela ? 'a' : 'o';
  var primeiroPadrinho = padrinho.nome.split(/\s+/)[0];

  var tamanhos = [];
  if (crianca.roupa) tamanhos.push('<li><b>Roupa:</b> ' + esc_(crianca.roupa) + '</li>');
  if (crianca.pe) tamanhos.push('<li><b>Calçado:</b> ' + esc_(crianca.pe) + '</li>');

  var html =
    '<div style="background:#fff7ec;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#22284f">' +
    '<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #f1dcc0">' +
      '<div style="background:#1d2a6b;padding:26px 24px;text-align:center;color:#ffffff">' +
        '<div style="font-size:34px;line-height:1">⭐</div>' +
        '<div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#ffd36b;margin-top:6px">Educandário São Luiz</div>' +
        '<div style="font-size:22px;font-weight:bold;margin-top:6px">Campanha de Apadrinhamento das Cartinhas de Natal (2026)</div>' +
      '</div>' +
      '<div style="padding:26px 24px;font-size:15px;line-height:1.6">' +
        '<p style="font-size:18px;margin:0 0 12px">Olá, <b>' + esc_(primeiroPadrinho) + '</b>! 🎄</p>' +
        '<p style="margin:0 0 12px">Muito obrigado! Seu apadrinhamento está <b>confirmado</b>. Você agora é padrinho/madrinha de <b>' + esc_(crianca.nome) + '</b>, e esse gesto vai iluminar o Natal de ' + (ela ? 'uma menina' : 'um menino') + ' muito especial.</p>' +

        '<div style="background:#fff3d6;border:2px dashed #f2b632;border-radius:14px;padding:16px 18px;margin:18px 0">' +
          '<div style="font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#c2410c;font-weight:bold">A cartinha d' + artigo + ' ' + esc_(crianca.primeiroNome) + '</div>' +
          '<ul style="margin:10px 0 0;padding-left:20px">' +
            '<li><b>Nome:</b> ' + esc_(crianca.nome) + '</li>' +
            '<li><b>Idade:</b> ' + esc_(crianca.idade) + ' anos</li>' +
            tamanhos.join('') +
          '</ul>' +
          '<p style="margin:12px 0 4px"><b>Pedidos de Natal</b> (você pode escolher um ou todos):</p>' +
          '<ul style="margin:0;padding-left:20px">' +
            crianca.desejos.map(function (d) { return '<li>🎁 ' + esc_(d) + '</li>'; }).join('') +
          '</ul>' +
        '</div>' +

        '<p style="margin:0 0 8px;font-size:16px;color:#e11d48"><b>📅 Entregue o presente até ' + esc_(CONFIG.DATA_LIMITE) + '</b></p>' +
        '<p style="margin:0 0 12px">Os presentes serão entregues às crianças no dia <b>' + esc_(CONFIG.DATA_ENTREGA_CRIANCAS) + '</b>.</p>' +
        '<p style="margin:0 0 6px"><b>📍 Onde entregar:</b> Educandário São Luiz<br>' + esc_(CONFIG.ENDERECO) + '<br>' +
          '<a href="' + CONFIG.MAPA_URL + '" style="color:#1d4ed8">Abrir no mapa</a></p>' +
        '<p style="margin:0 0 6px"><b>🕗 Horário:</b> ' + esc_(CONFIG.HORARIO) + '</p>' +
        '<p style="margin:0 0 18px"><b>📞 Dúvidas (entrega, detalhes etc.):</b> ' + esc_(CONFIG.CONTATO_TELEFONE) +
          ' · <a href="https://wa.me/' + CONFIG.CONTATO_WHATSAPP + '" style="color:#16a34a">WhatsApp</a></p>' +
        '<p style="margin:0 0 6px;background:#eef6ee;border-radius:10px;padding:10px 12px;font-size:14px">💡 Dica: identifique o pacote com o nome <b>' + esc_(crianca.nome) + '</b> para garantir que o presente chegue certinho.</p>' +
        '<p style="margin:18px 0 0">Que a alegria do Menino Jesus encha sua casa neste Natal! ✨</p>' +
        '<p style="margin:4px 0 0">Com carinho,<br><b>Educandário São Luiz · Rede Guanelliana</b></p>' +
      '</div>' +
    '</div>' +
    '<p style="text-align:center;font-size:12px;color:#8a8fb0;margin-top:12px">Seus dados de cadastro: ' + esc_(padrinho.nome) + ' · ' + esc_(padrinho.email) + ' · ' + esc_(padrinho.telefone) + '</p>' +
    '</div>';

  var texto = 'Olá, ' + primeiroPadrinho + '!\n\n' +
    'Seu apadrinhamento está confirmado: ' + crianca.nome + ' (' + crianca.idade + ' anos).\n' +
    (crianca.roupa ? 'Roupa: ' + crianca.roupa + '\n' : '') +
    (crianca.pe ? 'Calçado: ' + crianca.pe + '\n' : '') +
    'Pedidos (um ou todos): ' + crianca.desejos.join(', ') + '\n\n' +
    'Entregue até ' + CONFIG.DATA_LIMITE + '. Entrega às crianças: ' + CONFIG.DATA_ENTREGA_CRIANCAS + '.\n' +
    'Local: Educandário São Luiz, ' + CONFIG.ENDERECO + ' (' + CONFIG.HORARIO + ').\n' +
    'Dúvidas: ' + CONFIG.CONTATO_TELEFONE + '\n\nObrigado e Feliz Natal!';

  var opcoes = {
    to: padrinho.email,
    subject: '🎄 Apadrinhamento confirmado: ' + crianca.nome + ' · Cartinhas de Natal 2026',
    body: texto,
    htmlBody: html,
    name: CONFIG.NOME_REMETENTE
  };
  if (CONFIG.EMAIL_COPIA) opcoes.bcc = CONFIG.EMAIL_COPIA;
  MailApp.sendEmail(opcoes);
}

/** Rode esta função uma vez pelo editor para autorizar o script e conferir a leitura. */
function testarLeitura() {
  console.log(JSON.stringify(getCriancas(), null, 2));
}
