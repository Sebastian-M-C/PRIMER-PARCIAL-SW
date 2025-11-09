import React from 'react';
import { Group, Line, Circle, Text } from 'react-konva';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ManyToManyVisualProps {
  sourceA: Box;
  sourceB: Box;
  joinClassBox: Box;
  cardinalityA?: string;
  cardinalityB?: string;
  
  onContextMenu?: (clientX: number, clientY: number) => void;
}

export const ManyToManyVisual: React.FC<ManyToManyVisualProps> = ({
  sourceA, sourceB, joinClassBox, cardinalityA, cardinalityB, onContextMenu
}) => {
  // extract optional side labels
  const { } = {} as any;
  // calcular puntos centrales de las cajas
  const center = (b: Box) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
  const a = center(sourceA);
  const b = center(sourceB);
  const j = center(joinClassBox);

  // punto medio entre A y B
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

  const ORANGE = '#ff7a18';
  const strokeWidth = 3;

  const handleContext = (e: any) => {
    e.evt.preventDefault();
    if (onContextMenu) {
      onContextMenu(e.evt.clientX, e.evt.clientY);
    }
  };

  // posiciones base para las cardinalidades (entre extremo y medio)
  const cardPosA = { x: (a.x + mid.x) / 2, y: (a.y + mid.y) / 2 };
  const cardPosB = { x: (b.x + mid.x) / 2, y: (b.y + mid.y) / 2 };

  // Ajuste: empujar hacia abajo la cardinalidad que quede más arriba para evitar solaparse
  // Si cardPosA está por encima de cardPosB, la movemos hacia abajo (y+), y viceversa.
  const verticalShift = 18; // píxeles, ajustar según gusto
  if (cardPosA.y < cardPosB.y) {
    cardPosA.y += verticalShift;
  } else {
    cardPosB.y += verticalShift;
  }

  return (
    <Group onContextMenu={handleContext}>
      {/* Linea principal entre A y B */}
      <Line
        points={[a.x, a.y, b.x, b.y]}
        stroke={ORANGE}
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
      />

      {/* Rama desde el punto medio hacia la clase intermedia */}
      <Line
        points={[mid.x, mid.y, j.x, j.y]}
        stroke={ORANGE}
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
      />

      {/* Nodo visual en la unión (punto medio) */}
      <Circle
        x={mid.x}
        y={mid.y}
        radius={6}
        fill="#fff"
        stroke={ORANGE}
        strokeWidth={2}
        listening={false}
      />

      {/* Cardinalidades cerca de los extremos de la linea principal (si las hay) */}
      {cardinalityA && (
        <Group>
          <Circle x={cardPosA.x} y={cardPosA.y} radius={12} fill="#fff" stroke={ORANGE} strokeWidth={1.2} listening={false} />
          <Text text={cardinalityA} x={cardPosA.x - 12} y={cardPosA.y - 8} width={24} align="center" fontSize={12} fill="#111" listening={false} />
        </Group>
      )}
      

      {cardinalityB && (
        <Group>
          <Circle x={cardPosB.x} y={cardPosB.y} radius={12} fill="#fff" stroke={ORANGE} strokeWidth={1.2} listening={false} />
          <Text text={cardinalityB} x={cardPosB.x - 12} y={cardPosB.y - 8} width={24} align="center" fontSize={12} fill="#111" listening={false} />
        </Group>
      )}
    
    </Group>
  );
};