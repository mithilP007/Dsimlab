import { prisma } from '../db/client';
import { sendRealTimeEvent } from '../websocket/handlers/notification';

/**
 * Inserts an activity log record into the database.
 */
export async function logActivity(userId: string, action: string, details: string) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details,
      },
    });
  } catch (error) {
    console.error(`[AuditLog] Failed to log action '${action}' for user ${userId}:`, error);
  }
}

/**
 * Creates a notification for a specific user.
 */
export async function createNotification(userId: string, type: 'info' | 'success' | 'warning' | 'achievement', title: string, message: string, actor?: string, link?: string) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        actor,
        link,
      },
    });

    // Dispatch real-time WebSocket notification event to user
    sendRealTimeEvent(userId, 'notification', notification);
  } catch (error) {
    console.error(`[Notification] Failed to create notification for user ${userId}:`, error);
  }
}
