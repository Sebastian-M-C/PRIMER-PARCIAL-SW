import React, { useRef } from 'react';
import Konva from 'konva';
import { useDiagramStore } from '../../../store/useDiagramStore';
import { Diagram } from '../../../types/uml';
import { RelationModal } from '../../RelationModal';
import { CanvasStage } from './CanvasStage';

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

  // --- Store del diagrama ---
  const {
    diagram,
    selectedClassId,
    selectedRelationId,
    selectClass,
    selectRelation,
    updateClass,
    addRelation
  } = useDiagramStore();

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
    manejarSeleccionRelacion,
    manejarClickStage: manejarClickStageSeleccion
  } = useSeleccionElementos(
    selectClass,
    selectRelation,
    selectedClassId,
    selectedRelationId
  );

  /**
   * Hook para manejar creación de relaciones
   * -- NOTE: ahora pasamos referenciaStage para que el hook pueda forzar stopDrag/dispatch mouseup
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
    connectionTension, // <-- existente
    actualizarPuntoFinal // <-- nuevo exportado desde el hook
  } = useCreacionRelaciones(addRelation, diagram?.classes || [], referenciaStage); // <-- referenciaStage añadido

  /**
   * Hook para manejar arrastre de nodos
   */
  const {
    arrastrandoNodo,
    stageArrastrable,
    manejarInicioArrastreNodo,
    manejarFinArrastreNodo
  } = useDragNodos(referenciaStage, updateClass, diagram);

  // --- Handlers combinados ---

  /**
   * Maneja el click en una clase combinando lógica de selección y creación de relaciones
   */
  const manejarClickClaseCombinado = (idClase: string) => {
    manejarClickClase(idClase, manejarSeleccionClase);
  };

  /**
   * Maneja el click en el stage combinando lógica de selección y creación de relaciones
   */
  const manejarClickStageCombinado = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Combinar lógica de selección y relaciones
    if (creandoRelacion) {
      manejarClickStageRelaciones(e, selectClass);
    } else {
      manejarClickStageSeleccion(e);
    }
  };

  // --- Render condicional por dimensiones inválidas ---
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
          Cargando lienzo...
        </div>
      </div>
    );
  }

  // --- Obtener nombres para el modal ---
  const { nombreOrigen, nombreDestino } = relacionPendiente 
    ? obtenerNombresClases() 
    : { nombreOrigen: 'Desconocido', nombreDestino: 'Desconocido' };

  // --- JSX principal ---
  return (
    <div className="canvas-container" style={{ width, height, position: 'relative' }}>
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

        // <-- nuevo: indicar si debemos desactivar el drag de nodos globalmente
        disableNodesDragging={mostrarModalRelacion}
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

      {/* Modal de relación */}
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
    </div>
  );
};