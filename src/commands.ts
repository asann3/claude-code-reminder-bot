import type {
  CommandResponse,
  DiscordEmbed,
  DiscordInteraction,
  Environment,
  Reminder,
} from './types';
import {
  formatTimeString,
  parseDateTimeString,
  parseTimeString,
} from './utils';

export async function handleRemindCommand(
  interaction: DiscordInteraction,
  env: Environment
): Promise<CommandResponse> {
  const options = interaction.data?.options;
  const messageOption = options?.find((opt) => opt.name === 'message');
  const timeOption = options?.find((opt) => opt.name === 'time');

  if (!messageOption?.value || !timeOption?.value) {
    return {
      type: 4,
      data: {
        content: '⚠️ メッセージと時間を指定してください。',
        flags: 64, // EPHEMERAL
      },
    };
  }

  const message = messageOption.value;
  const timeStr = timeOption.value;
  const userId = interaction.member?.user.id ?? interaction.user?.id;
  const channelId = interaction.channel_id;
  const guildId = interaction.guild_id;

  if (!userId || !channelId || !guildId) {
    return {
      type: 4,
      data: {
        content: '⚠️ 必要な情報が不足しています。',
        flags: 64,
      },
    };
  }

  // 日時指定形式を試行
  const dateTimeResult = parseDateTimeString(timeStr);

  if (dateTimeResult) {
    // 日時指定の場合：複数の通知を作成
    try {
      const parentId = crypto.randomUUID();
      const storageId = env.REMINDER_STORAGE.idFromName('default');
      const storage = env.REMINDER_STORAGE.get(storageId);

      for (const notification of dateTimeResult.notificationTimes) {
        const reminder: Omit<Reminder, 'id' | 'createdAt'> = {
          userId,
          channelId,
          guildId,
          message,
          reminderTime: notification.time,
          isActive: true,
          reminderType: notification.type,
          originalDate: dateTimeResult.originalDate,
          originalTime: dateTimeResult.originalTime,
          parentId,
        };

        const storageRequest = new Request(
          'https://reminder-storage/reminders',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reminder),
          }
        );

        const storageResponse = await storage.fetch(storageRequest);
        if (!storageResponse.ok) {
          throw new Error('Failed to save reminder');
        }
      }

      return {
        type: 4,
        data: {
          content: `✅ リマインダーを設定しました！\n📝 **メッセージ**: ${message}\n📅 **実際の締切**: ${dateTimeResult.actualDeadline}\n🔔 **通知**: 3日前の00:00と当日00:00に通知します`,
        },
      };
    } catch (error) {
      console.error('Error creating date-time reminder:', error);
      return {
        type: 4,
        data: {
          content: '❌ リマインダーの作成に失敗しました。',
          flags: 64,
        },
      };
    }
  }

  // 従来の相対時間指定を試行
  const reminderTime = parseTimeString(timeStr);
  if (reminderTime === null) {
    return {
      type: 4,
      data: {
        content:
          '⚠️ 時間の形式が正しくありません。例: 5m, 1h, 2d または 2024-12-25, 2024-12-25 14:30',
        flags: 64,
      },
    };
  }

  const futureTime = Math.floor(Date.now() / 1000) + reminderTime;

  try {
    const reminder: Omit<Reminder, 'id' | 'createdAt'> = {
      userId,
      channelId,
      guildId,
      message,
      reminderTime: futureTime,
      isActive: true,
      reminderType: 'main',
    };

    const storageRequest = new Request('https://reminder-storage/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reminder),
    });

    const storageId = env.REMINDER_STORAGE.idFromName('default');
    const storage = env.REMINDER_STORAGE.get(storageId);
    const storageResponse = await storage.fetch(storageRequest);

    if (!storageResponse.ok) {
      throw new Error('Failed to save reminder');
    }

    const timeLabel = formatTimeString(timeStr);
    return {
      type: 4,
      data: {
        content: `✅ リマインダーを設定しました！\n📝 **メッセージ**: ${message}\n⏰ **時間**: ${timeLabel}後`,
      },
    };
  } catch (error) {
    console.error('Error creating reminder:', error);
    return {
      type: 4,
      data: {
        content: '❌ リマインダーの作成に失敗しました。',
        flags: 64,
      },
    };
  }
}

