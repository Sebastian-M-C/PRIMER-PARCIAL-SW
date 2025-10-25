import React from 'react';
import Konva from 'konva';
import { UMLClass } from '../../../types/uml';
import { ClassNodeView } from './ClassNodeView';
import { useDragNodos } from '../../Canvas/Diagramador/hooks/useDragNodos';

interface ClassNodeProps {
  umlClass: UMLClass;
  index?: number;             // <-- nuevo prop
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<UMLClass>) => void;
  referenciaStage: React.RefObject<Konva.Stage>;
  diagrama: any;
  onConnectionStart?: (classId: string, x: number, y: number) => void;
  onDragStart?: () => void;
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  disableDragging?: boolean; // nuevo flag (true cuando modal abierto)
}

export const ClassNode: React.FC<ClassNodeProps> = ({
  umlClass,
  index = 0,
  isSelected,
  onSelect,
  onUpdate,
  referenciaStage,
  diagrama,
  onConnectionStart,
  onDragStart,
  onDragEnd,
  disableDragging = false
}) => {
  // Hook para arrastre (si tu hook lo aporta, lo puedes mantener; aquí preferimos usar handlers nativos)
  const {
    manejarFinArrastreNodo
  } = useDragNodos(referenciaStage, onUpdate, diagrama);

  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (disableDragging) {
      // evitar que comienze el drag si está deshabilitado
      try { e.target.stopDrag(); } catch (err) {}
      return;
    }
    if (onDragStart) onDragStart();
  };



  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    e.evt.stopPropagation();
    onSelect(umlClass.id);
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
  };

  const handleContextMenu = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault();
    e.cancelBubble = true;
  };

  const handleConnectionPointClick = (e: Konva.KonvaEventObject<MouseEvent>, x: number, y: number) => {
    e.cancelBubble = true;
    e.evt.stopPropagation();
    if (onConnectionStart) {
      const posX = (umlClass.position?.x ?? 0) + x;
      const posY = (umlClass.position?.y ?? 0) + y;
      onConnectionStart(umlClass.id, posX, posY);
    }
  };

  // Evitar que el Group padre comience a arrastrarse al presionar el handle
  const handleConnectionPointMouseDown = (e: Konva.KonvaEventObject<MouseEvent>, x: number, y: number) => {
    e.cancelBubble = true;
    e.evt.stopPropagation();

    try {
      const target = e.target as any;
      const parent = typeof target.getParent === 'function' ? target.getParent() : null;
      if (parent) {
        // desactivar draggable inmediatamente y detener arrastre en curso
        if (typeof parent.draggable === 'function') parent.draggable(false);
        if (typeof parent.stopDrag === 'function') parent.stopDrag();
        // NO reactivar aquí: la reactivación la gestiona useCreacionRelaciones cuando el modal cierre
      }
    } catch (err) {
      // noop
    }
  };

  // onDragEnd: si se pasa onDragEnd desde Canvas lo usamos; si no usamos el que retorna el hook
  const onDragEndHandler = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (disableDragging) {
      try { e.target.stopDrag(); } catch (err) {}
      return;
    }
    if (onDragEnd) {
      onDragEnd(e);
    } else {
      manejarFinArrastreNodo(e);
    }
  };

  return (
    <ClassNodeView
      umlClass={umlClass}
      index={index}
      isSelected={isSelected}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onTap={handleClick}
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
      onDragEnd={onDragEndHandler}
      onConnectionPointClick={handleConnectionPointClick}
      onConnectionPointMouseDown={handleConnectionPointMouseDown}
      disableDragging={disableDragging} // prop propagada
    />
  );
};