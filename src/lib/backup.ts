import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { useStore } from '@/store/useStore';

/** Write the full backup JSON to a file and open the share sheet (Files, AirDrop, Drive…). */
export async function exportBackup(): Promise<string> {
  const json = useStore.getState().exportData();
  const stamp = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `glow-up-60-backup-${stamp}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save Glow Up 60 backup' });
  }
  return file.uri;
}

/** Pick a backup JSON file and restore it. */
export async function importBackup(): Promise<{ ok: true } | { ok: false; error: string } | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || res.assets.length === 0) return null;
  const asset = res.assets[0];
  try {
    const file = new File(asset.uri);
    const text = await file.text();
    return useStore.getState().importData(text);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not read file' };
  }
}
