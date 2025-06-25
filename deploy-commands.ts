import 'dotenv/config';

interface SlashCommand {
  name: string;
  description: string;
  options?: Array<{
    type: number;
    name: string;
    description: string;
    required: boolean;
  }>;
}

const commands: SlashCommand[] = [
  {
    name: 'remind',
    description: 'リマインダーを設定します',
    options: [
      {
        type: 3, // STRING
        name: 'message',
        description: 'リマインダーのメッセージ',
        required: true,
      },
      {
        type: 3, // STRING
        name: 'time',
        description: '時間を指定 (例: 5m, 1h, 2d, 2024-12-25, 2024-12-25 14:30)',
        required: true,
      },
    ],
  },
  {
    name: 'reminders',
    description: '設定中のリマインダー一覧を表示します',
  },
];

async function deployCommands(): Promise<void> {
  const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
  const DISCORD_APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
  const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

  if (!DISCORD_TOKEN || !DISCORD_APPLICATION_ID) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  const url = DISCORD_GUILD_ID
    ? `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/guilds/${DISCORD_GUILD_ID}/commands`
    : `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/commands`;

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${DISCORD_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    console.log(`Successfully deployed ${(result as SlashCommand[]).length} commands`);
  } catch (error) {
    console.error('Error deploying commands:', error);
    process.exit(1);
  }
}

deployCommands().catch(console.error);