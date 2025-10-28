
import React, { useState } from 'react';
import { UMLRelation } from '../types/uml';
import './style/RelationModal.css';

/**
 * Opciones de tipo de relación disponibles en el modal.
 * value: clave usada en el modelo / backend
 * label: texto visible para el usuario
 */
const RELATION_TYPES = [
  { value: 'ONE_TO_ONE', label: 'Uno a Uno' },
  { value: 'ONE_TO_MANY', label: 'Uno a Muchos' },
  { value: 'MANY_TO_ONE', label: 'Muchos a Uno' },
  { value: 'MANY_TO_MANY', label: 'Muchos a Muchos' },
  { value: 'INHERITANCE', label: 'Herencia' },
  { value: 'COMPOSITION', label: 'Composición' },
  { value: 'AGGREGATION', label: 'Agregación' }
];

/**
 * Opciones de cardinalidad para los selectores de la UI.
 */
const CARDINALITY_OPTIONS = [
  { value: '1', label: '1' },
  { value: '0..1', label: '0..1' },
  { value: '1..*', label: '1..*' },
  { value: '0..*', label: '0..*' },
  { value: '*', label: '*' }
];

interface RelationModalProps {
  /**
   * Mostrar/ocultar modal
   */
  isOpen: boolean;
  /**
   * Cerrar modal (sin confirmar)
   */
  onClose: () => void;
  /**
   * Callback cuando el usuario confirma la creación de la relación.
   * Recibe un objeto Omit<UMLRelation, 'id'> (el id lo genera el backend / store).
   */
  onConfirm: (relationData: Omit<UMLRelation, 'id'>) => void;
  sourceClassId: string;
  targetClassId: string;
  sourceClassName: string;
  targetClassName: string;
}

/**
 * RelationModal
 *
 * Componente que muestra un formulario para crear/editar relaciones UML entre dos clases.
 * - Controlado externamente mediante isOpen/onClose.
 * - Al confirmar invoca onConfirm con los datos necesarios (sin id).
 *
 * Estado local:
 * - type: tipo de relación (ONE_TO_ONE, etc.)
 * - sourceCardinality / targetCardinality: cardinalidades seleccionadas
 * - label / mappedBy / joinColumn: campos opcionales de la relación
 */
export const RelationModal: React.FC<RelationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  sourceClassId,
  targetClassId,
  sourceClassName,
  targetClassName
}) => {
  const [type, setType] = useState<UMLRelation['type']>('ONE_TO_ONE');
  const [sourceCardinality, setSourceCardinality] = useState('1');
  const [targetCardinality, setTargetCardinality] = useState('1');
  const [label, setLabel] = useState('');
  const [mappedBy, setMappedBy] = useState('');
  const [joinColumn, setJoinColumn] = useState('');

  /**
   * handleSubmit
   * - Evita el comportamiento por defecto del form.
   * - Construye el objeto de relación (sin id) y llama a onConfirm.
   * - Cierra el modal con onClose.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const relationData: Omit<UMLRelation, 'id'> = {
      type,
      source: sourceClassId,
      target: targetClassId,
      sourceCardinality,
      targetCardinality,
      label: label || undefined,
      mappedBy: mappedBy || undefined,
      joinColumn: joinColumn || undefined
    };

    onConfirm(relationData);
    onClose();
  };

  // Si el modal está cerrado no renderizamos nada.
  if (!isOpen) return null;

  return (
    <div
      className="relation-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="relation-modal-title"
    >
      <div className="relation-modal" tabIndex={-1}>
        {/* Header: título y botón de cierre */}
        <div className="relation-modal-header">
          <h2 id="relation-modal-title" className="relation-modal-title">
            Crear Relación: {sourceClassName} → {targetClassName}
          </h2>
          <button className="relation-close" onClick={onClose} aria-label="Cerrar diálogo">
            ×
          </button>
        </div>

        {/* Body: formulario con campos para tipo, cardinalidades y metadatos */}
        <div className="relation-modal-body">
          <form onSubmit={handleSubmit}>
            {/* Tipo de relación */}
            <div className="field">
              <label className="field-label">Tipo de Relación</label>
              <select
                className="field-select"
                value={type}
                onChange={(e) => setType(e.target.value as UMLRelation['type'])}
              >
                {RELATION_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Cardinalidades: origen y destino */}
            <div className="row" style={{ marginBottom: 12 }}>
              <div className="flex field">
                <label className="field-label">{sourceClassName} Cardinality</label>
                <select
                  className="field-select"
                  value={sourceCardinality}
                  onChange={(e) => setSourceCardinality(e.target.value)}
                >
                  {CARDINALITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex field">
                <label className="field-label">{targetClassName} Cardinality</label>
                <select
                  className="field-select"
                  value={targetCardinality}
                  onChange={(e) => setTargetCardinality(e.target.value)}
                >
                  {CARDINALITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Etiqueta opcional */}
            <div className="field">
              <label className="field-label">Etiqueta (opcional)</label>
              <input
                className="field-input"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="ej: posee, contiene, usa"
              />
            </div>

            {/* MappedBy opcional (para relaciones bidireccionales en JPA) */}
            <div className="field">
              <label className="field-label">Mapeado Por (opcional)</label>
              <input
                className="field-input"
                type="text"
                value={mappedBy}
                onChange={(e) => setMappedBy(e.target.value)}
                placeholder="Nombre del campo en la clase destino"
              />
            </div>

            {/* Join column opcional para relaciones con FK */}
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field-label">Columna de Unión (opcional)</label>
              <input
                className="field-input"
                type="text"
                value={joinColumn}
                onChange={(e) => setJoinColumn(e.target.value)}
                placeholder="Nombre de la columna en la base de datos"
              />
            </div>

            {/* Footer: acciones del modal */}
            <div className="relation-modal-footer">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Crear Relación
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};