import type { TimeUnit } from './types';

export function parseTimeString(timeStr: string): number | null {
  const regex = /^(\d+)([smhd])$/;
  const match = timeStr.toLowerCase().match(regex);

  if (!match) return null;

  const value = Number.parseInt(match[1] ?? '0', 10);
  const unit = match[2] as TimeUnit['unit'];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 60 * 60 * 24;
    default:
      return null;
  }
}

export function formatTimeString(timeStr: string): string {
  const regex = /^(\d+)([smhd])$/;
  const match = timeStr.toLowerCase().match(regex);

  if (!match) return timeStr;

  const value = match[1] ?? '0';
  const unit = match[2] as TimeUnit['unit'];

  switch (unit) {
    case 's':
      return `${value}秒`;
    case 'm':
      return `${value}分`;
    case 'h':
      return `${value}時間`;
    case 'd':
      return `${value}日`;
    default:
      return timeStr;
  }
}

export function createErrorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function createSuccessResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function convertToJST(date: Date): Date {
  const jstOffset = 9 * 60;
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + jstOffset * 60000);
}

function createJSTDate(dateStr: string, hour = 0, minute = 0): Date {
  const date = new Date(
    `${dateStr}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00+09:00`
  );
  return date;
}

export function parseDateTimeString(dateTimeStr: string): {
  targetDate: Date;
  notificationTimes: Array<{
    time: number;
    type: 'three_days_before' | 'deadline';
  }>;
  originalDate: string;
  originalTime: string;
  actualDeadline: string;
} | null {
  const dateTimeRegex = /^(\d{4}-\d{2}-\d{2})(?:\s+(\d{1,2}):(\d{2}))?$/;
  const match = dateTimeStr.match(dateTimeRegex);

  if (!match) return null;

  const dateStr = match[1];
  const hour = match[2] ? Number.parseInt(match[2], 10) : 0;
  const minute = match[3] ? Number.parseInt(match[3], 10) : 0;

  if (!dateStr) return null;

  let actualDeadlineDate: Date;
  let actualDeadlineStr: string;

  // 00:00指定の場合は前日の23:59を締切とする
  if (hour === 0 && minute === 0) {
    const targetDate = createJSTDate(dateStr, 0, 0);
    const previousDay = new Date(targetDate);
    previousDay.setDate(previousDay.getDate() - 1);
    previousDay.setHours(23, 59, 0, 0);
    actualDeadlineDate = previousDay;
    const jstPreviousDay = convertToJST(previousDay);
    actualDeadlineStr = `${jstPreviousDay.toISOString().split('T')[0]} 23:59`;
  } else {
    actualDeadlineDate = createJSTDate(dateStr, hour, minute);
    actualDeadlineStr = `${dateStr} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  if (Number.isNaN(actualDeadlineDate.getTime())) return null;

  const threeDaysBeforeDate = new Date(actualDeadlineDate);
  threeDaysBeforeDate.setDate(threeDaysBeforeDate.getDate() - 3);

  // JSTの日付文字列を取得してJST 0時を作成
  const threeDaysBeforeDateStr = convertToJST(threeDaysBeforeDate)
    .toISOString()
    .split('T')[0];
  const threeDaysBeforeJST = createJSTDate(threeDaysBeforeDateStr ?? '', 0, 0);
  const threeDaysBeforeTimestamp = Math.floor(
    threeDaysBeforeJST.getTime() / 1000
  );

  const notificationTimes = [];

  // 3日前のJST 00:00に通知
  notificationTimes.push({
    time: threeDaysBeforeTimestamp,
    type: 'three_days_before' as const,
  });

  let dayOfNotificationDate: Date;
  if (hour === 0 && minute === 0) {
    // 00:00指定の場合は前日のJST 00:00に通知
    const actualDeadlineJST = convertToJST(actualDeadlineDate);
    const notificationDateStr = actualDeadlineJST.toISOString().split('T')[0];
    dayOfNotificationDate = createJSTDate(notificationDateStr ?? '', 0, 0);
  } else {
    // その他の場合は当日のJST 00:00に通知
    dayOfNotificationDate = createJSTDate(dateStr, 0, 0);
  }

  notificationTimes.push({
    time: Math.floor(dayOfNotificationDate.getTime() / 1000),
    type: 'deadline' as const,
  });

  return {
    targetDate: actualDeadlineDate,
    notificationTimes,
    originalDate: dateStr,
    originalTime: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
    actualDeadline: actualDeadlineStr,
  };
}
