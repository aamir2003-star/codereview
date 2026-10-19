export class EmailNotificationService {
  private queue: Array<{ to: string; subject: string; body: string }> = [];

  public async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    if (!to || !to.includes('@')) {
      return false;
    }

    // Enqueue transactional email
    this.queue.push({ to, subject, body });
    if (this.queue.length > 500) {
      this.queue.shift();
    }

    console.log(`[EmailService] Enqueued email to ${to}: ${subject}`);
    return true;
  }

  public getQueueLength(): number {
    return this.queue.length;
  }
}

export const emailNotification = new EmailNotificationService();
