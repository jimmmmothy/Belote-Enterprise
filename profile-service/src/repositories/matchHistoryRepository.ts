import { getMatchHistoryContainer } from '../config/cosmos';
import { MatchHistoryEntry } from '../models/matchHistory';

export async function insertMatchHistoryEntries(entries: MatchHistoryEntry[]): Promise<void> {
  const container = await getMatchHistoryContainer();
  await Promise.all(entries.map((entry) => container.items.create(entry)));
}

export async function deleteMatchHistoryByUserId(userId: string): Promise<void> {
  const container = await getMatchHistoryContainer();
  const query = container.items.query<{ id: string }>({
    query: 'SELECT c.id FROM c WHERE c.userId = @userId',
    parameters: [{ name: '@userId', value: userId }]
  });

  // Iterate through pages to delete entries
  for await (const page of query.getAsyncIterator()) {
    const resources = page.resources ?? [];
    await Promise.all(
      resources.map((item) => container.item(item.id, userId).delete().catch((err) => {
        console.error('[ERROR] Failed to delete match history entry', item.id, err);
      }))
    );
  }
}

function parseCursor(cursor: string | undefined): { createdAt?: string; id?: string } {
  if (!cursor) return {};
  const [createdAt, id] = cursor.split('|');
  if (!createdAt || !id) return {};
  return { createdAt, id };
}

function buildCursor(entry: MatchHistoryEntry): string {
  return `${entry.createdAt}|${entry.id}`;
}

export async function getMatchHistoryByUserId(
  userId: string,
  options: { limit: number; cursor?: string }
): Promise<{ items: MatchHistoryEntry[]; nextCursor?: string }> {
  const container = await getMatchHistoryContainer();
  const { limit, cursor } = options;
  const parsedCursor = parseCursor(cursor);

  const filters: string[] = ['c.userId = @userId'];
  const parameters: { name: string; value: any }[] = [{ name: '@userId', value: userId }];

  if (parsedCursor.createdAt && parsedCursor.id) {
    filters.push('(c.createdAt < @cursorCreatedAt OR (c.createdAt = @cursorCreatedAt AND c.id < @cursorId))');
    parameters.push({ name: '@cursorCreatedAt', value: parsedCursor.createdAt });
    parameters.push({ name: '@cursorId', value: parsedCursor.id });
  }

  const querySpec = {
    query: `SELECT * FROM c WHERE ${filters.join(' AND ')} ORDER BY c.createdAt DESC`,
    parameters
  };

  const query = container.items.query<MatchHistoryEntry>(querySpec, {
    maxItemCount: limit
  });

  const { resources } = await query.fetchNext();
  const items = resources ?? [];
  const last = items[items.length - 1];

  return {
    items,
    nextCursor: last ? buildCursor(last) : undefined
  };
}
