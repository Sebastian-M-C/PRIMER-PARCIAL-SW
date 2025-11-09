import React, { memo } from 'react';
import { Stage, Layer, Group, Line, Circle } from 'react-konva';
import Konva from 'konva';
import { UMLClass, Diagram } from '../../../types/uml';
import { ClassNode } from '../Clase/ClassNode';
import { ConnectionLine } from '../../Canvas/Relaciones/ConnectionLine';
import { ManyToManyVisual } from '../Relaciones/ManyToManyVisual';

export interface CanvasStageProps {
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

  // nuevo: handler para menú contextual de relaciones (cliente coords + relationId)
  onRelationContextMenu?: (clientX: number, clientY: number, relationId: string) => void;
  // nuevo: handler para click sobre una relación (seleccionar/editar)
  onRelationClick?: (relationId: string) => void;
  // nuevo: desactivar drag de nodos cuando un modal está abierto
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
  // Asegurarse de incluir las props nuevas aquí
  disableNodesDragging = false,
  onRelationContextMenu,
  onRelationClick,
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
          {/*
            Grid dinámico: en lugar de dibujar solo en el área visible (width/height),
            expandimos la rejilla para cubrir el área del diagrama (clases) y el viewport,
            así al hacer pan/zoom la cuadrícula sigue mostrando por completo.
          */}
          {(() => {
            const STEP = 20;
            const PAD = 600; // padding extra alrededor de las clases

            // calcular bounds del diagrama a partir de las clases
            let minX = 0, minY = 0, maxX = width, maxY = height;
            if (diagram && Array.isArray(diagram.classes) && diagram.classes.length > 0) {
              minX = Math.min(...diagram.classes.map(c => (c.position?.x ?? 0)));
              minY = Math.min(...diagram.classes.map(c => (c.position?.y ?? 0)));
              maxX = Math.max(...diagram.classes.map(c => ((c.position?.x ?? 0) + (c.width ?? 0))));
              maxY = Math.max(...diagram.classes.map(c => ((c.position?.y ?? 0) + (c.height ?? 0))));
            }

            const left = Math.min(0, minX - PAD);
            const top = Math.min(0, minY - PAD);
            const right = Math.max(width, maxX + PAD);
            const bottom = Math.max(height, maxY + PAD);

            const countX = Math.min(2000, Math.ceil((right - left) / STEP));
            const countY = Math.min(2000, Math.ceil((bottom - top) / STEP));

            const vLines = Array.from({ length: countX }, (_, i) => {
              const x = left + i * STEP;
              return (
                <Line
                  key={`v-${i}`}
                  points={[x, top, x, bottom]}
                  stroke="#e0e0e0"
                  strokeWidth={0.5}
                  opacity={0.25}
                />
              );
            });

            const hLines = Array.from({ length: countY }, (_, i) => {
              const y = top + i * STEP;
              return (
                <Line
                  key={`h-${i}`}
                  points={[left, y, right, y]}
                  stroke="#e0e0e0"
                  strokeWidth={0.5}
                  opacity={0.25}
                />
              );
            });

            return [...vLines, ...hLines];
          })()}
        </Group>

        {/* Connection lines */}
        {(() => {
          if (!diagram) return null;

          // Agrupar relaciones por target (posible clase "join").
          // Anteriormente agrupábamos cualquier par de ONE_TO_MANY que apuntaran
          // a la misma clase y los representábamos como MANY_TO_MANY visual.
          // Eso convertía entidades normales en joins visuales cuando dos clases
          // simplemente apuntaban a la misma entidad (por ejemplo Cliente -> Venta
          // y Empleado -> Venta). Para evitar ese comportamiento, solo consideramos
          // grupo de join cuando la clase target existe y contiene metadata indicando
          // que fue generada como join (metadata.generatedJoinFor).
          const relationsByTarget = new Map<string, typeof diagram.relations>();
          diagram.relations.forEach(r => {
            if (r.type !== 'ONE_TO_MANY') return;
            const targetClass = diagram.classes.find(c => c.id === r.target);
            // solo agrupar si la clase target es explícitamente una 'join' generada
            if (!targetClass) return;
            const meta = (targetClass as any).metadata;
            if (!meta || !Array.isArray(meta.generatedJoinFor)) return;
            const arr = relationsByTarget.get(r.target) || [];
            arr.push(r);
            relationsByTarget.set(r.target, arr);
          });

          // Detectar grupos join: target con exactamente 2 relaciones desde fuentes distintas
          const manyToManyJoinGroups: {
            joinId: string;
            relA: typeof diagram.relations[0];
            relB: typeof diagram.relations[0];
          }[] = [];

          relationsByTarget.forEach((rels, targetId) => {
            if (rels.length === 2) {
              const [r1, r2] = rels;
              if (r1.source !== r2.source && r1.type === 'ONE_TO_MANY' && r2.type === 'ONE_TO_MANY') {
                manyToManyJoinGroups.push({ joinId: targetId, relA: r1, relB: r2 });
              }
            }
          });

          // Marcar relaciones que forman parte de los grupos para NO renderizarlas con ConnectionLine
          const skippedRelationIds = new Set<string>();
          manyToManyJoinGroups.forEach(g => {
            skippedRelationIds.add(g.relA.id);
            skippedRelationIds.add(g.relB.id);
          });

          const rendered: JSX.Element[] = [];

          // Render ConnectionLine para relaciones normales (no parte de un join group)
          diagram.relations.forEach((relation) => {
            if (skippedRelationIds.has(relation.id)) return;
            const sourceClass = diagram.classes.find(cls => cls.id === relation.source);
            const targetClass = diagram.classes.find(cls => cls.id === relation.target);
            if (!sourceClass || !targetClass) return;

            rendered.push(
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
                onClick={() => onRelationClick?.(relation.id)}
                onContextMenu={(clientX, clientY, relId) => {
                  if (typeof onRelationContextMenu === 'function') {
                    onRelationContextMenu(clientX, clientY, relId);
                  }
                }}
              />
            );
          });

          // Render especial para cada grupo MANY_TO_MANY
          manyToManyJoinGroups.forEach((g, idx) => {
            const srcA = diagram.classes.find(c => c.id === g.relA.source);
            const srcB = diagram.classes.find(c => c.id === g.relB.source);
            const joinCls = diagram.classes.find(c => c.id === g.joinId);
            if (!srcA || !srcB || !joinCls) return;

            rendered.push(
              <ManyToManyVisual
                key={`m2m_${g.joinId}_${idx}`}
                sourceA={{
                  x: srcA.position.x, y: srcA.position.y, width: srcA.width, height: srcA.height
                }}
                sourceB={{
                  x: srcB.position.x, y: srcB.position.y, width: srcB.width, height: srcB.height
                }}
                joinClassBox={{
                  x: joinCls.position.x, y: joinCls.position.y, width: joinCls.width, height: joinCls.height
                }}
                // pasar cardinalidades desde las relaciones originales (opcional)
                cardinalityA={g.relA.sourceCardinality}
                cardinalityB={g.relB.sourceCardinality}
                
                onContextMenu={(clientX, clientY) => {
                  // abrir menú contextual para el join (si se desea)
                  if (typeof onRelationContextMenu === 'function') onRelationContextMenu(clientX, clientY, g.relA.id);
                }}
              />
            );
          });

          return rendered;
        })()}

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