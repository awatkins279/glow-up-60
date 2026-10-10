/**
 * Web photos: pick via the browser file picker, downscale on a canvas and keep the
 * result as a JPEG data URL inside the app state (persisted in IndexedDB).
 */
import * as ImagePicker from 'expo-image-picker';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read image'));
    img.src = src;
  });
}

/** Resize to max 1000 px and compress to a JPEG data URL (~100–200 KB). */
export async function storeProgressPhoto(sourceUri: string): Promise<string> {
  const img = await loadImage(sourceUri);
  const max = 1000;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.72);
}

export async function pickPhoto(fromCamera: boolean): Promise<string | null> {
  // On the web both paths open the file picker; iOS offers "Take Photo" inside it.
  const res = fromCamera
    ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 }).catch(() =>
        ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 }),
      )
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
  if (res.canceled || res.assets.length === 0) return null;
  return storeProgressPhoto(res.assets[0].uri);
}

export function deletePhoto(_uri: string) {
  /* data URLs live inside the state; nothing to delete on disk */
}
