# Telegram Message Forwarder

Um bot simples que repassa mensagens de um grupo do Telegram para outro.

## Configuração

1. Instale as dependências:

```bash
npm install
```

2. Crie um arquivo `.env` baseado no `.env.example` e preencha com suas informações:

- `TELEGRAM_BOT_TOKEN`: Token do seu bot (obtido com o @BotFather)
- `SOURCE_GROUP_ID`: ID do grupo de origem
- `TARGET_GROUP_ID`: ID do grupo de destino

## Como obter os IDs dos grupos

1. Adicione o bot aos dois grupos
2. Envie uma mensagem em cada grupo
3. Acesse: `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates`
4. Procure o `chat.id` de cada grupo nas respostas

## Como executar

```bash
npm start
```

## Funcionamento

O bot irá:

1. Monitorar mensagens no grupo de origem
2. Automaticamente repassar todas as mensagens para o grupo de destino
3. Registrar no console quando uma mensagem for repassada com sucesso ou se houver algum erro
