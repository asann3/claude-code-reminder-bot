import type { Reminder } from './types';

export class ReminderStorage {
  private state: DurableObjectState;
  private env: Record<string, unknown>;

  constructor(state: DurableObjectState, env: Record<string, unknown>) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    try {
      switch (method) {
        case 'POST':
          if (url.pathname === '/reminders') {
            return await this.createReminder(request);
          }
          break;
        case 'GET':
          if (url.pathname === '/reminders') {
            return await this.getReminders(request);
          }
          if (url.pathname === '/reminders/due') {
            return await this.getDueReminders();
          }
          break;
        case 'PUT':
          if (url.pathname.startsWith('/reminders/')) {
            return await this.updateReminder(request);
          }
          break;
        default:
          return new Response('Method not allowed', { status: 405 });
      }
    } catch (error) {
      console.error('Storage error:', error);
      return new Response('Internal server error', { status: 500 });
    }

    return new Response('Not found', { status: 404 });
  }

  private async createReminder(request: Request): Promise<Response> {
    const reminder = (await request.json()) as Omit<
      Reminder,
      'id' | 'createdAt'
    >;
    const id = crypto.randomUUID();
    const createdAt = Date.now();

    const newReminder: Reminder = {
      ...reminder,
      id,
      createdAt,
    };

    await this.state.storage.put(`reminder:${id}`, newReminder);

    return new Response(JSON.stringify(newReminder), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async getReminders(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return new Response('Missing userId parameter', { status: 400 });
    }

    const reminders = await this.state.storage.list<Reminder>({
      prefix: 'reminder:',
    });

    const userReminders = Array.from(reminders.values())
      .filter((reminder) => reminder.userId === userId && reminder.isActive)
      .sort((a, b) => a.reminderTime - b.reminderTime);

    return new Response(JSON.stringify(userReminders), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async getDueReminders(): Promise<Response> {
    const currentTime = Math.floor(Date.now() / 1000);
    const reminders = await this.state.storage.list<Reminder>({
      prefix: 'reminder:',
    });

    const dueReminders = Array.from(reminders.values()).filter(
      (reminder) => reminder.isActive && reminder.reminderTime <= currentTime
    );

    return new Response(JSON.stringify(dueReminders), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async updateReminder(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const id = url.pathname.split('/')[2];

    if (!id) {
      return new Response('Missing reminder ID', { status: 400 });
    }

    const updates = (await request.json()) as Partial<Reminder>;
    const existing = await this.state.storage.get<Reminder>(`reminder:${id}`);

    if (!existing) {
      return new Response('Reminder not found', { status: 404 });
    }

    const updated: Reminder = { ...existing, ...updates };
    await this.state.storage.put(`reminder:${id}`, updated);

    return new Response(JSON.stringify(updated), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
