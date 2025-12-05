import { ProfileDocument } from '../models/profile';
import { MatchHistoryEntry } from '../models/matchHistory';

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
