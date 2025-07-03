/**
 * Script para configuração inicial da autenticação Google Calendar
 * Execute este script apenas uma vez para configurar o OAuth2
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Caminhos dos arquivos - Priorizar diretório seguro do Replit
const REPLIT_WORKSPACE = '/home/runner/workspace';
const CREDENTIALS_FILENAME = 'client_secret_223567033178-kcji8j786j0t8odqtc7f5lqu5s8b11mr.apps.googleusercontent.com.json';

const CREDENTIALS_PATH = fs.existsSync(path.join(REPLIT_WORKSPACE, CREDENTIALS_FILENAME)) 
  ? path.join(REPLIT_WORKSPACE, CREDENTIALS_FILENAME)
  : `./${CREDENTIALS_FILENAME}`;

const TOKEN_PATH = fs.existsSync(REPLIT_WORKSPACE) 
  ? path.join(REPLIT_WORKSPACE, 'token.json')
  : './token.json';

/**
 * Carrega as credenciais do cliente
 */
function carregarCredenciais() {
  try {
    return JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  } catch (error) {
    console.error('Erro ao carregar credenciais:', error.message);
    console.log('\n❌ Certifique-se de que o arquivo de credenciais está na raiz do projeto:');
    console.log('   client_secret_223567033178-kcji8j786j0t8odqtc7f5lqu5s8b11mr.apps.googleusercontent.com.json');
    process.exit(1);
  }
}

/**
 * Cria o cliente OAuth2
 */
function criarClienteOAuth2(credentials) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
}

/**
 * Gera a URL de autorização
 */
function gerarUrlAutorizacao(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
  });
  return authUrl;
}

/**
 * Lê a entrada do usuário
 */
function lerEntradaUsuario(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Obtém o token de acesso
 */
async function obterToken(oAuth2Client, code) {
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    
    // Salvar token para uso futuro
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    console.log('✅ Token salvo em:', TOKEN_PATH);
    
    return tokens;
  } catch (error) {
    console.error('❌ Erro ao obter token:', error.message);
    throw error;
  }
}

/**
 * Testa a conexão com o Google Calendar
 */
async function testarConexao(oAuth2Client) {
  try {
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    
    // Listar calendários para testar
    const response = await calendar.calendarList.list();
    
    console.log('\n✅ Conexão com Google Calendar estabelecida com sucesso!');
    console.log('📅 Calendários disponíveis:');
    
    response.data.items.forEach((calendar, index) => {
      console.log(`   ${index + 1}. ${calendar.summary} (${calendar.id})`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao testar conexão:', error.message);
    return false;
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Configuração do Google Calendar API para WhatsAuto Servidor\n');
  
  // Verificar se o token já existe
  if (fs.existsSync(TOKEN_PATH)) {
    console.log('⚠️  Token já existe em:', TOKEN_PATH);
    const resposta = await lerEntradaUsuario('Deseja reconfigurar? (s/n): ');
    
    if (resposta.toLowerCase() !== 's' && resposta.toLowerCase() !== 'sim') {
      console.log('ℹ️  Configuração cancelada.');
      process.exit(0);
    }
  }
  
  try {
    // 1. Carregar credenciais
    console.log('📋 Carregando credenciais...');
    const credentials = carregarCredenciais();
    console.log('✅ Credenciais carregadas');
    
    // 2. Criar cliente OAuth2
    const oAuth2Client = criarClienteOAuth2(credentials);
    
    // 3. Gerar URL de autorização
    const authUrl = gerarUrlAutorizacao(oAuth2Client);
    
    console.log('\n🔗 Acesse a URL abaixo para autorizar o aplicativo:');
    console.log('\n' + authUrl + '\n');
    
    // 4. Solicitar código de autorização
    const code = await lerEntradaUsuario('Cole o código de autorização aqui: ');
    
    // 5. Obter e salvar token
    console.log('\n⏳ Obtendo token de acesso...');
    await obterToken(oAuth2Client, code);
    
    // 6. Testar conexão
    console.log('\n🔍 Testando conexão...');
    const sucesso = await testarConexao(oAuth2Client);
    
    if (sucesso) {
      console.log('\n🎉 Configuração concluída com sucesso!');
      console.log('✅ O sistema de agendamento está pronto para uso.');
      console.log('\n📌 Próximos passos:');
      console.log('   1. Execute: npm install (se ainda não executou)');
      console.log('   2. Execute: npm start');
      console.log('   3. Teste a opção 8 no chatbot');
    } else {
      console.log('\n❌ Configuração falhou. Verifique as credenciais e tente novamente.');
    }
    
  } catch (error) {
    console.error('\n❌ Erro durante a configuração:', error.message);
    console.log('\n💡 Dicas para resolução:');
    console.log('   - Verifique se o arquivo de credenciais está correto');
    console.log('   - Certifique-se de que a API do Google Calendar está ativada');
    console.log('   - Verifique se as URLs de redirecionamento estão configuradas');
    process.exit(1);
  }
}

// Verificar se está sendo executado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  carregarCredenciais,
  criarClienteOAuth2,
  gerarUrlAutorizacao,
  obterToken,
  testarConexao
};
