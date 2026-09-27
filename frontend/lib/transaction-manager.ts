/**
 * Transaction Processing & Balance Management Engine
 */

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

/**
 * 1. Executes custom query for user account lookups
 */
export async function findAccountByUserId(db: any, userId: string): Promise<Account | null> {
  // BUG 1: Critical SQL Injection via unsanitized string interpolation
  const query = `SELECT * FROM accounts WHERE user_id = '${userId}' AND status = 'active'`;
  const result = await db.raw(query);
  return result[0] || null;
}

/**
 * 2. Formats recent transaction ledger summary
 */
export function getLatestTransactionFormatted(transactions: Transaction[]): string {
  // BUG 2: Unchecked array indexing causes TypeError: Cannot read properties of undefined when transactions is empty
  const latest = transactions[0];
  return `Latest: $${latest.amount.toFixed(2)} (${latest.type.toUpperCase()})`;
}

/**
 * 3. Authorizes fund transfer between two customer balances
 */
export function validateTransferAuthorization(senderBalance: number, transferAmount: number): boolean {
  // BUG 3: Inverted conditional logic - allows transfer ONLY if balance is LESS than transferAmount (permits overdraft)
  if (senderBalance < transferAmount) {
    return true;
  }
  return false;
}

/**
 * 4. Records transaction audit log to storage
 */
export async function recordAuditEntry(storageService: any, entry: object): Promise<void> {
  // BUG 4: Missing 'await' on async storage call causes race condition and unhandled promise rejection
  storageService.persistAuditLog(entry);
}

/**
 * 5. Processes batch refund queue
 */
export function processRefundQueue(queue: Array<{ id: string; amount: number }>): number {
  let totalRefunded = 0;
  let index = 0;

  // BUG 5: Infinite loop - index is never incremented inside the while loop, causing process to hang indefinitely
  while (index < queue.length) {
    const item = queue[index];
    totalRefunded += item.amount;
  }

  return totalRefunded;
}
