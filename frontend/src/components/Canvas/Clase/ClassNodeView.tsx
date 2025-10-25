// En ClassNodeView.tsx - reemplaza el código completo:

import React, { useMemo } from 'react';
import { Group, Rect, Text, Line, Circle } from 'react-konva';
import Konva from 'konva';
import { UMLClass } from '../../../types/uml';

interface ClassNodeViewProps {
  umlClass: UMLClass;
  index?: number;
  isSelected: boolean;
  onMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onClick: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onTap: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onContextMenu: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragStart: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onConnectionPointClick?: (e: Konva.KonvaEventObject<MouseEvent>, x: number, y: number) => void;
  onConnectionPointMouseDown?: (e: Konva.KonvaEventObject<MouseEvent>, x: number, y: number) => void; // <-- nuevo
}

export const ClassNodeView: React.FC<ClassNodeViewProps> = ({
  umlClass,
  index = 0,
  isSelected,
  onMouseDown,
  onClick,
  onTap,
  onContextMenu,
  onDragStart,
  onDragEnd,
  onConnectionPointClick,
  onConnectionPointMouseDown
}) => {
  const { position = {}, width = 180, name = '', attributes = [], methods = [] } = umlClass;

  const headerHeight = 30;
  const attributeHeight = 20;
  const methodHeight = 20;
  const padding = 10;

  const attributesCount = (attributes ?? []).length;
  const methodsCount = (methods ?? []).length;
  const dividerBetweenAttrsAndMethods = (attributesCount > 0 && methodsCount > 0) ? 1 : 0;

  const totalHeight = headerHeight +
    (attributesCount * attributeHeight) +
    (methodsCount * methodHeight) +
    dividerBetweenAttrsAndMethods +
    padding * 2;

  const nodeWidth = width;
  const nodeHeight = totalHeight;

  // fallback por índice: asegura posiciones distintas en una rejilla
  const fallbackPos = useMemo(() => {
    const cols = 4;
    const spacingX = 240;
    const spacingY = 180;
    const col = index % cols;
    const row = Math.floor(index / cols);
    return { x: 80 + col * spacingX, y: 80 + row * spacingY };
  }, [index]);

  const posX = (typeof position.x === 'number') ? position.x : fallbackPos.x;
  const posY = (typeof position.y === 'number') ? position.y : fallbackPos.y;

  // onDragEnd: Konva event proporciona target.x()/y() en coords del layer (correctas)
  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    onDragEnd(e);
  };

  return (
    <Group
      id={String(umlClass.id)}
      x={posX}
      y={posY}
      draggable={true}                      // usar draggable nativo
      onMouseDown={onMouseDown}
      onClick={onClick}
      onTap={onTap}
      onContextMenu={onContextMenu}
      onDragStart={onDragStart}
      onDragEnd={handleDragEnd}
    >
      <Rect
        x={-6}
        y={-6}
        width={nodeWidth + 12}
        height={nodeHeight + 12}
        fill="transparent"
      />
      <Rect
        width={nodeWidth}
        height={nodeHeight}
        fill={isSelected ? '#eaf4ff' : '#ffffff'}
        stroke={isSelected ? '#1976d2' : '#333333'}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={4}
      />
      <Rect
        width={nodeWidth}
        height={headerHeight}
        fill={isSelected ? '#bbdefb' : '#f5f5f5'}
        stroke="#333333"
        strokeWidth={1}
        cornerRadius={[4,4,0,0]}
      />
      <Text
        text={name}
        x={padding}
        y={headerHeight / 2 - 8}
        fontSize={14}
        fontStyle="bold"
        fill="#333333"
        width={nodeWidth - padding * 2}
        align="center"
      />
      <Line
        points={[0, headerHeight, nodeWidth, headerHeight]}
        stroke="#333333"
        strokeWidth={1}
      />
      {(attributes ?? []).map((attr, i) => {
        const y = headerHeight + (i * attributeHeight) + padding;
        const visibility = attr.isId ? '+' : (attr.nullable ? '?' : '+');
        const text = `${visibility} ${attr.name}: ${attr.type}`;
        return (
          <Text
            key={`attr-${i}`}
            text={text}
            x={padding}
            y={y}
            fontSize={12}
            fill="#333333"
            width={nodeWidth - padding * 2}
          />
        );
      })}
      { (attributesCount > 0 && methodsCount > 0) && (
        <Line
          points={[0, headerHeight + attributesCount * attributeHeight + padding, nodeWidth, headerHeight + attributesCount * attributeHeight + padding]}
          stroke="#333333"
          strokeWidth={1}
        />
      )}
      {(methods ?? []).map((method, i) => {
        const y = headerHeight + attributesCount * attributeHeight + padding + (i * methodHeight);
        const params = (method.parameters ?? []).map((p:any) => `${p.name}: ${p.type}`).join(', ');
        const text = `+ ${method.name}(${params}): ${method.returnType ?? ''}`;
        return (
          <Text
            key={`method-${i}`}
            text={text}
            x={padding}
            y={y}
            fontSize={12}
            fill="#333333"
            width={nodeWidth - padding * 2}
          />
        );
      })}
      {isSelected && onConnectionPointClick && (
        <Group>
          <Circle
            x={nodeWidth/2}
            y={0}
            radius={6}
            fill="#1976d2"
            onMouseDown={(e) => {
              e.cancelBubble = true;
              e.evt.stopPropagation();
              // optar por notificar al padre para desactivar draggable inmediatamente
              onConnectionPointMouseDown?.(e, nodeWidth/2, 0);
            }}
            onClick={(e) => onConnectionPointClick(e, nodeWidth/2, 0)}
          />
          <Circle
            x={nodeWidth}
            y={nodeHeight/2}
            radius={6}
            fill="#1976d2"
            onMouseDown={(e) => {
              e.cancelBubble = true;
              e.evt.stopPropagation();
              onConnectionPointMouseDown?.(e, nodeWidth, nodeHeight/2);
            }}
            onClick={(e) => onConnectionPointClick(e, nodeWidth, nodeHeight/2)}
          />
          <Circle
            x={nodeWidth/2}
            y={nodeHeight}
            radius={6}
            fill="#1976d2"
            onMouseDown={(e) => {
              e.cancelBubble = true;
              e.evt.stopPropagation();
              onConnectionPointMouseDown?.(e, nodeWidth/2, nodeHeight);
            }}
            onClick={(e) => onConnectionPointClick(e, nodeWidth/2, nodeHeight)}
          />
          <Circle
            x={0}
            y={nodeHeight/2}
            radius={6}
            fill="#1976d2"
            onMouseDown={(e) => {
              e.cancelBubble = true;
              e.evt.stopPropagation();
              onConnectionPointMouseDown?.(e, 0, nodeHeight/2);
            }}
            onClick={(e) => onConnectionPointClick(e, 0, nodeHeight/2)}
          />
        </Group>
      )}
    </Group>
  );
};