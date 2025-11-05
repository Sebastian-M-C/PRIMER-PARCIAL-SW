const BASE = 'http://localhost:3001'; // <- apuntar al backend en dev (puerto 3001)

export async function uploadImageFile(file: File, onProgress?: (pct: number) => void): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = `${BASE}/api/ai/image-to-diagram`;
    const form = new FormData();
    form.append('file', file);

    // Usamos XMLHttpRequest para poder reportar progreso de upload
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(json);
        else reject({ status: xhr.status, body: json });
      } catch (err) {
        reject({ status: xhr.status, body: xhr.responseText });
      }
    };
    xhr.onerror = () => reject({ status: xhr.status, body: 'Network error' });
    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) onProgress(Math.round((ev.loaded / ev.total) * 100));
      };
    }
    xhr.send(form);
  });
}

export async function sendImagePath(imagePath: string): Promise<any> {
  const url = `${BASE}/api/ai/image-to-diagram`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imagePath }),
  });
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}