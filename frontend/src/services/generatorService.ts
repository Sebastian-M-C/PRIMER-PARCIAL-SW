import { UMLDiagramJSON } from '../types/uml';

/**
 * Envía el diagrama al backend (/api/generator/flutter) y fuerza la descarga
 * del ZIP resultante en el navegador.
 *
 * - diagram: objeto con la forma UMLDiagramJSON
 * - filename (opcional): nombre del archivo .zip a descargar
 */
export async function downloadFlutterZip(diagram: UMLDiagramJSON, filename?: string): Promise<void> {
  console.log('[generatorService] Enviando diagrama al generador (POST /api/generator/flutter)', diagram);

  const res = await fetch('/api/generator/flutter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/zip'
    },
    body: JSON.stringify(diagram)
  });

  console.log('[generatorService] Response status:', res.status, 'ok:', res.ok);
  console.log('[generatorService] Response headers:');
  res.headers.forEach((v, k) => console.log(`  ${k}: ${v}`));

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    console.error('[generatorService] Error en generación:', res.status, text);
    throw new Error(`Error generating Flutter app: ${res.status} ${text}`);
  }

  const blob = await res.blob();
  console.log('[generatorService] Blob recibido. size:', blob.size, 'type:', blob.type);

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `${diagram.package ?? 'generated_app'}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  console.log('[generatorService] Descarga iniciada:', a.download);
}

/**
 * Alternativa: obtener el Blob para manejar la descarga o mostrar progreso
 */
export async function getFlutterZipBlob(diagram: UMLDiagramJSON): Promise<Blob> {
  console.log('[generatorService] Solicitando blob del generador...');
  const res = await fetch('/api/generator/flutter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/zip' },
    body: JSON.stringify(diagram)
  });

  console.log('[generatorService] Response status:', res.status, 'ok:', res.ok);
  if (!res.ok) {
    const txt = await res.text().catch(() => res.statusText);
    console.error('[generatorService] Error al obtener blob:', txt);
    throw new Error(`Error: ${res.statusText}`);
  }

  const blob = await res.blob();
  console.log('[generatorService] Blob size:', blob.size, 'type:', blob.type);
  return blob;
}