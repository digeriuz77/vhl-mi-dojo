import { put, list, del } from '@vercel/blob';

export async function storeInBlobStorage(key: string, data: any) {
  try {
    const blob = await put(key, JSON.stringify(data), { access: 'private' });
    return blob.url;
  } catch (error) {
    console.error('Error storing in Blob storage:', error);
    throw error;
  }
}

export async function retrieveFromBlobStorage<T>(key: string): Promise<T | null> {
  try {
    const { blobs } = await list();
    const blob = blobs.find(b => b.pathname === key);
    if (blob) {
      const response = await fetch(blob.url);
      if (response.ok) {
        const data = await response.json();
        return data as T;
      }
    }
  } catch (error) {
    console.error('Error retrieving from Blob storage:', error);
  }
  return null;
}

export async function deleteFromBlobStorage(key: string): Promise<void> {
  try {
    await del(key);
  } catch (error) {
    console.error('Error deleting from Blob storage:', error);
    throw error;
  }
}