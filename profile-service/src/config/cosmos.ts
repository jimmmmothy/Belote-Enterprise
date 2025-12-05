import dotenv from 'dotenv';
import { CosmosClient, Container, Database, PartitionKeyKind } from '@azure/cosmos';

dotenv.config();

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseId = process.env.COSMOS_DATABASE_ID;
const profilesContainerId = process.env.COSMOS_PROFILES_CONTAINER_ID;
const matchHistoryContainerId = process.env.COSMOS_MATCH_HISTORY_CONTAINER_ID;

if (!endpoint || !key || !databaseId || !profilesContainerId || !matchHistoryContainerId) {
  throw new Error('Missing Cosmos DB environment variables. Please check COSMOS_* values.');
}

export const cosmosClient = new CosmosClient({ endpoint, key });

let database: Database | undefined;
let profilesContainer: Container | undefined;
let matchHistoryContainer: Container | undefined;
let initializationPromise: Promise<void> | null = null;

async function ensureCosmosResources(): Promise<void> {
  const { database: db } = await cosmosClient.databases.createIfNotExists({ id: databaseId });
  database = db;

  const partitionKey = { kind: PartitionKeyKind.Hash, paths: ['/userId'] };

  const [{ container: profiles }, { container: matchHistory }] = await Promise.all([
    db.containers.createIfNotExists({ id: profilesContainerId, partitionKey }),
    db.containers.createIfNotExists({ id: matchHistoryContainerId, partitionKey })
  ]);

  profilesContainer = profiles;
  matchHistoryContainer = matchHistory;
}

export async function initializeCosmos(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = ensureCosmosResources();
  }
  return initializationPromise;
}

export async function getProfilesContainer(): Promise<Container> {
  await initializeCosmos();
  if (!profilesContainer) throw new Error('Profiles container not initialized');
  return profilesContainer;
}

export async function getMatchHistoryContainer(): Promise<Container> {
  await initializeCosmos();
  if (!matchHistoryContainer) throw new Error('Match history container not initialized');
  return matchHistoryContainer;
}
