require("dotenv").config();
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const fs = require("fs");
const readline = require("readline");

// Configuração do Telegram (usando conta normal)
const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const phoneNumber = process.env.TELEGRAM_PHONE;
const sessionFile = "session.json";
const replacementsFile = "replacements.json";
const configFile = "config.json";
let sessionString = "";
let replacements = [];
let config = {
  sourceGroupUsername: "", // Valor padrão
  targetGroupId: parseInt(process.env.MY_GROUP_ID), // Valor do .env
};

// Configura interface de readline para prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Função helper para perguntar ao usuário
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Verifica se já existe uma sessão salva
if (fs.existsSync(sessionFile)) {
  sessionString = fs.readFileSync(sessionFile, "utf-8").trim();
}

// Carrega substituições salvas
if (fs.existsSync(replacementsFile)) {
  try {
    replacements = JSON.parse(fs.readFileSync(replacementsFile, "utf-8"));
    console.log(`📋 ${replacements.length} substituições carregadas!`);
  } catch (error) {
    console.error("Erro ao carregar substituições:", error);
    replacements = [];
  }
}

// Carrega configuração salva
if (fs.existsSync(configFile)) {
  try {
    config = JSON.parse(fs.readFileSync(configFile, "utf-8"));
    console.log(
      `⚙️ Configuração carregada: Monitorando grupo ${config.sourceGroupUsername}`
    );
  } catch (error) {
    console.error("Erro ao carregar configuração:", error);
  }
}

const session = new StringSession(sessionString);
const client = new TelegramClient(session, apiId, apiHash, {
  connectionRetries: 5,
});

// Função para salvar as substituições
function saveReplacements() {
  fs.writeFileSync(
    replacementsFile,
    JSON.stringify(replacements, null, 2),
    "utf-8"
  );
  console.log(
    `✅ ${replacements.length} substituições salvas em ${replacementsFile}`
  );
}

// Função para salvar a configuração
function saveConfig() {
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2), "utf-8");
  console.log(`✅ Configuração salva em ${configFile}`);
}

// Função para aplicar substituições no texto
function applyReplacements(text) {
  let modifiedText = text;
  for (const replacement of replacements) {
    try {
      modifiedText = modifiedText.replace(
        new RegExp(replacement.original, "gi"),
        replacement.replace
      );
    } catch (error) {
      console.error(
        `Erro ao aplicar substituição "${replacement.original}": ${error.message}`
      );
    }
  }
  return modifiedText;
}

// Função para gerenciar substituições via console
async function manageReplacements() {
  while (true) {
    console.log("\n=== GERENCIADOR DE SUBSTITUIÇÕES DE TEXTO ===");
    console.log("1. Ver todas as substituições");
    console.log("2. Adicionar nova substituição");
    console.log("3. Remover substituição");
    console.log("4. Voltar ao monitoramento");

    const choice = await askQuestion("Escolha uma opção (1-4): ");

    switch (choice) {
      case "1":
        if (replacements.length === 0) {
          console.log("📋 Nenhuma substituição cadastrada.");
        } else {
          console.log("\n📋 SUBSTITUIÇÕES ATUAIS:");
          replacements.forEach((r, i) => {
            console.log(`${i + 1}. "${r.original}" -> "${r.replace}"`);
          });
        }
        break;

      case "2":
        const original = await askQuestion(
          "Texto original a ser substituído: "
        );
        const replace = await askQuestion("Novo texto que substituirá: ");
        replacements.push({ original, replace });
        saveReplacements();
        console.log(
          `✅ Substituição adicionada: "${original}" -> "${replace}"`
        );
        break;

      case "3":
        if (replacements.length === 0) {
          console.log("❌ Nenhuma substituição para remover.");
          break;
        }

        console.log("\n📋 SUBSTITUIÇÕES ATUAIS:");
        replacements.forEach((r, i) => {
          console.log(`${i + 1}. "${r.original}" -> "${r.replace}"`);
        });

        const indexStr = await askQuestion(
          "Digite o número da substituição a remover: "
        );
        const index = parseInt(indexStr) - 1;

        if (isNaN(index) || index < 0 || index >= replacements.length) {
          console.log("❌ Número inválido!");
        } else {
          const removed = replacements.splice(index, 1)[0];
          saveReplacements();
          console.log(
            `✅ Substituição removida: "${removed.original}" -> "${removed.replace}"`
          );
        }
        break;

      case "4":
        console.log("🔄 Voltando ao monitoramento de mensagens...");
        return;

      default:
        console.log("❌ Opção inválida!");
    }
  }
}

