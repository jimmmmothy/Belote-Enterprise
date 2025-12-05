import { getProfilesContainer } from '../config/cosmos';
import { ProfileDocument } from '../models/profile';

export async function getProfileByUserId(userId: string): Promise<ProfileDocument | null> {
  const container = await getProfilesContainer();
  const { resource } = await container.item(userId, userId).read<ProfileDocument>();
  return resource ?? null;
}

export async function createProfile(doc: ProfileDocument): Promise<ProfileDocument> {
  const container = await getProfilesContainer();
  const { resource } = await container.items.create(doc);
  if (!resource) throw new Error('Failed to create profile');
  return resource;
}

export async function updateProfile(doc: ProfileDocument): Promise<ProfileDocument> {
  const container = await getProfilesContainer();
  const { resource } = await container.item(doc.id, doc.userId).replace(doc);
  if (!resource) throw new Error('Failed to update profile');
  return resource;
}
