import React, { useRef, useState } from 'react';
import { Stage, Layer, Group, Line } from 'react-konva';
import Konva from 'konva';
import { useDiagramStore } from '../../store/useDiagramStore';
import { UMLClass, UMLRelation } from '../../types/uml';
import { ClassNode } from './ClassNode';
import { ConnectionLine } from './ConnectionLine';
import { RelationModal } from '../RelationModal';

interface CanvasProps {
  width: number;
  height: number;
}

export const Canvas: React.FC<CanvasProps> = ({ width, height }) => {
  const stageRef = useRef<Konva.Stage>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isCreatingRelation, setIsCreatingRelation] = useState(false);
  const [relationStart, setRelationStart] = useState<{ classId: string; x: number; y: number } | null>(null);
  const [tempEndPoint, setTempEndPoint] = useState<{ x: number; y: number } | null>(null);
  const [showRelationModal, setShowRelationModal] = useState(false);
  const [pendingRelation, setPendingRelation] = useState<{ sourceId: string; targetId: string } | null>(null);
  
  const { 
    diagram, 
    selectedClassId, 
    selectedRelationId,
    selectClass, 
    selectRelation,
    updateClass,
    addRelation
  } = useDiagramStore();

  // Don't render if dimensions are invalid
  if (!width || !height || width <= 0 || height <= 0) {
    return (
      <div className="canvas-container" style={{ width, height, position: 'relative' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          color: '#666',
          fontSize: '14px'
        }}>
          Canvas loading...
        </div>
      </div>
    );
  }


  // const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
  //   // Deselect if clicking on empty space
  //   if (e.target === e.target.getStage()) {
  //     selectClass(null);
  //   }
  // };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    
    const scaleBy = 1.05; // Reduced for smoother zoom
    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    
    // Limit scale with smoother bounds
    const clampedScale = Math.max(0.2, Math.min(2.5, newScale));
    
    setScale(clampedScale);
    setPosition({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const id = node.id();
    
    if (id && diagram) {
      const umlClass = diagram.classes.find(cls => cls.id === id);
      if (umlClass) {
        updateClass(id, {
          position: {
            x: node.x(),
            y: node.y()
          }
        });
      }
    }
  };


  const handleClassUpdate = (classId: string, updates: Partial<UMLClass>) => {
    updateClass(classId, updates);
  };

  const handleConnectionStart = (classId: string, x: number, y: number) => {
    setRelationStart({ classId, x, y });
    setIsCreatingRelation(true);
  };

  const handleClassClick = (classId: string) => {
    if (isCreatingRelation && relationStart && relationStart.classId !== classId) {
      // Complete relation creation
      setPendingRelation({ sourceId: relationStart.classId, targetId: classId });
      setShowRelationModal(true);
      setIsCreatingRelation(false);
      setRelationStart(null);
      setTempEndPoint(null);
    } else {
      // Normal class selection
      selectClass(classId);
      selectRelation(null);
    }
  };

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Only handle stage clicks if we're not clicking on a class or relation
    if (e.target === e.target.getStage()) {
      if (isCreatingRelation) {
        // Cancel relation creation
        setIsCreatingRelation(false);
        setRelationStart(null);
        setTempEndPoint(null);
      } else {
        // Deselect if clicking on empty space
        selectClass(null);
        selectRelation(null);
      }
    }
  };

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isCreatingRelation && relationStart) {
      const stage = e.target.getStage();
      if (stage) {
        const pointer = stage.getPointerPosition();
        if (pointer) {
          setTempEndPoint({ x: pointer.x, y: pointer.y });
        }
      }
    }
  };

  const handleRelationConfirm = (relationData: Omit<UMLRelation, 'id'>) => {
    if (pendingRelation) {
      const newRelation: UMLRelation = {
        ...relationData,
        id: `relation-${Date.now()}`
      };
      addRelation(newRelation);
    }
    setPendingRelation(null);
  };

  const handleRelationCancel = () => {
    setPendingRelation(null);
  };

  return (
    <div className="canvas-container" style={{ width, height, position: 'relative' }}>
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        onClick={handleStageClick}
        onMouseMove={handleStageMouseMove}
        onWheel={handleWheel}
        draggable
        onDragEnd={(e) => {
          setPosition({ x: e.target.x(), y: e.target.y() });
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
                onClick={() => selectRelation(relation.id)}
              />
            );
          })}

          {/* Temporary relation line while creating */}
          {isCreatingRelation && relationStart && tempEndPoint && (
            <Line
              points={[relationStart.x, relationStart.y, tempEndPoint.x, tempEndPoint.y]}
              stroke="#007bff"
              strokeWidth={2}
              dash={[5, 5]}
            />
          )}

          {/* Class nodes */}
          {diagram?.classes.map((umlClass) => {
            // Only render if the class has valid dimensions
            if (!umlClass.width || !umlClass.height || umlClass.width <= 0 || umlClass.height <= 0) {
              return null;
            }
            
            return (
              <ClassNode
                key={umlClass.id}
                umlClass={umlClass}
                isSelected={selectedClassId === umlClass.id}
                onSelect={handleClassClick}
                onUpdate={handleClassUpdate}
                onDragEnd={handleDragEnd}
                onConnectionStart={handleConnectionStart}
              />
            );
          })}
        </Layer>
      </Stage>
      
      {/* Canvas controls */}
      <div className="canvas-controls" style={{
        position: 'absolute',
        top: 10,
        right: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }}>
        <button
          onClick={() => {
            setScale(1);
            setPosition({ x: 0, y: 0 });
          }}
          style={{
            padding: '8px 12px',
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Reset View
        </button>
        <div style={{
          padding: '4px 8px',
          backgroundColor: '#fff',
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          {Math.round(scale * 100)}%
        </div>
      </div>

      {/* Relation Modal */}
      {showRelationModal && pendingRelation && diagram && (
        <RelationModal
          isOpen={showRelationModal}
          onClose={handleRelationCancel}
          onConfirm={handleRelationConfirm}
          sourceClassId={pendingRelation.sourceId}
          targetClassId={pendingRelation.targetId}
          sourceClassName={diagram.classes.find(c => c.id === pendingRelation.sourceId)?.name || 'Unknown'}
          targetClassName={diagram.classes.find(c => c.id === pendingRelation.targetId)?.name || 'Unknown'}
        />
      )}
    </div>
  );
};

