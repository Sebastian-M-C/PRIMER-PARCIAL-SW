import { UMLClass } from '../../../types/uml';

interface Position {
  x: number;
  y: number;
}

interface FindFreePositionOptions {
  classes: UMLClass[];
  classWidth?: number;
  classHeight?: number;
  spacing?: number;
  startX?: number;
  startY?: number;
  maxAttempts?: number;
}

/**
 * Encuentra una posición libre en el canvas para una nueva clase
 * Usa un patrón en espiral para evitar superposiciones
 */
export function findFreePosition(options: FindFreePositionOptions): Position {
  const {
    classes,
    classWidth = 200,
    classHeight = 100,
    spacing = 50,
    startX = 300,
    startY = 200,
    maxAttempts = 20
  } = options;

  let x = startX;
  let y = startY;

  // Si no hay clases, usar posición inicial
  if (!classes.length) {
    return { x, y };
  }

  // Intentar encontrar una posición libre
  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    if (isPositionFree(x, y, classWidth, classHeight, spacing, classes)) {
      return { x, y };
    }

    // Mover a siguiente posición en patrón espiral
    const angle = (attempts * 0.5) * Math.PI;
    const radius = attempts * 80;
    x = startX + Math.cos(angle) * radius;
    y = startY + Math.sin(angle) * radius;
  }

  // Fallback: posición horizontal con espaciado
  return { 
    x: 100 + (classes.length * 250), 
    y: 100 
  };
}

/**
 * Verifica si una posición está libre (no se superpone con clases existentes)
 */
function isPositionFree(
  x: number,
  y: number,
  width: number,
  height: number,
  spacing: number,
  existingClasses: UMLClass[]
): boolean {
  for (const existingClass of existingClasses) {
    const existingX = existingClass.position.x;
    const existingY = existingClass.position.y;
    const existingWidth = existingClass.width;
    const existingHeight = existingClass.height;

    // Detectar superposición (con margen de spacing)
    if (
      x < existingX + existingWidth + spacing &&
      x + width + spacing > existingX &&
      y < existingY + existingHeight + spacing &&
      y + height + spacing > existingY
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Genera un nombre de clase único incrementando un contador
 */
export function generateUniqueClassName(existingNames: string[], baseName = 'NuevaClase'): string {
  if (!existingNames.includes(baseName)) {
    return baseName;
  }

  let counter = 1;
  let name = `${baseName}${counter}`;
  
  while (existingNames.includes(name)) {
    counter++;
    name = `${baseName}${counter}`;
  }

  return name;
}