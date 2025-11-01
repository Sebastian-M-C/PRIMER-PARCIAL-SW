import React from 'react';
import { Line, Group, Text, Circle } from 'react-konva';
import { UMLRelation } from '../../types/uml';
import { PRIMARY_START, PRIMARY_DARK } from '../style/theme';

interface ConnectionLineProps {
  /**
   * Relación UML a dibujar (tipo, cardinalidades, label, etc.)
   */
  relation: UMLRelation;
  /**
   * Bounding box de la clase fuente (coordenadas absolutas en stage)
   */
  sourceClass: { x: number; y: number; width: number; height: number };
  /**
   * Bounding box de la clase destino (coordenadas absolutas en stage)
   */
  targetClass: { x: number; y: number; width: number; height: number };
  /**
   * Indica si la relación está seleccionada (afecta grosor/color)
   */
  isSelected?: boolean;
  /**
   * Callback opcional cuando se hace click sobre la relación
   */
  onClick?: () => void;
}

/**
 * ConnectionLine
 *
 * Componente responsable de dibujar la línea de relación entre dos clases en el canvas.
 * - Calcula puntos de intersección con los rectángulos de clase para que las líneas
 *   terminen en el borde de cada nodo.
 * - Dibuja variantes visuales según el tipo de relación:
 *    - INHERITANCE: flecha triangular en el extremo
 *    - COMPOSITION / AGGREGATION: rombo (llenado para composition)
 * - Muestra las cardinalidades como círculos con texto cerca de los extremos (agrandadas)
 *
 * Notas de diseño:
 * - Usa colores desde theme (PRIMARY_START / PRIMARY_DARK).
 * - Stroke width aumenta cuando isSelected = true.
 */
