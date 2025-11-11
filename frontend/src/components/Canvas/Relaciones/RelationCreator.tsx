import React, { useState } from 'react';
import { Group, Line, Text, Rect } from 'react-konva';
import { UMLRelation } from '../../../types/uml';

interface RelationCreatorProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  onComplete: (relation: Omit<UMLRelation, 'id'>) => void;
  onCancel: () => void;
}

const RELATION_TYPES = [
  { type: 'ONE_TO_ONE', label: '1:1', sourceCardinality: '1', targetCardinality: '1' },
  { type: 'ONE_TO_MANY', label: '1:N', sourceCardinality: '1', targetCardinality: '*' },
  { type: 'MANY_TO_ONE', label: 'N:1', sourceCardinality: '*', targetCardinality: '1' },
  { type: 'MANY_TO_MANY', label: 'N:M', sourceCardinality: '*', targetCardinality: '*' },
  { type: 'INHERITANCE', label: 'Inheritance', sourceCardinality: '', targetCardinality: '' },
  { type: 'COMPOSITION', label: 'Composition', sourceCardinality: '', targetCardinality: '' },
  { type: 'AGGREGATION', label: 'Aggregation', sourceCardinality: '', targetCardinality: '' }
];

export const RelationCreator: React.FC<RelationCreatorProps> = ({
  startX,
  startY,
  endX,
  endY,
  onComplete,
  onCancel
}) => {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [customLabel] = useState('');

  const handleTypeSelect = (relationType: typeof RELATION_TYPES[0]) => {
    const relation: Omit<UMLRelation, 'id'> = {
      type: relationType.type as any,
      source: '', // Will be set by parent
      target: '', // Will be set by parent
      sourceCardinality: relationType.sourceCardinality,
      targetCardinality: relationType.targetCardinality,
      label: customLabel || relationType.label
    };
    onComplete(relation);
  };

  const centerX = (startX + endX) / 2;
  const centerY = (startY + endY) / 2;

  return (
    <Group>
      {/* Temporary line while selecting */}
      <Line
        points={[startX, startY, endX, endY]}
        stroke="#666"
        strokeWidth={2}
        dash={[5, 5]}
      />

      {/* Selection panel */}
      <Rect
        x={centerX - 100}
        y={centerY - 120}
        width={200}
        height={240}
        fill="white"
        stroke="#333"
        strokeWidth={2}
        shadowColor="black"
        shadowBlur={4}
        shadowOffset={{ x: 2, y: 2 }}
        shadowOpacity={0.3}
      />

      {/* Title */}
      <Text
        text="Select Relation Type"
        x={centerX - 80}
        y={centerY - 110}
        fontSize={14}
        fontStyle="bold"
        fill="#333"
      />

      {/* Relation type buttons */}
      {RELATION_TYPES.map((relationType, index) => (
        <Group key={relationType.type}>
          <Rect
            x={centerX - 90}
            y={centerY - 90 + index * 25}
            width={180}
            height={20}
            fill={selectedType === relationType.type ? "#007bff" : "#f8f9fa"}
            stroke="#dee2e6"
            strokeWidth={1}
            onClick={() => setSelectedType(relationType.type)}
          />
          <Text
            text={relationType.label}
            x={centerX - 80}
            y={centerY - 85 + index * 25}
            fontSize={12}
            fill={selectedType === relationType.type ? "white" : "#333"}
            onClick={() => setSelectedType(relationType.type)}
          />
        </Group>
      ))}

      {/* Custom label input */}
      <Text
        text="Custom Label (optional):"
        x={centerX - 80}
        y={centerY + 50}
        fontSize={12}
        fill="#333"
      />
      <Rect
        x={centerX - 90}
        y={centerY + 65}
        width={180}
        height={20}
        fill="white"
        stroke="#dee2e6"
        strokeWidth={1}
      />
      <Text
        text={customLabel}
        x={centerX - 85}
        y={centerY + 70}
        fontSize={12}
        fill="#333"
      />

      {/* Action buttons */}
      <Group>
        <Rect
          x={centerX - 90}
          y={centerY + 95}
          width={80}
          height={20}
          fill="#28a745"
          stroke="#1e7e34"
          strokeWidth={1}
          onClick={() => {
            const relationType = RELATION_TYPES.find(rt => rt.type === selectedType);
            if (relationType) {
              handleTypeSelect(relationType);
            }
          }}
        />
        <Text
          text="Create"
          x={centerX - 70}
          y={centerY + 100}
          fontSize={12}
          fill="white"
          onClick={() => {
            const relationType = RELATION_TYPES.find(rt => rt.type === selectedType);
            if (relationType) {
              handleTypeSelect(relationType);
            }
          }}
        />

        <Rect
          x={centerX + 10}
          y={centerY + 95}
          width={80}
          height={20}
          fill="#dc3545"
          stroke="#c82333"
          strokeWidth={1}
          onClick={onCancel}
        />
        <Text
          text="Cancel"
          x={centerX + 30}
          y={centerY + 100}
          fontSize={12}
          fill="white"
          onClick={onCancel}
        />
      </Group>
    </Group>
  );
};
