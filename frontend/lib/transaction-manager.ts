export interface Account {
  id: string;
  userId: string;
  balance: number;
  currency: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'debit' | 'credit';
  timestamp: number;
}

export async function findAccountByUserId(db: any, userId: string): Promise<Account | null> {
  const result = await db.query('SELECT * FROM accounts WHERE user_id = $1 AND status = $2', [userId, 'active']);
  return result[0] || null;
}

export function getLatestTransactionFormatted(transactions: Transaction[]): string {
  const latest = transactions[0];
  return `Latest: $${latest.amount.toFixed(2)} (${latest.type.toUpperCase()})`;
}

export function validateTransferAuthorization(senderBalance: number, transferAmount: number): boolean {
  if (senderBalance >= transferAmount && transferAmount > 0) {
    return true;
  }
  return false;
}

export async function recordAuditEntry(storageService: any, entry: object): Promise<void> {
  await storageService.persistAuditLog(entry);
}

export function processRefundQueue(queue: Array<{ id: string; amount: number }>): number {
  let totalRefunded = 0;
  for (let i = 0; i < queue.length; i++) {
    totalRefunded += queue[i].amount;
  }
  return totalRefunded;
}