export const ConnectionLine: React.FC<ConnectionLineProps> = ({
  relation,
  sourceClass,
  targetClass,
  isSelected = false,
  onClick
}) => {
  /**
   * Devuelve estilo (color, grosor, dash) según el tipo de relación.
   * isSelected incrementa el strokeWidth para mayor énfasis.
   */
  const getLineStyle = (type: string) => {
    switch (type) {
      case 'INHERITANCE':
        return { stroke: PRIMARY_DARK, strokeWidth: isSelected ? 4 : 3, dash: [] };
      case 'COMPOSITION':
        return { stroke: PRIMARY_DARK, strokeWidth: isSelected ? 4 : 3, dash: [] };
      case 'AGGREGATION':
        return { stroke: PRIMARY_DARK, strokeWidth: isSelected ? 4 : 3, dash: [6, 6] };
      default:
        return { stroke: isSelected ? PRIMARY_DARK : PRIMARY_START, strokeWidth: isSelected ? 4 : 3, dash: [] };
    }
  };

  const style = getLineStyle(relation.type);

  // Centros de ambos rectángulos (usados para calcular dirección de la conexión)
  const sourceCenterX = sourceClass.x + sourceClass.width / 2;
  const sourceCenterY = sourceClass.y + sourceClass.height / 2;
  const targetCenterX = targetClass.x + targetClass.width / 2;
  const targetCenterY = targetClass.y + targetClass.height / 2;

  /**
   * getIntersectionPoint
   * Calcula el punto de intersección entre la recta que une el centro del rectángulo
   * y el borde del rectángulo (aprox. con proyección en el bounding box).
   *
   * Este método evita dibujar líneas que atraviesen los nodos y sitúa los extremos en el borde.
   */
  const getIntersectionPoint = (
    centerX: number, centerY: number, width: number, height: number,
    otherX: number, otherY: number
  ) => {
    const dx = otherX - centerX;
    const dy = otherY - centerY;
    // evitar división por cero
    const absDx = Math.abs(dx) || 1;
    const absDy = Math.abs(dy) || 1;
    const rx = (width / 2) / absDx;
    const ry = (height / 2) / absDy;
    const ratio = Math.min(rx, ry);

    return {
      x: centerX + dx * ratio,
      y: centerY + dy * ratio
    };
  };

  // Puntos de inicio/fin en los bordes de las clases
  const startPoint = getIntersectionPoint(
    sourceCenterX, sourceCenterY, sourceClass.width, sourceClass.height,
    targetCenterX, targetCenterY
  );

  const endPoint = getIntersectionPoint(
    targetCenterX, targetCenterY, targetClass.width, targetClass.height,
    sourceCenterX, sourceCenterY
  );

  // Punto medio (para etiqueta de relación)
  const midX = (startPoint.x + endPoint.x) / 2;
  const midY = (startPoint.y + endPoint.y) / 2;

  // Posiciones relativas donde se muestran las cardinalidades
  const sourceLabelX = startPoint.x + (endPoint.x - startPoint.x) * 0.22;
  const sourceLabelY = startPoint.y + (endPoint.y - startPoint.y) * 0.22;
  const targetLabelX = startPoint.x + (endPoint.x - startPoint.x) * 0.78;
  const targetLabelY = startPoint.y + (endPoint.y - startPoint.y) * 0.78;

  // Tamaños visuales: círculos y fuente de cardinalidades (aumentados para legibilidad)
  const cardinalityRadius = 12;
  const cardinalityFontSize = 13;
  const labelFontSize = 12;

  return (
    <Group onClick={onClick}>
      {/* Línea principal entre los puntos calculados */}
      <Line
        points={[startPoint.x, startPoint.y, endPoint.x, endPoint.y]}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        dash={style.dash}
        lineJoin="round"
        lineCap="round"
      />

      {/* Flecha para herencia (triángulo apuntando al extremo) */}
      {relation.type === 'INHERITANCE' && (
        <Line
          points={[
            endPoint.x - 12, endPoint.y - 6,
            endPoint.x, endPoint.y,
            endPoint.x - 12, endPoint.y + 6
          ]}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          closed
          fill={style.stroke}
        />
      )}

      {/* Rombos para composition / aggregation (relleno para composition) */}
      {(relation.type === 'COMPOSITION' || relation.type === 'AGGREGATION') && (
        <Line
          points={[
            endPoint.x - 10, endPoint.y,
            endPoint.x, endPoint.y - 10,
            endPoint.x + 10, endPoint.y,
            endPoint.x, endPoint.y + 10
          ]}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          closed
          fill={relation.type === 'COMPOSITION' ? style.stroke : 'transparent'}
        />
      )}

      {/* Cardinalidad en el extremo fuente */}
      {relation.sourceCardinality && (
        <Group>
          <Circle
            x={sourceLabelX}
            y={sourceLabelY}
            radius={cardinalityRadius}
            fill="white"
            stroke={style.stroke}
            strokeWidth={1.2}
          />
          <Text
            text={String(relation.sourceCardinality)}
            x={sourceLabelX - cardinalityRadius}
            y={sourceLabelY - (cardinalityFontSize / 2)}
            width={cardinalityRadius * 2}
            align="center"
            fontSize={cardinalityFontSize}
            fill="#333"
            listening={false}
          />
        </Group>
      )}

      {/* Cardinalidad en el extremo destino */}
      {relation.targetCardinality && (
        <Group>
          <Circle
            x={targetLabelX}
            y={targetLabelY}
            radius={cardinalityRadius}
            fill="white"
            stroke={style.stroke}
            strokeWidth={1.2}
          />
          <Text
            text={String(relation.targetCardinality)}
            x={targetLabelX - cardinalityRadius}
            y={targetLabelY - (cardinalityFontSize / 2)}
            width={cardinalityRadius * 2}
            align="center"
            fontSize={cardinalityFontSize}
            fill="#333"
            listening={false}
          />
        </Group>
      )}

      {/* Etiqueta opcional de la relación (centrada en la línea) */}
      {relation.label && (
        <Group>
          <Text
            text={relation.label}
            x={midX - 40}
            y={midY - (labelFontSize / 2)}
            fontSize={labelFontSize}
            fill="#333"
            width={80}
            align="center"
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
};