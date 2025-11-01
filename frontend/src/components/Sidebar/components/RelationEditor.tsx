import React from 'react';
import { UMLRelation } from '../../../types/uml';

interface RelationEditorProps {
  selectedRelation: UMLRelation;
  onUpdateRelation: (id: string, updates: any) => void;
  onDeleteRelation: (id: string) => void;
}

export const RelationEditor: React.FC<RelationEditorProps> = ({
  selectedRelation,
  onUpdateRelation,
  onDeleteRelation
}) => {
  return (
    <div>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
        Edit Relation
      </h3>

      {/* Tipo de Relación */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          Tipo de Relación
        </label>
        <select
          value={selectedRelation.type}
          onChange={(e) => onUpdateRelation(selectedRelation.id, { type: e.target.value })}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          <option value="ONE_TO_ONE">One to One (1:1)</option>
          <option value="ONE_TO_MANY">One to Many (1:N)</option>
          <option value="MANY_TO_ONE">Many to One (N:1)</option>
          <option value="MANY_TO_MANY">Many to Many (N:M)</option>
          <option value="INHERITANCE">Inheritance</option>
          <option value="COMPOSITION">Composition</option>
          <option value="AGGREGATION">Aggregation</option>
        </select>
      </div>

      {/* Cardinalidad Origen */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          Cardinalidad Origen
        </label>
        <input
          type="text"
          value={selectedRelation.sourceCardinality}
          onChange={(e) => onUpdateRelation(selectedRelation.id, { sourceCardinality: e.target.value })}
          placeholder="ej: 1, *, 0..1"
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      {/* Cardinalidad Destino */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          Cardinalidad Destino
        </label>
        <input
          type="text"
          value={selectedRelation.targetCardinality}
          onChange={(e) => onUpdateRelation(selectedRelation.id, { targetCardinality: e.target.value })}
          placeholder="ej: 1, *, 0..1"
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      {/* Etiqueta */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          Etiqueta
        </label>
        <input
          type="text"
          value={selectedRelation.label || ''}
          onChange={(e) => onUpdateRelation(selectedRelation.id, { label: e.target.value })}
          placeholder="Etiqueta de relación"
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      {/* Mapeado Por */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          Mapeado Por (mappedBy)
        </label>
        <input
          type="text"
          value={selectedRelation.mappedBy || ''}
          onChange={(e) => onUpdateRelation(selectedRelation.id, { mappedBy: e.target.value })}
          placeholder="Nombre del campo"
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
        <small style={{ fontSize: '11px', color: '#6c757d', display: 'block', marginTop: '4px' }}>
          Campo en JPA que posee la relación bidireccional
        </small>
      </div>

      {/* Eliminar Relación */}
      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #dee2e6' }}>
        <button
          onClick={() => onDeleteRelation(selectedRelation.id)}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Eliminar Relación
        </button>
      </div>
    </div>
  );
};