import { ProfileDocument } from './profile';
import { MatchHistoryEntry } from './matchHistory';

export interface UserExportPayload {
  userId: string;
  generatedAt: string;
  auth?: {
    email: string;
    createdAt?: string;
  };
  profile?: ProfileDocument;
  matchHistory: MatchHistoryEntry[];
}
