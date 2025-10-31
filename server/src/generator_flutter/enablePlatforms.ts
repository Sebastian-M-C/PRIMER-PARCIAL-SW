import { spawn } from 'child_process';
import path from 'path';

/**
 * enableFlutterPlatforms
 * - Ejecuta los comandos necesarios para habilitar web/desktop y generar
 *   los ficheros de plataforma con `flutter create .` en projectDir.
 * - Requiere que `flutter` esté en PATH.
 */
export function enableFlutterPlatforms(projectDir: string, options?: { enableWeb?: boolean; enableWindows?: boolean; timeoutMs?: number }): Promise<void> {
  const enableWeb = options?.enableWeb ?? true;
  const enableWindows = options?.enableWindows ?? true;
  const timeoutMs = options?.timeoutMs ?? 5 * 60 * 1000; // 5 min por defecto

  // Construir comando compuesto para shell (Windows compat.)
  const cmds: string[] = [];
  if (enableWeb) cmds.push('flutter config --enable-web');
  if (enableWindows) cmds.push('flutter config --enable-windows-desktop');
  // `flutter create .` añadirá los directorios de plataforma faltantes
  cmds.push('flutter create .');

  const fullCmd = cmds.join(' && ');
  return new Promise((resolve, reject) => {
    const proc = spawn(fullCmd, {
      cwd: projectDir,
      shell: true,
      env: process.env,
    });

    const killTimer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`enableFlutterPlatforms timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.stdout?.on('data', (d) => process.stdout.write(`[flutter] ${d}`));
    proc.stderr?.on('data', (d) => process.stderr.write(`[flutter] ${d}`));

    proc.on('error', (err) => {
      clearTimeout(killTimer);
      reject(err);
    });

    proc.on('close', (code) => {
      clearTimeout(killTimer);
      if (code === 0) resolve();
      else reject(new Error(`flutter commands exited with code ${code}`));
    });
  });
}