// Função para configurar grupos
async function configureGroups() {
  console.log("\n=== CONFIGURAÇÃO DE GRUPOS ===");

  // Configurar grupo fonte
  const sourceGroup = await askQuestion(
    `Digite o nome de usuário do grupo fonte (atual: ${config.sourceGroupUsername}): `
  );
  if (sourceGroup && sourceGroup.trim() !== "") {
    // Adiciona @ se o usuário não incluiu
    config.sourceGroupUsername = sourceGroup.startsWith("@")
      ? sourceGroup
      : `@${sourceGroup}`;
  }

  // Configurar grupo destino
  const targetGroupIdStr = await askQuestion(
    `Digite o ID do grupo destino (atual: ${config.targetGroupId}): `
  );
  if (targetGroupIdStr && targetGroupIdStr.trim() !== "") {
    const targetGroupId = parseInt(targetGroupIdStr);
    if (!isNaN(targetGroupId)) {
      config.targetGroupId = targetGroupId;
    } else {
      console.log("❌ ID de grupo inválido, mantendo o valor atual.");
    }
  }

  saveConfig();
  console.log(
    `✅ Configuração atualizada: Monitorando mensagens de ${config.sourceGroupUsername} para o grupo ID ${config.targetGroupId}`
  );
}

(async () => {
  console.log("📲 Conectando ao Telegram...");

  // Inicializa o cliente Telegram com interação via readline
  await client.start({
    phoneNumber: async () =>
      await askQuestion("Digite seu número de telefone: "),
    password: async () =>
      await askQuestion("Digite sua senha 2FA (se tiver): "),
    phoneCode: async () =>
      await askQuestion("Digite o código enviado pelo Telegram: "),
    onError: (err) => console.error("Erro:", err),
  });

  console.log("✅ Conectado como usuário normal!");

  // 🔥 Salva a sessão para evitar login toda vez 🔥
  fs.writeFileSync(sessionFile, client.session.save(), "utf-8");
  console.log("🔐 Sessão salva em session.json!");

  // Configurar grupos
  const setupGroups = await askQuestion(
    "Deseja configurar os grupos de monitoramento? (s/n): "
  );
  if (setupGroups.toLowerCase() === "s") {
    await configureGroups();
  }

  // Opção para gerenciar as substituições antes de iniciar o monitoramento
  const setupReplacements = await askQuestion(
    "Deseja configurar substituições de texto agora? (s/n): "
  );
  if (setupReplacements.toLowerCase() === "s") {
    await manageReplacements();
  }

  // Monitora novas mensagens no grupo
  client.addEventHandler(async (event) => {
    const message = event.message;
    if (!message || !message.peerId) return;

    try {
      // Obtém o chat (grupo) da mensagem
      const chat = await client.getEntity(message.peerId);
      const sourceUsername = config.sourceGroupUsername.replace("@", "");

      if (chat.username !== sourceUsername) return;

      // Verifica se há conteúdo de mensagem
      if (message.message) {
        // Aplica as substituições de texto
        const originalText = message.message;
        const modifiedText = applyReplacements(originalText);

        // Envia apenas o conteúdo modificado, sem prefixo
        await client.sendMessage(config.targetGroupId, {
          message: modifiedText,
          parseMode: "md",
        });

        console.log("📩 Mensagem processada e enviada");
      }
    } catch (error) {
      console.error("Erro ao processar mensagem:", error);
    }
  });

  console.log(
    `🚀 Monitorando mensagens no grupo ${config.sourceGroupUsername}...`
  );
  console.log(`📝 Comandos disponíveis:`);
  console.log(`   - "substituir": Gerenciar substituições de texto`);
  console.log(`   - "grupos": Configurar grupos de monitoramento`);

  // Permite gerenciar durante a execução
  rl.on("line", async (line) => {
    const command = line.toLowerCase().trim();

    if (command === "substituir") {
      await manageReplacements();
      console.log(
        `🚀 Continuando monitoramento com ${replacements.length} substituições...`
      );
    } else if (command === "grupos") {
      await configureGroups();
      console.log(
        `🚀 Continuando monitoramento no grupo ${config.sourceGroupUsername}...`
      );
    }
  });
})();

// Tratamento de encerramento adequado
process.on("SIGINT", () => {
  console.log("\n👋 Encerrando o bot...");
  rl.close();
  process.exit(0);
});
