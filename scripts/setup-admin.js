const { Database } = require('../src/database/database');
const bcrypt = require('bcrypt');
const readline = require('readline');

/**
 * Script para criar o primeiro usuário administrador
 */
async function setupAdmin() {
  const db = new Database();
  await db.init();
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('🔧 Setup do primeiro usuário administrador');
  console.log('=====================================\n');

  // Perguntar dados do admin
  const username = await question(rl, 'Digite o nome de usuário: ');
  const password = await question(rl, 'Digite a senha: ', true);
  const email = await question(rl, 'Digite o email (opcional): ');

  if (!username || !password) {
    console.log('❌ Nome de usuário e senha são obrigatórios!');
    process.exit(1);
  }

  try {
    // Verificar se já existe admin
    const existingAdmin = await db.get('SELECT id FROM admin_users WHERE username = ?', [username]);
    
    if (existingAdmin) {
      console.log('❌ Usuário já existe!');
      process.exit(1);
    }

    // Criar hash da senha
    const passwordHash = bcrypt.hashSync(password, 10);

    // Inserir admin
    await db.run(
      'INSERT INTO admin_users (username, password_hash, email) VALUES (?, ?, ?)',
      [username, passwordHash, email || null]
    );

    console.log('✅ Usuário administrador criado com sucesso!');
    console.log(`👤 Usuário: ${username}`);
    console.log(`📧 Email: ${email || 'Não informado'}`);
    console.log('\n🌐 Acesse o dashboard em: http://localhost:3000/admin');
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error);
    process.exit(1);
  } finally {
    await db.close();
    rl.close();
  }
}

function question(rl, prompt, hideInput = false) {
  return new Promise((resolve) => {
    if (hideInput) {
      // Ocultar entrada de senha
      rl.question(prompt, (answer) => {
        resolve(answer);
      });
      rl.input.on('keypress', () => {
        const len = rl.line.length;
        readline.moveCursor(process.stdout, -len, 0);
        readline.clearLine(process.stdout, 1);
        for (let i = 0; i < len; i++) {
          process.stdout.write('*');
        }
      });
    } else {
      rl.question(prompt, (answer) => {
        resolve(answer);
      });
    }
  });
}

// Executar setup
setupAdmin().catch(console.error);
