import { useStore } from '@/store/useStore';

/** Download the backup JSON (iOS Safari saves it to Files; desktop browsers to Downloads). */
export async function exportBackup(): Promise<string> {
  const json = useStore.getState().exportData();
  const stamp = new Date().toISOString().slice(0, 10);
  const name = `glow-up-60-backup-${stamp}.json`;
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return name;
}

/** Open a file picker for a backup JSON and restore it. */
export function importBackup(): Promise<{ ok: true } | { ok: false; error: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json,text/plain';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        const text = await file.text();
        resolve(useStore.getState().importData(text));
      } catch (e) {
        resolve({ ok: false, error: e instanceof Error ? e.message : 'Could not read file' });
      }
    };
    // Safari never fires onchange when the picker is cancelled; treat focus-return as cancel.
    const onFocus = () => {
      window.removeEventListener('focus', onFocus);
      setTimeout(() => {
        if (!input.files || input.files.length === 0) resolve(null);
      }, 800);
    };
    window.addEventListener('focus', onFocus);
    input.click();
  });
}
