import { db, notificationsTable } from "@workspace/db";

type NotifType =
  | "application_received"
  | "application_accepted"
  | "application_rejected"
  | "contact_revealed"
  | "job_boosted"
  | "credits_purchased"
  | "rating_received";

export async function createNotification(
  userId: number,
  type: NotifType,
  title: string,
  body: string,
  extras?: { jobId?: number; applicationId?: number }
) {
  try {
    await db.insert(notificationsTable).values({
      userId,
      type,
      title,
      body,
      jobId: extras?.jobId ?? null,
      applicationId: extras?.applicationId ?? null,
      isRead: false,
    });
  } catch (e) {
    console.error("[Notification] Failed to create:", e);
  }
}
