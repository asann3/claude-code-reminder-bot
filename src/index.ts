import { verifyKey } from 'discord-interactions';
import { handleRemindCommand, handleRemindersCommand } from './commands';
import { ReminderStorage } from './storage';
import type { CommandResponse, DiscordInteraction, Environment } from './types';

export { ReminderStorage };

export default {
  async fetch(request: Request, env: Environment): Promise<Response> {
    if (request.method === 'POST') {
      return await handleDiscordInteraction(request, env);
    }

    if (request.method === 'GET' && new URL(request.url).pathname === '/') {
      return new Response('Discord Reminder Bot is running!');
    }

    return new Response('Not found', { status: 404 });
  },

  async scheduled(event: ScheduledEvent, env: Environment): Promise<void> {
    await processReminders(env);
  },
};

async function handleDiscordInteraction(
  request: Request,
  env: Environment
): Promise<Response> {
  const signature = request.headers.get('X-Signature-Ed25519');
  const timestamp = request.headers.get('X-Signature-Timestamp');
  const body = await request.text();

  if (!signature || !timestamp) {
    return new Response('Missing headers', { status: 401 });
  }

  const isValid = verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);

  if (!isValid) {
    return new Response('Invalid signature', { status: 401 });
  }

  const interaction = JSON.parse(body) as DiscordInteraction;

  if (interaction.type === 1) {
    return new Response(JSON.stringify({ type: 1 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (interaction.type === 2) {
    const commandName = interaction.data?.name;
    let response: CommandResponse;

    switch (commandName) {
      case 'remind':
        response = await handleRemindCommand(interaction, env);
        break;
      case 'reminders':
        response = await handleRemindersCommand(interaction, env);
        break;
      default:
        response = {
          type: 4,
          data: { content: 'Unknown command', flags: 64 },
        };
    }

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response('Unknown interaction type', { status: 400 });
}

async function processReminders(env: Environment): Promise<void> {
  try {
    const storageRequest = new Request(
      'https://reminder-storage/reminders/due',
      {
        method: 'GET',
      }
    );

    const storageId = env.REMINDER_STORAGE.idFromName('default');
    const storage = env.REMINDER_STORAGE.get(storageId);
    const storageResponse = await storage.fetch(storageRequest);

    if (!storageResponse.ok) {
      console.error('Failed to fetch due reminders');
      return;
    }

    const dueReminders = (await storageResponse.json()) as Array<{
      id: string;
      userId: string;
      channelId: string;
      message: string;
      reminderType: 'main' | 'three_days_before' | 'deadline';
      originalDate?: string;
      originalTime?: string;
    }>;

    for (const reminder of dueReminders) {
      try {
        let content = '';

        switch (reminder.reminderType) {
          case 'three_days_before':
            content = `🔔 **3日前リマインダー** <@${reminder.userId}>: ${reminder.message}`;
            break;
          case 'deadline':
            if (reminder.originalTime === '00:00') {
              content = `⚠️ **本日締切** <@${reminder.userId}>: ${reminder.message}\n📅 締切は本日の23:59です`;
            } else {
              content = `⚠️ **本日締切** <@${reminder.userId}>: ${reminder.message}\n📅 締切は本日の${reminder.originalTime}です`;
            }
            break;
          default:
            if (reminder.originalDate) {
              content = `⏰ **期限到来** <@${reminder.userId}>: ${reminder.message}`;
            } else {
              content = `⏰ **リマインダー** <@${reminder.userId}>: ${reminder.message}`;
            }
            break;
        }

        const discordResponse = await fetch(
          `https://discord.com/api/v10/channels/${reminder.channelId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bot ${env.DISCORD_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content,
            }),
          }
        );

        if (discordResponse.ok) {
          const updateRequest = new Request(
            `https://reminder-storage/reminders/${reminder.id}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isActive: false }),
            }
          );

          const storageId = env.REMINDER_STORAGE.idFromName('default');
          const storage = env.REMINDER_STORAGE.get(storageId);
          await storage.fetch(updateRequest);
        }
      } catch (error) {
        console.error('Error processing reminder:', error);
      }
    }
  } catch (error) {
    console.error('Error in processReminders:', error);
  }
}
