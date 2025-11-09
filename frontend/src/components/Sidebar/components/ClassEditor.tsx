import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { UMLClass, UMLAttribute, UMLMethod } from '../../../types/uml';
import './style/ClassEditor.css';

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
  const typeOptions = [
    '',
    'String',
    'Long',
    'Integer',
    'Float',
    'Double',
    'Boolean',
    'LocalDate',
    'LocalDateTime',
    'Date',
    'BigDecimal'
  ];
  return (
    <div className="class-editor">
      <h3 className="class-editor__title">
        Edit: {selectedClass.name}
      </h3>

      {/* Nombre de Clase */}
      <div className="class-editor__section">
        <label className="class-editor__label">
          Nombre de Clase
        </label>
        <input
          className="class-editor__input"
          type="text"
          value={selectedClass.name}
          onChange={(e) => onClassUpdate({ name: e.target.value })}
        />
      </div>

      {/* Atributos */}
      <div className="class-editor__section">
        <div className="attributes-header">
          <label className="class-editor__label" style={{ margin: 0 }}>Atributos</label>
          <button
            onClick={onAddAttribute}
            className="btn-add"
            title="Agregar nuevo atributo"
          >
            <Plus size={12} />
          </button>
        </div>

        {(selectedClass.attributes ?? []).map((attr, index) => (
          <div key={index} className="attr-row">
            <div className="attr-name">
              <input
                type="text"
                value={attr.name}
                onChange={(e) => onUpdateAttribute(index, { name: e.target.value })}
                placeholder="nombre"
              />
            </div>

            <div className="attr-type">
              <select
                value={attr.type || ''}
                onChange={(e) => onUpdateAttribute(index, { type: e.target.value })}
              >
                {typeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t === '' ? 'Seleccionar tipo' : t}
                  </option>
                ))}
              </select>
            </div>

            <label className="attr-id">
              <input
                type="checkbox"
                checked={attr.isId || false}
                onChange={(e) => onUpdateAttribute(index, { isId: e.target.checked })}
              />
              ID
            </label>

            <button
              onClick={() => onDeleteAttribute(index)}
              className="btn-delete"
              title="Eliminar atributo"
            >
              <Trash2 size={10} />
            </button>
          </div>
        ))}
      </div>

      {/* Métodos */}
      <div>
        <div className="attributes-header" style={{ marginBottom: 8 }}>
          <label className="class-editor__label" style={{ margin: 0 }}>Métodos</label>
          <button
            onClick={onAddMethod}
            className="btn-add"
            title="Agregar nuevo método"
          >
            <Plus size={12} />
          </button>
        </div>

        {(selectedClass.methods ?? []).map((method, index) => (
          <div key={index} className="method-row">
            <div className="method-name">
              <input
                type="text"
                value={method.name}
                onChange={(e) => onUpdateMethod(index, { name: e.target.value })}
                placeholder="nombre del método"
              />
            </div>
            <div className="method-return">
              <input
                type="text"
                value={method.returnType}
                onChange={(e) => onUpdateMethod(index, { returnType: e.target.value })}
                placeholder="tipo de retorno"
              />
            </div>
            <button
              onClick={() => onDeleteMethod(index)}
              className="btn-delete"
              title="Eliminar método"
            >
              <Trash2 size={10} />
            </button>
          </div>
        ))}
      </div>

      {/* Eliminar Clase */}
      <div className="class-delete">
        <button
          onClick={onDeleteClass}
          className="btn-full"
        >
          Eliminar Clase
        </button>
      </div>
    </div>
  );
};