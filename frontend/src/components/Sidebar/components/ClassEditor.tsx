import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { UMLClass, UMLAttribute, UMLMethod } from '../../../types/uml';

interface ClassEditorProps {
  selectedClass: UMLClass;
  onClassUpdate: (updates: any) => void;
  onAddAttribute: () => void;
  onUpdateAttribute: (index: number, updates: Partial<UMLAttribute>) => void;
  onDeleteAttribute: (index: number) => void;
  onAddMethod: () => void;
  onUpdateMethod: (index: number, updates: Partial<UMLMethod>) => void;
  onDeleteMethod: (index: number) => void;
  onDeleteClass: () => void;
}

export const ClassEditor: React.FC<ClassEditorProps> = ({
  selectedClass,
  onClassUpdate,
  onAddAttribute,
  onUpdateAttribute,
  onDeleteAttribute,
  onAddMethod,
  onUpdateMethod,
  onDeleteMethod,
  onDeleteClass
}) => {
  return (
    <div>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
        Edit: {selectedClass.name}
      </h3>

      {/* Nombre de Clase */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          Nombre de Clase
        </label>
        <input
          type="text"
          value={selectedClass.name}
          onChange={(e) => onClassUpdate({ name: e.target.value })}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      {/* Atributos */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: '500' }}>Atributos</label>
          <button
            onClick={onAddAttribute}
            style={{
              padding: '4px 8px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            title="Agregar nuevo atributo"
          >
            <Plus size={12} />
          </button>
        </div>

        {(selectedClass.attributes ?? []).map((attr, index) => (
          <div key={index} style={{
            display: 'flex',
            gap: '4px',
            marginBottom: '4px',
            alignItems: 'center'
          }}>
            <input
              type="text"
              value={attr.name}
              onChange={(e) => onUpdateAttribute(index, { name: e.target.value })}
              placeholder="nombre"
              style={{
                flex: 1,
                padding: '4px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            />
            <input
              type="text"
              value={attr.type}
              onChange={(e) => onUpdateAttribute(index, { type: e.target.value })}
              placeholder="tipo"
              style={{
                flex: 1,
                padding: '4px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            />
            <label style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '2px' }}>
              <input
                type="checkbox"
                checked={attr.isId || false}
                onChange={(e) => onUpdateAttribute(index, { isId: e.target.checked })}
              />
              ID
            </label>
            <button
              onClick={() => onDeleteAttribute(index)}
              style={{
                padding: '2px 4px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '10px'
              }}
              title="Eliminar atributo"
            >
              <Trash2 size={10} />
            </button>
          </div>
        ))}
      </div>

      {/* Métodos */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: '500' }}>Métodos</label>
          <button
            onClick={onAddMethod}
            style={{
              padding: '4px 8px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            title="Agregar nuevo método"
          >
            <Plus size={12} />
          </button>
        </div>

        {(selectedClass.methods ?? []).map((method, index) => (
          <div key={index} style={{
            display: 'flex',
            gap: '4px',
            marginBottom: '4px',
            alignItems: 'center'
          }}>
            <input
              type="text"
              value={method.name}
              onChange={(e) => onUpdateMethod(index, { name: e.target.value })}
              placeholder="nombre del método"
              style={{
                flex: 1,
                padding: '4px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            />
            <input
              type="text"
              value={method.returnType}
              onChange={(e) => onUpdateMethod(index, { returnType: e.target.value })}
              placeholder="tipo de retorno"
              style={{
                flex: 1,
                padding: '4px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            />
            <button
              onClick={() => onDeleteMethod(index)}
              style={{
                padding: '2px 4px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '10px'
              }}
              title="Eliminar método"
            >
              <Trash2 size={10} />
            </button>
          </div>
        ))}
      </div>

      {/* Eliminar Clase */}
      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #dee2e6' }}>
        <button
          onClick={onDeleteClass}
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
          Eliminar Clase
        </button>
      </div>
    </div>
  );
};