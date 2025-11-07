import React, { useRef, useState } from 'react';
import Konva from 'konva';
import { useDiagramStore } from '../../../store/useDiagramStore';
import { Diagram } from '../../../types/uml';
import { RelationModal } from '../../Canvas/Relaciones/RelationModal';
import { CanvasStage } from './CanvasStage';
import { RelationContextMenu } from '../../Canvas/Relaciones/RelationContextMenu';

// Importar hooks personalizados
import { useZoomPan } from './hooks/useZoomPan';
import { useCreacionRelaciones } from './hooks/useCreacionRelaciones';
import { useSeleccionElementos } from './hooks/useSeleccionElementos';
import { useDragNodos } from './hooks/useDragNodos';

interface CanvasProps {
  width: number;
  height: number;
}

/**
 * Componente principal del lienzo: mantiene el estado (zoom, pan, creación de relaciones)
 * y orquesta los handlers que se pasan a CanvasStage (render puro).
 * 
 * @component
 * @param {CanvasProps} props - Props del componente
 * @returns {JSX.Element} Componente Canvas
 * 
 * @example
 * <Canvas width={800} height={600} />
 */
export const Canvas: React.FC<CanvasProps> = ({ width, height }) => {
  // --- Referencias ---
  const referenciaStage = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // --- Store del diagrama ---
  const {
    diagram,
    selectedClassId,
    selectedRelationId,
    selectClass,
    selectRelation,
    updateClass,
    addRelation,
    // <-- acciones del store: deleteRelation ya existe en useDiagramStore
    deleteRelation,
    updateRelation
  } = useDiagramStore();
  
  // Estado para menú contextual de relaciones
  const [relationContextMenu, setRelationContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    relationId?: string | null;
  }>({ open: false, x: 0, y: 0, relationId: null });

  // Estado para edición de relación (abre RelationModal en modo edición)
  const [editRelationId, setEditRelationId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // --- Hooks personalizados ---
  /**
   * Hook para manejar zoom y navegación
   */
  const {
    escala,
    posicion,
    manejarRueda,
    manejarFinArrastreStage,
    reiniciarVista
  } = useZoomPan();

  /**
   * Hook para manejar selección de elementos
   */
  const {
    manejarSeleccionClase,
    manejarClickStage: manejarClickStageSeleccion
  } = useSeleccionElementos(
    selectClass,
    selectRelation,
    selectedClassId,
    selectedRelationId
  );

  /**
   * Hook para manejar creación de relaciones
   */
  const {
    creandoRelacion,
    inicioRelacion,
    puntoFinalTemporal,
    mostrarModalRelacion,
    relacionPendiente,
    iniciarConexion,
    manejarClickClase,
    manejarClickStage: manejarClickStageRelaciones,
    manejarMovimientoMouse,
    confirmarRelacion,
    cancelarRelacion,
    obtenerNombresClases,
    setMostrarModalRelacion,
    connectionTension,
    actualizarPuntoFinal
  } = useCreacionRelaciones(addRelation, diagram?.classes || [], referenciaStage);

  /**
   * Hook para manejar arrastre de nodos
   */
  const {
    stageArrastrable,
    manejarInicioArrastreNodo,
    manejarFinArrastreNodo
  } = useDragNodos(referenciaStage, updateClass, diagram);

  // --- Handlers del menú contextual ---
  const openRelationContextMenu = (clientX: number, clientY: number, relationId: string) => {
    // calcular posición relativa al contenedor para posicionar el menú dentro del canvas
    const rect = containerRef.current?.getBoundingClientRect();
    const x = rect ? clientX - rect.left : clientX;
    const y = rect ? clientY - rect.top : clientY;

    setRelationContextMenu({ open: true, x, y, relationId });
  };

  const closeRelationContextMenu = () => {
    setRelationContextMenu({ open: false, x: 0, y: 0, relationId: null });
  };

  const handleDeleteRelation = (relationId?: string | null) => {
    if (!relationId) return;
    if (typeof deleteRelation === 'function') {
      deleteRelation(relationId);
    } else {
      console.warn('deleteRelation no disponible en useDiagramStore; implementar acción en el store.');
    }
    closeRelationContextMenu();
  };

  const handleEditRelation = (relationId?: string | null) => {
    if (!relationId) return;
    setEditRelationId(relationId);
    setEditModalOpen(true);
    closeRelationContextMenu();
  };

  // --- Handlers combinados ---
  const manejarClickClaseCombinado = (idClase: string) => {
    manejarClickClase(idClase, manejarSeleccionClase);
  };

  const manejarClickStageCombinado = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (creandoRelacion) {
      manejarClickStageRelaciones(e, selectClass);
    } else {
      manejarClickStageSeleccion(e);
    }
  };

  // --- Render condicional por dimensiones inválidas ---
  if (!width || !height || width <= 0 || height <= 0) {
    return (
      <div ref={containerRef} className="canvas-container" style={{ width, height, position: 'relative' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          color: '#666',
          fontSize: '14px'
        }}>
          Cargando lienzo...
        </div>
      </div>
    );
  }

  // --- Obtener nombres para el modal de nueva relación ---
  const { nombreOrigen, nombreDestino } = relacionPendiente
    ? obtenerNombresClases()
    : { nombreOrigen: 'Desconocido', nombreDestino: 'Desconocido' };

  // Obtener relación a editar (si hay)
  const relationToEdit = editRelationId ? diagram?.relations?.find(r => r.id === editRelationId) : undefined;
  const editSourceName = relationToEdit ? diagram?.classes?.find(c => c.id === relationToEdit.source)?.name ?? 'Desconocido' : '';
  const editTargetName = relationToEdit ? diagram?.classes?.find(c => c.id === relationToEdit.target)?.name ?? 'Desconocido' : '';

  // --- JSX principal ---
  return (
    <div ref={containerRef} className="canvas-container" style={{ width, height, position: 'relative' }}>
      {/* Stage del lienzo */}
      <CanvasStage
        stageRef={referenciaStage}
        width={width}
        height={height}
        scale={escala}
        position={posicion}
        draggableStage={stageArrastrable}
        diagram={diagram as Diagram}
        selectedClassId={selectedClassId}
        selectedRelationId={selectedRelationId}
        isCreatingRelation={creandoRelacion}
        relationStart={inicioRelacion}
        tempEndPoint={puntoFinalTemporal}
        connectionTension={connectionTension}
        onStageClick={manejarClickStageCombinado}
        onStageMouseMove={manejarMovimientoMouse}
        onHandleDragMove={({ x, y }) => actualizarPuntoFinal(x, y)}
        onWheel={manejarRueda}
        onStageDragEnd={manejarFinArrastreStage}
        onClassClick={manejarClickClaseCombinado}
        onClassUpdate={updateClass}
        onNodeDragStart={manejarInicioArrastreNodo}
        onNodeDragEnd={manejarFinArrastreNodo}
        onConnectionStart={iniciarConexion}

        // nuevo: pasar handler para abrir menú contextual desde ConnectionLine
        onRelationContextMenu={openRelationContextMenu}
        onRelationClick={selectRelation}
        
        // <-- nuevo: indicar si debemos desactivar el drag de nodos globalmente
        disableNodesDragging={mostrarModalRelacion}
      />

      {/* Menú contextual para relaciones (absoluto dentro del contenedor) */}
      <RelationContextMenu
        x={relationContextMenu.x}
        y={relationContextMenu.y}
        isOpen={relationContextMenu.open}
        onClose={closeRelationContextMenu}
        onEdit={() => handleEditRelation(relationContextMenu.relationId)}
        onDelete={() => handleDeleteRelation(relationContextMenu.relationId)}
      />

      {/* Controles de vista */}
      <div className="canvas-controls" style={{
        position: 'absolute',
        top: 10,
        right: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }}>
        <button
          onClick={reiniciarVista}
          style={{
            padding: '8px 12px',
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Reiniciar Vista
        </button>
        <div style={{
          padding: '4px 8px',
          backgroundColor: '#fff',
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          {Math.round(escala * 100)}%
        </div>
      </div>

      {/* Modal de relación (creación) */}
      {mostrarModalRelacion && relacionPendiente && (
        <RelationModal
          isOpen={mostrarModalRelacion}
          onClose={() => {
            cancelarRelacion();
            setMostrarModalRelacion(false);
          }}
          onConfirm={(relationData) => {
            confirmarRelacion(relationData);
            setMostrarModalRelacion(false);
          }}
          sourceClassId={relacionPendiente.sourceId}
          targetClassId={relacionPendiente.targetId}
          sourceClassName={nombreOrigen}
          targetClassName={nombreDestino}
        />
      )}

      {/* Modal de relación (edición) */}
      {editModalOpen && relationToEdit && (
        <RelationModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditRelationId(null);
          }}
          onConfirm={(relationData) => {
            if (typeof updateRelation === 'function' && editRelationId) {
              updateRelation(editRelationId, { ...relationData, id: editRelationId });
            } else {
              console.warn('updateRelation no disponible en useDiagramStore; implementar acción en el store.');
            }
            setEditModalOpen(false);
            setEditRelationId(null);
          }}
          sourceClassId={relationToEdit.source}
          targetClassId={relationToEdit.target}
          sourceClassName={editSourceName}
          targetClassName={editTargetName}
        />
      )}
    </div>
  );
};