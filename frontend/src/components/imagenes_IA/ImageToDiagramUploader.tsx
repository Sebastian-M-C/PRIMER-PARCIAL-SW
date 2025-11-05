import React, { useState } from 'react';
import { uploadImageFile } from '../../services/aiImageService';

export default function ImageToDiagramUploader(): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResult(null);
    setError(null);
    setProgress(0);
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return setError('Seleccione un archivo primero');
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await uploadImageFile(file, (pct) => setProgress(pct));
      setResult(res);
    } catch (err: any) {
      setError(JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <input type="file" accept="image/*" onChange={handleFile} />
      <div style={{ marginTop: 8 }}>
        <button onClick={handleUpload} disabled={!file || loading}>
          {loading ? `Subiendo... ${progress}%` : 'Subir y analizar'}
        </button>
      </div>

      {progress > 0 && <div style={{ marginTop: 8 }}>Progreso: {progress}%</div>}

      {error && (
        <div style={{ marginTop: 12, color: 'crimson' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 12 }}>
          <h3>Resultado</h3>
          <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}