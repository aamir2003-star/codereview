export class SlackNotificationService {
  public async sendWebhook(webhookUrl: string, message: { text: string; blocks?: any[] }): Promise<boolean> {
    if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
      throw new Error('Invalid Slack webhook URL');
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      return response.ok;
    } catch (err: any) {
      console.warn('[SlackNotification] Delivery failed:', err.message);
      return false;
    }
  }

  public formatReviewCompletedBlocks(prTitle: string, prUrl: string, totalIssues: number): any {
    return {
      text: `Code Review Complete for: ${prTitle}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*AI Code Review Finished*\n*PR:* <${prUrl}|${prTitle}>\n*Issues Found:* ${totalIssues}`,
          },
        },
      ],
    };
  }
}

export const slackNotification = new SlackNotificationService();
