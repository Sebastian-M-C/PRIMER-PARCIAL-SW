import React, { memo } from 'react';
import { Stage, Layer, Group, Line, Circle } from 'react-konva';
import Konva from 'konva';
import { UMLClass, UMLRelation, Diagram } from '../../../types/uml';
import { ClassNode } from '../Clase/ClassNode';
import { ConnectionLine } from '../ConnectionLine';

interface CanvasStageProps {
  stageRef: React.RefObject<Konva.Stage>;
  width: number;
  height: number;
  scale: number;
  position: { x: number; y: number };
  draggableStage: boolean;
  diagram?: Diagram;
  selectedClassId?: string | null;
  selectedRelationId?: string | null;
  isCreatingRelation: boolean;
  relationStart: { classId: string; x: number; y: number } | null;
  tempEndPoint: { x: number; y: number } | null;
  connectionTension?: number;

  onStageClick: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onStageMouseMove: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  onStageDragEnd: (pos: { x: number; y: number }) => void;
  onClassClick: (id: string) => void;
  onClassUpdate: (id: string, updates: Partial<UMLClass>) => void;
  onNodeDragStart: () => void;
  onNodeDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onConnectionStart: (classId: string, x: number, y: number) => void;
  onHandleDragMove?: (pos: { x: number; y: number }) => void;

  // <-- nuevo prop para desactivar draggable en los nodos cuando corresponda
  disableNodesDragging?: boolean;
}

export const CanvasStage: React.FC<CanvasStageProps> = memo(({
  stageRef,
  width,
  height,
  scale,
  position,
  draggableStage,
  diagram,
  selectedClassId,
  selectedRelationId,
  isCreatingRelation,
  relationStart,
  tempEndPoint,
  connectionTension = 0.5,
  onStageClick,
  onStageMouseMove,
  onWheel,
  onStageDragEnd,
  onClassClick,
  onClassUpdate,
  onNodeDragStart,
  onNodeDragEnd,
  onConnectionStart,
  onHandleDragMove,
  disableNodesDragging = false // <-- default false
}) => {

  const pointerToStageCoords = (stage: Konva.Stage | null) => {
    if (!stage) return null;
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    return transform.point(pointer);
  };

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      scaleX={scale}
      scaleY={scale}
      x={position.x}
      y={position.y}
      onClick={onStageClick}
      onMouseMove={(e) => {
        // convertir puntero a coords del stage y actualizar punto temporal si estamos creando relación
        const stage = (stageRef && stageRef.current) || (e.target && e.target.getStage());
        const pos = pointerToStageCoords(stage);
        if (isCreatingRelation && pos) {
          onHandleDragMove?.({ x: pos.x, y: pos.y });
          return;
        }
        onStageMouseMove?.(e);
      }}
      onWheel={onWheel}
      draggable={draggableStage}
      onDragEnd={(e) => {
        onStageDragEnd({ x: e.target.x(), y: e.target.y() });
      }}
    >
      <Layer>
        {/* Grid background */}
        <Group>
          {Array.from({ length: Math.ceil(width / 20) }, (_, i) => (
            <Line
              key={`v-${i}`}
              points={[i * 20, 0, i * 20, height]}
              stroke="#e0e0e0"
              strokeWidth={0.5}
              opacity={0.3}
            />
          ))}
          {Array.from({ length: Math.ceil(height / 20) }, (_, i) => (
            <Line
              key={`h-${i}`}
              points={[0, i * 20, width, i * 20]}
              stroke="#e0e0e0"
              strokeWidth={0.5}
              opacity={0.3}
            />
          ))}
        </Group>

        {/* Connection lines */}
        {diagram?.relations.map((relation) => {
          const sourceClass = diagram.classes.find(cls => cls.id === relation.source);
          const targetClass = diagram.classes.find(cls => cls.id === relation.target);
          if (!sourceClass || !targetClass) return null;

          return (
            <ConnectionLine
              key={relation.id}
              relation={relation}
              sourceClass={{
                x: sourceClass.position.x,
                y: sourceClass.position.y,
                width: sourceClass.width,
                height: sourceClass.height
              }}
              targetClass={{
                x: targetClass.position.x,
                y: targetClass.position.y,
                width: targetClass.width,
                height: targetClass.height
              }}
              isSelected={selectedRelationId === relation.id}
              onClick={() => onClassClick(relation.id)}
            />
          );
        })}

        {/* Temporary relation line while creating (smooth / tension + draggable handle) */}
        {isCreatingRelation && relationStart && tempEndPoint && (
          <>
            <Line
              points={[relationStart.x, relationStart.y, tempEndPoint.x, tempEndPoint.y]}
              tension={connectionTension}
              stroke="#007bff"
              strokeWidth={3}
              lineJoin="round"
              lineCap="round"
              shadowBlur={2}
            />

            {/* Draggable handle at the end to allow dragging the endpoint */}
            <Circle
              x={tempEndPoint.x}
              y={tempEndPoint.y}
              radius={6}
              fill="#007bff"
              stroke="#fff"
              strokeWidth={1}
              // <-- desactivar handle si los nodos están bloqueados por modal
              draggable={!disableNodesDragging}
              onDragMove={(e) => {
                const stage = (stageRef && stageRef.current) || e.target.getStage();
                const pos = pointerToStageCoords(stage);
                if (pos) onHandleDragMove?.({ x: pos.x, y: pos.y });
              }}
              onDragEnd={(e) => {
                const stage = (stageRef && stageRef.current) || e.target.getStage();
                const pos = pointerToStageCoords(stage);
                if (pos) onHandleDragMove?.({ x: pos.x, y: pos.y });
              }}
            />
          </>
        )}

        {/* Class nodes */}
        {(diagram?.classes ?? []).map((cls, idx) => (
          <ClassNode
            key={cls.id}
            umlClass={cls}
            index={idx}
            isSelected={selectedClassId === cls.id}
            onSelect={onClassClick}
            onUpdate={(id, updates) => onClassUpdate(id, updates)}
            referenciaStage={stageRef}
            diagrama={diagram}
            onDragStart={onNodeDragStart}
            onDragEnd={onNodeDragEnd}
            onConnectionStart={onConnectionStart}
            // <-- prop que evita draggable por modal
            disableDragging={disableNodesDragging}
          />
        ))}
      </Layer>
    </Stage>
  );
});