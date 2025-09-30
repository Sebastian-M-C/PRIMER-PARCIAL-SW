import React from 'react';
import { Line, Group, Text, Circle } from 'react-konva';
import { UMLRelation } from '../../types/uml';

interface ConnectionLineProps {
  relation: UMLRelation;
  sourceClass: { x: number; y: number; width: number; height: number };
  targetClass: { x: number; y: number; width: number; height: number };
  isSelected?: boolean;
  onClick?: () => void;
}

export const ConnectionLine: React.FC<ConnectionLineProps> = ({
  relation,
  sourceClass,
  targetClass,
  isSelected = false,
  onClick
}) => {
  const getLineStyle = (type: string) => {
    switch (type) {
      case 'INHERITANCE':
        return { stroke: '#000', strokeWidth: 2, dash: [] };
      case 'COMPOSITION':
        return { stroke: '#000', strokeWidth: 2, dash: [] };
      case 'AGGREGATION':
        return { stroke: '#000', strokeWidth: 2, dash: [5, 5] };
      default:
        return { stroke: isSelected ? '#007bff' : '#666', strokeWidth: isSelected ? 2 : 1, dash: [] };
    }
  };

  const style = getLineStyle(relation.type);
  
  // Calculate connection points on class boundaries
  const sourceCenterX = sourceClass.x + sourceClass.width / 2;
  const sourceCenterY = sourceClass.y + sourceClass.height / 2;
  const targetCenterX = targetClass.x + targetClass.width / 2;
  const targetCenterY = targetClass.y + targetClass.height / 2;

  // Calculate intersection points with class rectangles
  const getIntersectionPoint = (
    centerX: number, centerY: number, width: number, height: number,
    otherX: number, otherY: number
  ) => {
    const dx = otherX - centerX;
    const dy = otherY - centerY;
    const ratio = Math.min(width / Math.abs(dx), height / Math.abs(dy)) / 2;
    
    return {
      x: centerX + dx * ratio,
      y: centerY + dy * ratio
    };
  };

  const startPoint = getIntersectionPoint(
    sourceCenterX, sourceCenterY, sourceClass.width, sourceClass.height,
    targetCenterX, targetCenterY
  );
  
  const endPoint = getIntersectionPoint(
    targetCenterX, targetCenterY, targetClass.width, targetClass.height,
    sourceCenterX, sourceCenterY
  );

  // Calculate label positions
  const midX = (startPoint.x + endPoint.x) / 2;
  const midY = (startPoint.y + endPoint.y) / 2;
  
  // Position cardinality labels
  const sourceLabelX = startPoint.x + (endPoint.x - startPoint.x) * 0.25;
  const sourceLabelY = startPoint.y + (endPoint.y - startPoint.y) * 0.25;
  const targetLabelX = startPoint.x + (endPoint.x - startPoint.x) * 0.75;
  const targetLabelY = startPoint.y + (endPoint.y - startPoint.y) * 0.75;

  return (
    <Group onClick={onClick}>
      {/* Main connection line */}
      <Line
        points={[startPoint.x, startPoint.y, endPoint.x, endPoint.y]}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        dash={style.dash}
      />
      
      {/* Arrow head for inheritance */}
      {relation.type === 'INHERITANCE' && (
        <Line
          points={[
            endPoint.x - 10, endPoint.y - 5,
            endPoint.x, endPoint.y,
            endPoint.x - 10, endPoint.y + 5
          ]}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          closed
          fill={style.stroke}
        />
      )}
      
      {/* Diamond for composition/aggregation */}
      {(relation.type === 'COMPOSITION' || relation.type === 'AGGREGATION') && (
        <Line
          points={[
            endPoint.x - 8, endPoint.y,
            endPoint.x, endPoint.y - 8,
            endPoint.x + 8, endPoint.y,
            endPoint.x, endPoint.y + 8
          ]}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          closed
          fill={relation.type === 'COMPOSITION' ? style.stroke : 'transparent'}
        />
      )}
      
      {/* Source cardinality */}
      {relation.sourceCardinality && (
        <Group>
          <Circle
            x={sourceLabelX}
            y={sourceLabelY}
            radius={8}
            fill="white"
            stroke={style.stroke}
            strokeWidth={1}
          />
          <Text
            text={relation.sourceCardinality}
            x={sourceLabelX - 4}
            y={sourceLabelY - 4}
            fontSize={10}
            fill="#333"
            align="center"
          />
        </Group>
      )}
      
      {/* Target cardinality */}
      {relation.targetCardinality && (
        <Group>
          <Circle
            x={targetLabelX}
            y={targetLabelY}
            radius={8}
            fill="white"
            stroke={style.stroke}
            strokeWidth={1}
          />
          <Text
            text={relation.targetCardinality}
            x={targetLabelX - 4}
            y={targetLabelY - 4}
            fontSize={10}
            fill="#333"
            align="center"
          />
        </Group>
      )}
      
      {/* Relation label */}
      {relation.label && (
        <Group>
          <Text
            text={relation.label}
            x={midX - 20}
            y={midY - 10}
            fontSize={11}
            fill="#333"
            backgroundColor="white"
            padding={2}
            align="center"
          />
        </Group>
      )}
    </Group>
  );
};