import { useState, useCallback, useRef, useEffect } from 'react';
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

  // refs para suavizado
  const targetPosRef = useRef(null);
  const currentPosRef = useRef(null);
  const rafRef = useRef(null);
  const SMOOTH_FACTOR = 0.18; // menor = más suave
  const connectionTension = 0.5; // exponer para CanvasStage (Konva.Line tension)

  // iniciar animación de seguimiento suave
  const startSmoothFollow = useCallback(() => {
    if (rafRef.current) return;

    const step = () => {
      if (!currentPosRef.current || !targetPosRef.current) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }

      currentPosRef.current.x += (targetPosRef.current.x - currentPosRef.current.x) * SMOOTH_FACTOR;
      currentPosRef.current.y += (targetPosRef.current.y - currentPosRef.current.y) * SMOOTH_FACTOR;

      setPuntoFinalTemporal({ x: currentPosRef.current.x, y: currentPosRef.current.y });

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
  }, []);

  const stopSmoothFollow = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    targetPosRef.current = null;
    currentPosRef.current = null;
  }, []);

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

    targetPosRef.current = { x, y };
    currentPosRef.current = { x, y };
    setPuntoFinalTemporal({ x, y });
    startSmoothFollow();
  }, [startSmoothFollow]);

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

      // detener suavizado
      stopSmoothFollow();

      setCreandoRelacion(false);
      setInicioRelacion(null);
      setPuntoFinalTemporal(null);
    } else {
      // Selección normal de clase
      seleccionarClase(idClase);
    }
  }, [creandoRelacion, inicioRelacion, stopSmoothFollow]);

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
        stopSmoothFollow();
      } else {
        // Deseleccionar elementos
        seleccionarClase(null);
      }
    }
  }, [creandoRelacion, stopSmoothFollow]);

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
          targetPosRef.current = { x: posicionPuntero.x, y: posicionPuntero.y };
          if (!rafRef.current) startSmoothFollow();
        }
      }
    }
  }, [creandoRelacion, inicioRelacion, startSmoothFollow]);

  /**
   * Actualiza el punto final directamente (útil para handles draggables).
   * Recibe coordenadas absolutas en espacio del stage.
   */
  const actualizarPuntoFinal = useCallback((x, y) => {
    if (!creandoRelacion) return;
    targetPosRef.current = { x, y };
    if (!currentPosRef.current) currentPosRef.current = { x, y };
    if (!rafRef.current) startSmoothFollow();
  }, [creandoRelacion, startSmoothFollow]);

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
    stopSmoothFollow();
  }, [relacionPendiente, agregarRelacion, stopSmoothFollow]);

  /**
   * Cancela la relación pendiente y cierra el modal
   */
  const cancelarRelacion = useCallback(() => {
    setRelacionPendiente(null);
    setMostrarModalRelacion(false);
    stopSmoothFollow();
  }, [stopSmoothFollow]);

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

  // cleanup en unmount
  useEffect(() => {
    return () => {
      stopSmoothFollow();
    };
  }, [stopSmoothFollow]);

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

    // extras
    connectionTension,
    setMostrarModalRelacion,

    // nuevo: permitir actualizar punto desde un handle draggable
    actualizarPuntoFinal
  };
};