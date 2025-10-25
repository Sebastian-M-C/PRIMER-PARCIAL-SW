import { useState, useCallback } from 'react';
import Konva from 'konva';

/**
 * Hook personalizado para manejar la creación de relaciones entre clases UML.
 * 
 * @param {Function} agregarRelacion - Función del store para añadir relaciones
 * @param {Array} clases - Lista de clases del diagrama
 * @returns {Object} Estado y funciones para la creación de relaciones
 * 
 * @property {boolean} creandoRelacion - Indica si está en modo creación de relación
 * @property {Object} inicioRelacion - Punto de inicio de la relación {classId, x, y}
 * @property {Object} puntoFinalTemporal - Punto final temporal mientras se arrastra
 * @property {boolean} mostrarModalRelacion - Controla la visibilidad del modal
 * @property {Object} relacionPendiente - Datos de la relación pendiente de confirmar
 * @property {Function} iniciarConexion - Inicia la creación de una relación
 * @property {Function} manejarClickClase - Maneja el click en una clase durante la creación
 * @property {Function} manejarClickStage - Maneja el click en el stage durante la creación
 * @property {Function} manejarMovimientoMouse - Actualiza el punto final temporal
 * @property {Function} confirmarRelacion - Confirma la creación de la relación
 * @property {Function} cancelarRelacion - Cancela la creación de la relación
 */
export const useCreacionRelaciones = (agregarRelacion, clases) => {
  const [creandoRelacion, setCreandoRelacion] = useState(false);
  const [inicioRelacion, setInicioRelacion] = useState(null);
  const [puntoFinalTemporal, setPuntoFinalTemporal] = useState(null);
  const [mostrarModalRelacion, setMostrarModalRelacion] = useState(false);
  const [relacionPendiente, setRelacionPendiente] = useState(null);

  /**
   * Inicia la creación de una relación desde una clase específica
   * 
   * @param {string} idClase - ID de la clase de origen
   * @param {number} x - Coordenada X absoluta de inicio
   * @param {number} y - Coordenada Y absoluta de inicio
   */
  const iniciarConexion = useCallback((idClase, x, y) => {
    setInicioRelacion({ classId: idClase, x, y });
    setCreandoRelacion(true);
  }, []);

  /**
   * Maneja el click en una clase durante la creación de relación
   * 
   * @param {string} idClase - ID de la clase clickeada
   * @param {Function} seleccionarClase - Función para seleccionar clase normalmente
   */
  const manejarClickClase = useCallback((idClase, seleccionarClase) => {
    if (creandoRelacion && inicioRelacion && inicioRelacion.classId !== idClase) {
      // Completar creación de relación
      setRelacionPendiente({ 
        sourceId: inicioRelacion.classId, 
        targetId: idClase 
      });
      setMostrarModalRelacion(true);
      setCreandoRelacion(false);
      setInicioRelacion(null);
      setPuntoFinalTemporal(null);
    } else {
      // Selección normal de clase
      seleccionarClase(idClase);
    }
  }, [creandoRelacion, inicioRelacion]);

  /**
   * Maneja clicks en el stage (área vacía) durante la creación de relación
   * 
   * @param {Konva.KonvaEventObject<MouseEvent>} e - Evento de click
   * @param {Function} seleccionarClase - Función para deseleccionar
   */
  const manejarClickStage = useCallback((e, seleccionarClase) => {
    // Solo manejar clicks en el stage vacío
    if (e.target === e.target.getStage()) {
      if (creandoRelacion) {
        // Cancelar creación de relación
        setCreandoRelacion(false);
        setInicioRelacion(null);
        setPuntoFinalTemporal(null);
      } else {
        // Deseleccionar elementos
        seleccionarClase(null);
      }
    }
  }, [creandoRelacion]);

  /**
   * Actualiza el punto final temporal durante el movimiento del mouse
   * 
   * @param {Konva.KonvaEventObject<MouseEvent>} e - Evento de movimiento
   */
  const manejarMovimientoMouse = useCallback((e) => {
    if (creandoRelacion && inicioRelacion) {
      const stage = e.target.getStage();
      if (stage) {
        const posicionPuntero = stage.getPointerPosition();
        if (posicionPuntero) {
          setPuntoFinalTemporal({ x: posicionPuntero.x, y: posicionPuntero.y });
        }
      }
    }
  }, [creandoRelacion, inicioRelacion]);

  /**
   * Confirma la creación de una relación desde el modal
   * 
   * @param {Object} datosRelacion - Datos de la relación (sin ID)
   */
  const confirmarRelacion = useCallback((datosRelacion) => {
    if (relacionPendiente) {
      const nuevaRelacion = {
        ...datosRelacion,
        id: `relacion-${Date.now()}`
      };
      agregarRelacion(nuevaRelacion);
    }
    setRelacionPendiente(null);
    setMostrarModalRelacion(false);
  }, [relacionPendiente, agregarRelacion]);

  /**
   * Cancela la relación pendiente y cierra el modal
   */
  const cancelarRelacion = useCallback(() => {
    setRelacionPendiente(null);
    setMostrarModalRelacion(false);
  }, []);

  /**
   * Obtiene los nombres de las clases para el modal
   */
  const obtenerNombresClases = useCallback(() => {
    if (!relacionPendiente) return { nombreOrigen: 'Desconocido', nombreDestino: 'Desconocido' };
    
    const claseOrigen = clases.find(c => c.id === relacionPendiente.sourceId);
    const claseDestino = clases.find(c => c.id === relacionPendiente.targetId);
    
    return {
      nombreOrigen: claseOrigen?.name || 'Desconocido',
      nombreDestino: claseDestino?.name || 'Desconocido'
    };
  }, [relacionPendiente, clases]);

  return {
    // Estado
    creandoRelacion,
    inicioRelacion,
    puntoFinalTemporal,
    mostrarModalRelacion,
    relacionPendiente,
    
    // Funciones
    iniciarConexion,
    manejarClickClase,
    manejarClickStage,
    manejarMovimientoMouse,
    confirmarRelacion,
    cancelarRelacion,
    obtenerNombresClases,
    
    // Setters para control externo
    setMostrarModalRelacion
  };
};