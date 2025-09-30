import React, { useState } from 'react';
import { UMLRelation } from '../types/uml';

interface RelationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (relationData: Omit<UMLRelation, 'id'>) => void;
  sourceClassId: string;
  targetClassId: string;
  sourceClassName: string;
  targetClassName: string;
}

const RELATION_TYPES = [
  { value: 'ONE_TO_ONE', label: 'Uno a Uno' },
  { value: 'ONE_TO_MANY', label: 'Uno a Muchos' },
  { value: 'MANY_TO_ONE', label: 'Muchos a Uno' },
  { value: 'MANY_TO_MANY', label: 'Muchos a Muchos' },
  { value: 'INHERITANCE', label: 'Herencia' },
  { value: 'COMPOSITION', label: 'Composición' },
  { value: 'AGGREGATION', label: 'Agregación' }
];

const CARDINALITY_OPTIONS = [
  { value: '1', label: '1' },
  { value: '0..1', label: '0..1' },
  { value: '1..*', label: '1..*' },
  { value: '0..*', label: '0..*' },
  { value: '*', label: '*' }
];

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

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        minWidth: '400px',
        maxWidth: '500px'
      }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
          Crear Relación: {sourceClassName} → {targetClassName}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Relation Type */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Tipo de Relación
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as UMLRelation['type'])}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              {RELATION_TYPES.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Cardinalities */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                {sourceClassName} Cardinality
              </label>
              <select
                value={sourceCardinality}
                onChange={(e) => setSourceCardinality(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                {CARDINALITY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                {targetClassName} Cardinality
              </label>
              <select
                value={targetCardinality}
                onChange={(e) => setTargetCardinality(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                {CARDINALITY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Label */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Etiqueta (opcional)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ej: posee, contiene, usa"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Mapped By (for JPA) */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Mapeado Por (opcional)
            </label>
            <input
              type="text"
              value={mappedBy}
              onChange={(e) => setMappedBy(e.target.value)}
              placeholder="Nombre del campo en la clase destino"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Join Column (for JPA) */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Columna de Unión (opcional)
            </label>
            <input
              type="text"
              value={joinColumn}
              onChange={(e) => setJoinColumn(e.target.value)}
              placeholder="Nombre de la columna en la base de datos"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: '#007bff',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Crear Relación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
