import React, { useEffect, useState } from 'react';
import { UMLRelation } from '../../types/uml';

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

interface JoinAttribute {
  name: string;
  type: string;
}

interface RelationModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Ahora onConfirm recibe optional joinConfig cuando type === 'MANY_TO_MANY'
   */
  onConfirm: (
    relationData: Omit<UMLRelation, 'id'>,
    joinConfig?: { name: string; attributes: JoinAttribute[] }
  ) => void;
  sourceClassId: string;
  targetClassId?: string;
  sourceClassName?: string;
  targetClassName?: string;
  // Optional initial relation to prefill the modal when editing
  initialRelation?: Omit<UMLRelation, 'id'> | UMLRelation;
}

export const RelationModal: React.FC<RelationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  sourceClassId,
  targetClassId,
  sourceClassName = '',
  targetClassName = '',
  initialRelation
}) => {
  const [type, setType] = useState<string>('ONE_TO_ONE');
  const [sourceCardinality, setSourceCardinality] = useState<string>('1');
  const [targetCardinality, setTargetCardinality] = useState<string>('1');
  const [label, setLabel] = useState<string>('');

  const [mappedBy, setMappedBy] = useState<string>('');
  const [joinColumn, setJoinColumn] = useState<string>('');

  const [joinName, setJoinName] = useState<string>('');
  // Start with no default attribute so the modal doesn't force an 'id:int' field
  const [joinAttributes, setJoinAttributes] = useState<JoinAttribute[]>([]);

  // Opciones de tipo reusables (compatibles con ClassEditor)
  const typeOptions = [
    '',
    'int',
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

  useEffect(() => {
    if (!isOpen) {
      // reset
      setType('ONE_TO_ONE');
      setSourceCardinality('1');
      setTargetCardinality('1');
      setLabel('');
      setMappedBy('');
      setJoinColumn('');
      setJoinName('');
      setJoinAttributes([]);
      return;
    }

    // If opened for editing, prefill fields from initialRelation
    if (initialRelation) {
      setType(initialRelation.type || 'ONE_TO_ONE');
      setSourceCardinality(initialRelation.sourceCardinality || '1');
      setTargetCardinality(initialRelation.targetCardinality || '1');
      setLabel(initialRelation.label || '');
      setMappedBy(initialRelation.mappedBy || '');
      setJoinColumn(initialRelation.joinColumn || '');
      
      // joinClass info (name/attrs) aren't part of relation; leave join fields empty
      setJoinName('');
      setJoinAttributes([]);
      return;
    }

    // otherwise fresh open -> ensure defaults
    setType('ONE_TO_ONE');
    setSourceCardinality('1');
    setTargetCardinality('1');
    setLabel('');
 
    setMappedBy('');
    setJoinColumn('');
    setJoinName('');
    setJoinAttributes([]);
  }, [isOpen, initialRelation]);

  // Cuando el tipo de relación cambia, establecer cardinalidades por defecto
  // apropiadas para ese tipo. Esto evita que el usuario tenga que corregir
  // manualmente las etiquetas después de crear la relación.
  useEffect(() => {
    // Only apply automatic defaults when creating a new relation (no initialRelation)
    if (initialRelation) return;

    switch (type) {
      case 'ONE_TO_ONE':
        setSourceCardinality('1');
        setTargetCardinality('1');
        break;
      case 'ONE_TO_MANY':
        // origen 1, destino muchos
        setSourceCardinality('1');
        setTargetCardinality('1..*');
        break;
      case 'MANY_TO_ONE':
        // origen muchos, destino 1
        setSourceCardinality('1..*');
        setTargetCardinality('1');
        break;
      case 'MANY_TO_MANY':
        setSourceCardinality('1..*');
        setTargetCardinality('1..*');
        break;
      case 'INHERITANCE':
        setSourceCardinality('1');
        setTargetCardinality('1');
        break;
      case 'COMPOSITION':
        setSourceCardinality('1');
        setTargetCardinality('1..*');
        break;
      case 'AGGREGATION':
        setSourceCardinality('1');
        setTargetCardinality('0..*');
        break;
      default:
        break;
    }
  }, [type]);

 
  

  if (!isOpen) return null;

  const handleAddAttribute = () => setJoinAttributes(prev => [...prev, { name: '', type: '' }]);
  const handleRemoveAttribute = (index: number) => setJoinAttributes(prev => prev.filter((_, i) => i !== index));
  const handleAttributeChange = (index: number, key: 'name' | 'type', value: string) =>
    setJoinAttributes(prev => prev.map((a, i) => i === index ? { ...a, [key]: value } : a));

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const relationData: Omit<UMLRelation, 'id'> = {
      source: sourceClassId,
      target: targetClassId || '',
      type,
      sourceCardinality,
      targetCardinality,
      label: label || undefined,
      mappedBy: mappedBy || undefined,
      joinColumn: joinColumn || undefined
    };

    if (type === 'MANY_TO_MANY') {
      const joinConfig = {
        name: joinName || `${sourceClassName}_${targetClassName}_DETALLE`,
        attributes: joinAttributes.filter(a => a.name.trim() !== '')
      };
     
      onConfirm(relationData, joinConfig);
    } else {
      onConfirm(relationData);
    }
    onClose();
  };

  // Warm orange theme + readable black text
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000
  };

  const boxStyle: React.CSSProperties = {
    width: 520,
    maxHeight: '85vh',
    overflowY: 'auto',
    background: 'linear-gradient(180deg,#fff8f0,#fff4ee)',
    borderRadius: 10,
    padding: 20,
    boxShadow: '0 14px 40px rgba(0,0,0,0.25)',
    border: '1px solid rgba(255,140,40,0.18)',
    boxSizing: 'border-box'
  };

  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: 6, fontSize: 13, color: '#111' };
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #f0a95a',
    boxSizing: 'border-box',
    fontSize: 14,
    background: '#fff',
    color: '#111'
  };
  const smallInputStyle: React.CSSProperties = { ...inputStyle, width: 120 };
  const headerStyle: React.CSSProperties = { margin: 0, marginBottom: 12, fontSize: 18, color: '#b44f00' };
  const footerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 };

  const neutralButtonStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 8,
    background: '#fff',
    border: '1px solid rgba(180,120,80,0.25)',
    color: '#111',
    cursor: 'pointer'
  };

  const confirmButtonStyle: React.CSSProperties = {
    padding: '8px 14px',
    borderRadius: 8,
    background: '#ff7a18',
    color: '#fff',
    border: 'none',
    cursor: 'pointer'
  };

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true">
      <div style={boxStyle}>
        <h3 style={headerStyle}>Crear / Editar relación</h3>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Tipo</label>
            <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
              {RELATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Cardinalidad origen ({sourceClassName || 'origen'})</label>
              {/** If MANY_TO_MANY only allow 1..* or 0..* */}
              <select value={sourceCardinality} onChange={e => setSourceCardinality(e.target.value)} style={inputStyle}>
                {(type === 'MANY_TO_MANY' ? [
                  { value: '1..*', label: '1..*' },
                  { value: '0..*', label: '0..*' }
                ] : CARDINALITY_OPTIONS).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Cardinalidad destino ({targetClassName || 'destino'})</label>
              <select value={targetCardinality} onChange={e => setTargetCardinality(e.target.value)} style={inputStyle}>
                {(type === 'MANY_TO_MANY' ? [
                  { value: '1..*', label: '1..*' },
                  { value: '0..*', label: '0..*' }
                ] : CARDINALITY_OPTIONS).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Etiqueta (opcional)</label>
            <input value={label} onChange={e => setLabel(e.target.value)} style={inputStyle} />
          </div>

          {type === 'MANY_TO_MANY' && (
            <div style={{ marginTop: 8, paddingTop: 10, borderTop: '1px solid rgba(255,140,40,0.08)' }}>
              <h4 style={{ margin: '6px 0 10px 0', color: '#9a3d00' }}>Clase intermedia</h4>

              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>Nombre de la clase intermedia</label>
                <input
                  value={joinName}
                  onChange={e => setJoinName(e.target.value)}
                  placeholder={`${sourceClassName}_${targetClassName}_DETALLE`}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Atributos</label>
              
                {joinAttributes.map((attr, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <input
                      value={attr.name}
                      onChange={e => handleAttributeChange(idx, 'name', e.target.value)}
                      placeholder="nombre"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <select
                      value={attr.type}
                      onChange={e => handleAttributeChange(idx, 'type', e.target.value)}
                      style={smallInputStyle}
                    >
                      {typeOptions.map(t => (
                        <option key={t} value={t}>
                          {t === '' ? 'Seleccionar tipo' : t}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttribute(idx)}
                      style={{ background: 'transparent', border: 'none', color: '#c53030', cursor: 'pointer' }}
                    >
                      Eliminar
                    </button>
                  </div>
                ))}

                <div style={{ marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={handleAddAttribute}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 8,
                      background: '#fff8f0',
                      border: '1px solid #ffd6b3',
                      cursor: 'pointer',
                      color: '#7a3f00'
                    }}
                  >
                    Añadir atributo
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={footerStyle}>
            <button type="button" onClick={onClose} style={neutralButtonStyle}>
              Cancelar
            </button>
            <button type="submit" style={confirmButtonStyle}>
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};