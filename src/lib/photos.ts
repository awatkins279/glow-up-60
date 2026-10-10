import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { uid } from './dates';

function photoDir(): Directory {
  const dir = new Directory(Paths.document, 'progress-photos');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** Resize + compress to ~1280px JPEG and copy into the app's document directory. */
export async function storeProgressPhoto(sourceUri: string): Promise<string> {
  const dir = photoDir();
  const ctx = ImageManipulator.manipulate(sourceUri).resize({ width: 1280 });
  const rendered = await ctx.renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.75, format: SaveFormat.JPEG });
  const dest = new File(dir, `${uid()}.jpg`);
  const tmp = new File(saved.uri);
  await tmp.copy(dest);
  try {
    tmp.delete();
  } catch {
    /* ignore */
  }
  return dest.uri;
}

export async function pickPhoto(fromCamera: boolean): Promise<string | null> {
  if (fromCamera) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (res.canceled || res.assets.length === 0) return null;
    return storeProgressPhoto(res.assets[0].uri);
  }
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
  if (res.canceled || res.assets.length === 0) return null;
  return storeProgressPhoto(res.assets[0].uri);
}

export function deletePhoto(uri: string) {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    /* ignore */
  }
}
