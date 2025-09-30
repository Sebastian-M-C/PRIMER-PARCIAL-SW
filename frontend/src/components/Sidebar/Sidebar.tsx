import React, { useState } from 'react';
import { useDiagramStore } from '../../store/useDiagramStore';
import { UMLAttribute, UMLMethod } from '../../types/uml';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
import { Plus, Trash2, Save, Download, Upload, Sparkles, Type, RotateCcw } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    diagram,
    selectedClassId,
    selectedRelationId,
    getClassById,
    getRelationById,
    setDiagram,
    selectClass,
    selectRelation,
    updateClass,
    addClass,
    deleteClass,
    updateRelation,
    deleteRelation
  } = useDiagramStore();

  const selectedClass = selectedClassId ? getClassById(selectedClassId) : null;
  const selectedRelation = selectedRelationId ? getRelationById(selectedRelationId) : null;
  const [isGenerating, setIsGenerating] = useState(false);

  const handleResetDiagram = () => {
    if (confirm('¿Estás seguro de que quieres resetear el diagrama? Se perderán todos los cambios.')) {
      // Reset to default diagram with sample classes
      const defaultDiagram = {
        id: 'default-diagram',
        name: 'Diagrama UML',
        package: 'com.example',
        classes: [
          {
            id: 'user-class',
            name: 'Usuario',
            attributes: [
              { name: 'id', type: 'Long', isId: true },
              { name: 'nombre', type: 'String', nullable: false },
              { name: 'email', type: 'String', unique: true }
            ],
            methods: [
              { name: 'guardar', returnType: 'void', parameters: [] },
              { name: 'buscarPorEmail', returnType: 'Usuario', parameters: [{ name: 'email', type: 'String' }] }
            ],
            position: { x: 100, y: 100 },
            width: 200,
            height: 120
          },
          {
            id: 'pedido-class',
            name: 'Pedido',
            attributes: [
              { name: 'id', type: 'Long', isId: true },
              { name: 'fechaPedido', type: 'LocalDateTime', nullable: false },
              { name: 'total', type: 'BigDecimal', nullable: false }
            ],
            methods: [
              { name: 'calcularTotal', returnType: 'BigDecimal', parameters: [] }
            ],
            position: { x: 400, y: 100 },
            width: 200,
            height: 100
          }
        ],
        relations: [
          {
            id: 'user-pedido-relation',
            type: 'ONE_TO_MANY' as const,
            source: 'user-class',
            target: 'pedido-class',
            sourceCardinality: '1',
            targetCardinality: '*',
            mappedBy: 'usuario',
            label: 'realiza'
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setDiagram(defaultDiagram);
      selectClass(null);
      selectRelation(null);
    }
  };

  const findFreePosition = () => {
    const classWidth = 200;
    const classHeight = 100;
    const spacing = 50;
    
    // Start from center of canvas
    let x = 300;
    let y = 200;
    
    // If no classes exist, use center position
    if (!diagram?.classes.length) {
      return { x, y };
    }
    
    // Try to find a free position
    let attempts = 0;
    const maxAttempts = 20;
    
    while (attempts < maxAttempts) {
      let isFree = true;
      
      // Check if this position overlaps with existing classes
      for (const existingClass of diagram.classes) {
        const existingX = existingClass.position.x;
        const existingY = existingClass.position.y;
        const existingWidth = existingClass.width;
        const existingHeight = existingClass.height;
        
        // Check for overlap
        if (
          x < existingX + existingWidth + spacing &&
          x + classWidth + spacing > existingX &&
          y < existingY + existingHeight + spacing &&
          y + classHeight + spacing > existingY
        ) {
          isFree = false;
          break;
        }
      }
      
      if (isFree) {
        return { x, y };
      }
      
      // Move to next position in a spiral pattern
      attempts++;
      const angle = (attempts * 0.5) * Math.PI;
      const radius = attempts * 80;
      x = 300 + Math.cos(angle) * radius;
      y = 200 + Math.sin(angle) * radius;
    }
    
    // Fallback: return a position that's likely to be free
    return { x: 100 + (diagram.classes.length * 250), y: 100 };
  };

  const handleAddClass = () => {
    const freePosition = findFreePosition();
    
    const newClass = {
      id: `class-${Date.now()}`,
      name: 'NuevaClase',
      attributes: [],
      methods: [],
      position: freePosition,
      width: 200,
      height: 100
    };
    addClass(newClass);
  };

  const handleClassUpdate = (updates: Partial<typeof selectedClass>) => {
    if (selectedClassId && updates) {
      updateClass(selectedClassId, updates);
    }
  };

  const handleAddAttribute = () => {
    if (!selectedClass) return;
    
    const newAttribute: UMLAttribute = {
      name: 'nuevoAtributo',
      type: 'String',
      nullable: false,
      unique: false,
      isId: false
    };
    
    handleClassUpdate({
      attributes: [...selectedClass.attributes, newAttribute]
    });
  };

  const handleUpdateAttribute = (index: number, updates: Partial<UMLAttribute>) => {
    if (!selectedClass) return;
    
    const updatedAttributes = [...selectedClass.attributes];
    updatedAttributes[index] = { ...updatedAttributes[index], ...updates };
    
    handleClassUpdate({ attributes: updatedAttributes });
  };

  const handleDeleteAttribute = (index: number) => {
    if (!selectedClass) return;
    
    const updatedAttributes = (selectedClass.attributes ?? []).filter((_, i) => i !== index);
    handleClassUpdate({ attributes: updatedAttributes });
  };

  const handleAddMethod = () => {
    if (!selectedClass) return;
    
    const newMethod: UMLMethod = {
      name: 'nuevoMetodo',
      returnType: 'void',
      parameters: []
    };
    
    handleClassUpdate({
      methods: [...selectedClass.methods, newMethod]
    });
  };

  const handleUpdateMethod = (index: number, updates: Partial<UMLMethod>) => {
    if (!selectedClass) return;
    
    const updatedMethods = [...selectedClass.methods];
    updatedMethods[index] = { ...updatedMethods[index], ...updates };
    
    handleClassUpdate({ methods: updatedMethods });
  };

  const handleDeleteMethod = (index: number) => {
    if (!selectedClass) return;
    
    const updatedMethods = (selectedClass.methods ?? []).filter((_, i) => i !== index);
    handleClassUpdate({ methods: updatedMethods });
  };

  const handleExportUML = () => {
    if (!diagram) return;
    
    const umlJson = {
      package: diagram.package,
      classes: diagram.classes.map(cls => ({
        name: cls.name,
        attributes: cls.attributes,
        methods: cls.methods
      })),
      relations: diagram.relations.map(rel => ({
        type: rel.type,
        source: rel.source,
        target: rel.target,
        sourceCardinality: rel.sourceCardinality,
        targetCardinality: rel.targetCardinality,
        mappedBy: rel.mappedBy,
        joinColumn: rel.joinColumn,
        label: rel.label
      }))
    };
    
    const blob = new Blob([JSON.stringify(umlJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${diagram.name || 'diagram'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportUML = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const umlJson = JSON.parse(e.target?.result as string);
        // TODO: Import logic
        console.log('Importing UML:', umlJson);
      } catch (error) {
        console.error('Error importing UML:', error);
      }
    };
    reader.readAsText(file);
  };

  const handleGenerateBackend = async () => {
    if (!diagram) return;
    
    setIsGenerating(true);
    try {
      const umlJson = {
        package: diagram.package,
        classes: diagram.classes.map(cls => ({
          name: cls.name,
          attributes: cls.attributes,
          methods: cls.methods
        })),
        relations: diagram.relations.map(rel => ({
          type: rel.type,
          source: rel.source,
          target: rel.target,
          sourceCardinality: rel.sourceCardinality,
          targetCardinality: rel.targetCardinality,
          mappedBy: rel.mappedBy,
          joinColumn: rel.joinColumn,
          label: rel.label
        }))
      };
      
      const response = await fetch(`${SERVER_URL}/api/generator/spring`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(umlJson)
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${diagram.name || 'spring-project'}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        console.error('Failed to generate backend');
      }
    } catch (error) {
      console.error('Error generating backend:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAISuggest = async () => {
    if (!diagram) return;
    
    try {
      setIsGenerating(true);
      
      const umlJson = {
        package: diagram.package,
        classes: diagram.classes.map(cls => ({
          name: cls.name,
          attributes: cls.attributes,
          methods: cls.methods
        })),
        relations: diagram.relations.map(rel => ({
          type: rel.type,
          source: rel.source,
          target: rel.target,
          sourceCardinality: rel.sourceCardinality,
          targetCardinality: rel.targetCardinality,
          mappedBy: rel.mappedBy,
          joinColumn: rel.joinColumn,
          label: rel.label
        }))
      };
      
      const response = await fetch(`${SERVER_URL}/api/ai/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(umlJson)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('AI Suggestions:', result);
        
        // Show suggestions in a simple alert for now
        if (result.suggestions && result.suggestions.length > 0) {
          const suggestionText = result.suggestions
            .map((s: any, index: number) => `${index + 1}. ${s.title}: ${s.description}`)
            .join('\n\n');
          alert(`AI Suggestions:\n\n${suggestionText}`);
        } else {
          alert('No suggestions available at this time.');
        }
      } else {
        alert('Failed to get AI suggestions. Please try again.');
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      alert('Error getting AI suggestions. Please check your connection.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAIGenerate = async () => {
    const text = prompt('Describe the class you want to create:');
    if (!text) return;
    
    try {
      setIsGenerating(true);
      
      const response = await fetch(`${SERVER_URL}/api/ai/from-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('AI Generated Class:', result);
        
        // Add generated class to diagram
        if (result.name && result.attributes) {
          const newClass = {
            id: `class-${Date.now()}`,
            name: result.name,
            attributes: result.attributes || [],
            methods: result.methods || [],
            position: { 
              x: Math.random() * 400 + 100, 
              y: Math.random() * 300 + 100 
            },
            width: 200,
            height: 100
          };
          
          addClass(newClass);
          alert(`Class "${result.name}" has been generated and added to the diagram!`);
        } else {
          alert('Failed to generate class. Please try a different description.');
        }
      } else {
        alert('Failed to generate class. Please try again.');
      }
    } catch (error) {
      console.error('Error generating from text:', error);
      alert('Error generating class. Please check your connection.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="sidebar" style={{
      width: '350px',
      height: '100vh',
      backgroundColor: '#f8f9fa',
      borderLeft: '1px solid #dee2e6',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #dee2e6',
        backgroundColor: '#fff'
      }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
          UML Editor
        </h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6c757d' }}>
          {diagram?.classes.length || 0} classes
        </p>
      </div>

      {/* Actions */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #dee2e6',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <button
          onClick={handleAddClass}
          style={{
            padding: '8px 12px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px'
          }}
        >
          <Plus size={16} />
          Agregar Clase
        </button>
        
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={handleExportUML}
            style={{
              flex: 1,
              padding: '6px 8px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              fontSize: '12px'
            }}
          >
            <Download size={14} />
            Exportar
          </button>
          
          <label style={{
            flex: 1,
            padding: '6px 8px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            fontSize: '12px'
          }}>
            <Upload size={14} />
            Importar
            <input
              type="file"
              accept=".json"
              onChange={handleImportUML}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        
        <button
          onClick={handleGenerateBackend}
          disabled={isGenerating || !diagram?.classes.length}
          style={{
            padding: '8px 12px',
            backgroundColor: isGenerating ? '#6c757d' : '#fd7e14',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px'
          }}
        >
          <Save size={16} />
          {isGenerating ? 'Generando...' : 'Generar Backend'}
        </button>

        <button
          onClick={handleResetDiagram}
          style={{
            padding: '8px 12px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            marginTop: '8px'
          }}
        >
          <RotateCcw size={16} />
          Reiniciar Diagrama
        </button>
        
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={handleAISuggest}
            disabled={isGenerating}
            style={{
              flex: 1,
              padding: '6px 8px',
              backgroundColor: isGenerating ? '#6c757d' : '#6f42c1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              fontSize: '12px'
            }}
          >
            <Sparkles size={14} />
            {isGenerating ? 'Cargando...' : 'IA Sugerir'}
          </button>
          
          <button
            onClick={handleAIGenerate}
            disabled={isGenerating}
            style={{
              flex: 1,
              padding: '6px 8px',
              backgroundColor: isGenerating ? '#6c757d' : '#e83e8c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              fontSize: '12px'
            }}
          >
            <Type size={14} />
            {isGenerating ? 'Cargando...' : 'IA Generar'}
          </button>
        </div>
      </div>

      {/* Class/Relation Editor */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {selectedClass ? (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
              Edit: {selectedClass.name}
            </h3>
            
            {/* Class Name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Nombre de Clase
              </label>
              <input
                type="text"
                value={selectedClass.name}
                onChange={(e) => handleClassUpdate({ name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Attributes */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500' }}>Atributos</label>
                <button
                  onClick={handleAddAttribute}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
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
                    onChange={(e) => handleUpdateAttribute(index, { name: e.target.value })}
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
                    onChange={(e) => handleUpdateAttribute(index, { type: e.target.value })}
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
                      onChange={(e) => handleUpdateAttribute(index, { isId: e.target.checked })}
                    />
                    ID
                  </label>
                  <button
                    onClick={() => handleDeleteAttribute(index)}
                    style={{
                      padding: '2px 4px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>

            {/* Methods */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500' }}>Métodos</label>
                <button
                  onClick={handleAddMethod}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
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
                    onChange={(e) => handleUpdateMethod(index, { name: e.target.value })}
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
                    onChange={(e) => handleUpdateMethod(index, { returnType: e.target.value })}
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
                    onClick={() => handleDeleteMethod(index)}
                    style={{
                      padding: '2px 4px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>

            {/* Delete Class */}
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #dee2e6' }}>
              <button
                onClick={() => {
                  if (selectedClassId) {
                    deleteClass(selectedClassId);
                  }
                }}
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
        ) : selectedRelation ? (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
              Edit Relation
            </h3>
            
            {/* Relation Type */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Tipo de Relación
              </label>
              <select
                value={selectedRelation.type}
                onChange={(e) => updateRelation(selectedRelation.id, { type: e.target.value as any })}
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

            {/* Source Cardinality */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Cardinalidad Origen
              </label>
              <input
                type="text"
                value={selectedRelation.sourceCardinality}
                onChange={(e) => updateRelation(selectedRelation.id, { sourceCardinality: e.target.value })}
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

            {/* Target Cardinality */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Cardinalidad Destino
              </label>
              <input
                type="text"
                value={selectedRelation.targetCardinality}
                onChange={(e) => updateRelation(selectedRelation.id, { targetCardinality: e.target.value })}
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

            {/* Label */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Etiqueta
              </label>
              <input
                type="text"
                value={selectedRelation.label || ''}
                onChange={(e) => updateRelation(selectedRelation.id, { label: e.target.value })}
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

            {/* Mapped By */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Mapeado Por
              </label>
              <input
                type="text"
                value={selectedRelation.mappedBy || ''}
                onChange={(e) => updateRelation(selectedRelation.id, { mappedBy: e.target.value })}
                placeholder="Nombre del campo"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Delete Relation */}
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #dee2e6' }}>
              <button
                onClick={() => {
                  if (selectedRelationId) {
                    deleteRelation(selectedRelationId);
                  }
                }}
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
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#6c757d',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
            <h3 style={{ margin: '0 0 8px 0' }}>Ningún Elemento Seleccionado</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>
              Haz clic en una clase o relación en el lienzo para editar sus propiedades
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

