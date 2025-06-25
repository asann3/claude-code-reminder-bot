export interface Reminder {
  id: string;
  userId: string;
  channelId: string;
  guildId: string;
  message: string;
  reminderTime: number;
  createdAt: number;
  isActive: boolean;
  reminderType: 'main' | 'three_days_before' | 'deadline';
  originalDate?: string;
  originalTime?: string;
  parentId?: string;
}

export interface Environment {
  DISCORD_APPLICATION_ID: string;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_TOKEN: string;
  REMINDER_STORAGE: DurableObjectNamespace;
}

export interface TimeUnit {
  value: number;
  unit: 's' | 'm' | 'h' | 'd';
}

export interface CommandResponse {
  type: number;
  data?: {
    content?: string;
    embeds?: DiscordEmbed[];
    flags?: number;
  };
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  timestamp?: string;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
}

export interface InteractionData {
  id: string;
  name: string;
  type: number;
  options?: Array<{
    name: string;
    type: number;
    value: string;
  }>;
}

export interface DiscordInteraction {
  id: string;
  application_id: string;
  type: number;
  data?: InteractionData;
  guild_id?: string;
  channel_id?: string;
  member?: {
    user: {
      id: string;
      username: string;
    };
  };
  user?: {
    id: string;
    username: string;
  };
  token: string;
}