export async function handleRemindersCommand(
  interaction: DiscordInteraction,
  env: Environment
): Promise<CommandResponse> {
  const userId = interaction.member?.user.id ?? interaction.user?.id;
  const guildId = interaction.guild_id;

  if (!userId || !guildId) {
    return {
      type: 4,
      data: {
        content: '⚠️ ユーザー情報またはサーバー情報が取得できません。',
        flags: 64,
      },
    };
  }

  try {
    const storageRequest = new Request(
      `https://reminder-storage/reminders?userId=${userId}&guildId=${guildId}`,
      { method: 'GET' }
    );

    const storageId = env.REMINDER_STORAGE.idFromName('default');
    const storage = env.REMINDER_STORAGE.get(storageId);
    const storageResponse = await storage.fetch(storageRequest);

    if (!storageResponse.ok) {
      throw new Error('Failed to fetch reminders');
    }

    const reminders = (await storageResponse.json()) as Reminder[];

    if (reminders.length === 0) {
      return {
        type: 4,
        data: {
          content: '📝 設定中のリマインダーはありません。',
        },
      };
    }

    let description = '';
    reminders.forEach((reminder, index) => {
      const timeStr = `<t:${reminder.reminderTime}:R>`;
      description += `**${index + 1}.** ${reminder.message}\n⏰ ${timeStr}\n🆔 ID: \`${reminder.id}\`\n\n`;
    });

    const embed: DiscordEmbed = {
      title: '📝 あなたのリマインダー一覧',
      description,
      color: 0x0099ff,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'リマインダーを削除するには /delete <ID> を使用してください',
      },
    };

    return {
      type: 4,
      data: {
        embeds: [embed],
      },
    };
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return {
      type: 4,
      data: {
        content: '❌ リマインダーの取得に失敗しました。',
        flags: 64,
      },
    };
  }
}

export async function handleDeleteCommand(
  interaction: DiscordInteraction,
  env: Environment
): Promise<CommandResponse> {
  const options = interaction.data?.options;
  const idOption = options?.find((opt) => opt.name === 'id');
  const userId = interaction.member?.user.id ?? interaction.user?.id;
  const guildId = interaction.guild_id;

  if (!userId || !guildId) {
    return {
      type: 4,
      data: {
        content: '⚠️ ユーザー情報またはサーバー情報が取得できません。',
        flags: 64,
      },
    };
  }

  try {
    const storageRequest = new Request(
      `https://reminder-storage/reminders?userId=${userId}&guildId=${guildId}`,
      { method: 'GET' }
    );

    const storageId = env.REMINDER_STORAGE.idFromName('default');
    const storage = env.REMINDER_STORAGE.get(storageId);
    const storageResponse = await storage.fetch(storageRequest);

    if (!storageResponse.ok) {
      throw new Error('Failed to fetch reminders');
    }

    const reminders = (await storageResponse.json()) as Reminder[];

    if (reminders.length === 0) {
      return {
        type: 4,
        data: {
          content: '📝 削除できるリマインダーはありません。',
        },
      };
    }

    // IDが指定されている場合は削除実行
    if (idOption?.value) {
      const reminderId = idOption.value;
      const targetReminder = reminders.find((r) => r.id === reminderId);

      if (!targetReminder) {
        return {
          type: 4,
          data: {
            content:
              '❌ 指定されたIDのリマインダーが見つからないか、あなたのリマインダーではありません。',
            flags: 64,
          },
        };
      }

      // 削除実行
      const deleteRequest = new Request(
        `https://reminder-storage/reminders/${reminderId}`,
        { method: 'DELETE' }
      );

      const deleteResponse = await storage.fetch(deleteRequest);

      if (!deleteResponse.ok) {
        throw new Error('Failed to delete reminder');
      }

      return {
        type: 4,
        data: {
          content: `✅ リマインダーを削除しました:\n📝 **メッセージ**: ${targetReminder.message}`,
        },
      };
    }

    // IDが指定されていない場合は一覧表示
    let description =
      '削除したいリマインダーのIDをコピーして、`/delete <ID>` を実行してください:\n\n';
    reminders.forEach((reminder, index) => {
      const timeStr = `<t:${reminder.reminderTime}:R>`;
      description += `**${index + 1}.** ${reminder.message}\n⏰ ${timeStr}\n🆔 ID: \`${reminder.id}\`\n\n`;
    });

    const embed: DiscordEmbed = {
      title: '🗑️ リマインダー削除',
      description,
      color: 0xff4444,
      timestamp: new Date().toISOString(),
    };

    return {
      type: 4,
      data: {
        embeds: [embed],
      },
    };
  } catch (error) {
    console.error('Error in delete command:', error);
    return {
      type: 4,
      data: {
        content: '❌ リマインダーの取得に失敗しました。',
        flags: 64,
      },
    };
  }
}
