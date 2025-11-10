import { useState } from 'react';
import { useDiagramStore } from '../../../store/useDiagramStore';
import { findFreePosition } from '../utils/positionFinder';
import { downloadFlutterZip } from '../../../services/generatorService'; // ✅ NUEVO

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export function useBackendGenerator() {
  // tipar lo mínimo para que TypeScript sepa qué propiedades vamos a usar
  const { diagram, setDiagram } = useDiagramStore() as {
    diagram: any;
    setDiagram: (d: any) => void;
  };
  const [isGenerating, setIsGenerating] = useState(false);

  /**
   * Generar backend Spring Boot
   */
  const handleGenerateBackend = async () => {
    if (!diagram) return;

    // Validaciones previas
    if (!diagram.classes.length) {
      alert('⚠️ El diagrama debe tener al menos una clase');
      return;
    }

    setIsGenerating(true);
    try {
      const umlJson = {
        package: diagram.package,
        classes: diagram.classes.map((cls: any) => ({
          name: cls.name,
          attributes: cls.attributes,
          methods: cls.methods
        })),
        relations: diagram.relations.map((rel: any) => ({
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

        alert('✅ Proyecto Spring Boot generado exitosamente');
      } else {
        const errorText = await response.text();
        console.error('Backend generation error:', errorText);
        alert(`❌ Error al generar backend: ${errorText}`);
      }
    } catch (error) {
      console.error('Error generating backend:', error);
      alert('❌ Error de conexión. Verifica que el servidor esté corriendo.');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * ✅ NUEVO: Generar aplicación Flutter
   */
  const handleGenerateFlutter = async () => {
    if (!diagram) return;

    // Validaciones previas
    if (!diagram.classes.length) {
      alert('⚠️ El diagrama debe tener al menos una clase');
      return;
    }

    setIsGenerating(true);
    try {
      // Preparar el diagrama en el formato esperado por el backend
      const umlJson = {
        package: diagram.package || 'com.example.app',
        name: diagram.name || 'Flutter App',
        classes: diagram.classes.map((cls: any) => ({
          name: cls.name,
          attributes: (cls.attributes || []).map((attr: any) => ({
            name: attr.name,
            type: attr.type,
            nullable: attr.nullable ?? false,
            unique: attr.unique ?? false,
            isId: attr.isId ?? false
          })),
          methods: cls.methods || []
        })),
        relations: (diagram.relations || []).map((rel: any) => ({
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

      console.log('📱 Generando app Flutter (zip: flutter-app.zip) con:', umlJson);

      // Usar el servicio de generación
      await downloadFlutterZip(umlJson, 'flutter-app.zip');
      
      alert('✅ Aplicación Flutter generada exitosamente');
    } catch (error) {
      console.error('Error generating Flutter app:', error);
      alert(`❌ Error al generar Flutter: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * IA: Sugerir mejoras al diagrama
   */
  const handleAISuggest = async () => {
    if (!diagram) return;

    try {
      setIsGenerating(true);

      const umlJson = {
        package: diagram.package,
        classes: diagram.classes.map((cls: any) => ({
          name: cls.name,
          attributes: cls.attributes,
          methods: cls.methods
        })),
        relations: diagram.relations.map((rel: any) => ({
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

        if (result.suggestions && result.suggestions.length > 0) {
          const suggestionText = result.suggestions
            .map((s: any, index: number) => `${index + 1}. ${s.title}: ${s.description}`)
            .join('\n\n');
          alert(`💡 AI Suggestions:\n\n${suggestionText}`);
        } else {
          alert('ℹ️ No hay sugerencias disponibles en este momento.');
        }
      } else {
        alert('❌ Error al obtener sugerencias. Intenta nuevamente.');
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      alert('❌ Error de conexión. Verifica que el servidor esté corriendo.');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * IA: Generar diagrama completo desde texto
   */
  const handleAIGenerate = async () => {
    const text = prompt('🤖 Describe el diagrama que quieres crear (ej: "Sistema de ventas con Usuario, Producto y Pedido"):');
    if (!text || text.trim().length < 10) {
      if (text !== null) {
        alert('⚠️ La descripción debe tener al menos 10 caracteres');
      }
      return;
    }

    try {
      setIsGenerating(true);

      const response = await fetch(`${SERVER_URL}/api/ai/generate-diagram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        alert(`❌ Error al generar diagrama: ${response.status} ${response.statusText}`);
        return;
      }

      const result = await response.json();
      console.log('AI Generated Diagram:', result);

      // Verificar que la respuesta tenga la estructura esperada
      if (!result.classes || !Array.isArray(result.classes) || result.classes.length === 0) {
        alert('❌ No se pudieron generar clases. Intenta con otra descripción.');
        return;
      }

      // Crear mapa de nombres de clases a IDs para las relaciones
      const nameToIdMap = new Map<string, string>();
      const existingClasses = diagram?.classes || [];
      const baseTime = Date.now();
      
      // Crear nuevas clases con posiciones calculadas
      const newClasses: any[] = [];
      result.classes.forEach((cls: any, index: number) => {
        const classId = `ai-class-${baseTime}-${index}`;
        nameToIdMap.set(cls.name, classId);
        
        // Calcular posición libre considerando clases existentes y nuevas ya creadas
        const allClassesSoFar = [...existingClasses, ...newClasses];
        const freePos = findFreePosition({ classes: allClassesSoFar });
        
        newClasses.push({
          id: classId,
          name: cls.name,
          attributes: cls.attributes || [],
          methods: [], // No incluir métodos/procedimientos
          position: {
            x: freePos.x + (index % 3) * 250,
            y: freePos.y + Math.floor(index / 3) * 200
          },
          width: 200,
          height: 100
        });
      });

      // Convertir relaciones del backend al formato del frontend
      const validRelationTypes = ['ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_ONE', 'MANY_TO_MANY', 'INHERITANCE', 'COMPOSITION', 'AGGREGATION'];
      const newRelations = (result.relations || []).map((rel: any, index: number) => {
        const sourceId = nameToIdMap.get(rel.source) || rel.source;
        const targetId = nameToIdMap.get(rel.target) || rel.target;
        
        // Normalizar tipo de relación
        let relationType = (rel.type || 'ONE_TO_MANY').toUpperCase();
        if (!validRelationTypes.includes(relationType)) {
          relationType = 'ONE_TO_MANY';
        }
        
        // Determinar cardinalidades por defecto si no se proporcionan
        let sourceCardinality = rel.sourceCardinality || '1';
        let targetCardinality = rel.targetCardinality || '*';
        
        if (!rel.sourceCardinality || !rel.targetCardinality) {
          switch (relationType) {
            case 'ONE_TO_ONE':
              sourceCardinality = '1';
              targetCardinality = '1';
              break;
            case 'ONE_TO_MANY':
              sourceCardinality = '1';
              targetCardinality = '*';
              break;
            case 'MANY_TO_ONE':
              sourceCardinality = '*';
              targetCardinality = '1';
              break;
            case 'MANY_TO_MANY':
              sourceCardinality = '*';
              targetCardinality = '*';
              break;
            case 'INHERITANCE':
            case 'COMPOSITION':
            case 'AGGREGATION':
              sourceCardinality = '1';
              targetCardinality = '*';
              break;
          }
        }
        
        return {
          id: rel.id || `ai-relation-${baseTime}-${index}`,
          type: relationType as any,
          source: sourceId,
          target: targetId,
          sourceCardinality,
          targetCardinality,
          mappedBy: rel.mappedBy || undefined,
          joinColumn: rel.joinColumn || undefined,
          label: rel.label || rel.sourceLabel || rel.targetLabel || undefined
        };
      });

      // Crear nuevo diagrama o actualizar el existente
      const newDiagram = {
        id: diagram?.id || `diagram-${Date.now()}`,
        name: diagram?.name || 'Diagrama Generado por IA',
        package: diagram?.package || 'com.example',
        classes: [...(diagram?.classes || []), ...newClasses],
        relations: [...(diagram?.relations || []), ...newRelations],
        createdAt: diagram?.createdAt || new Date(),
        updatedAt: new Date()
      };

      setDiagram(newDiagram);
      
      alert(`✅ Diagrama generado exitosamente!\n\nClases: ${newClasses.length}\nRelaciones: ${newRelations.length}`);
    } catch (error) {
      console.error('Error generating diagram from text:', error);
      alert(`❌ Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}\n\nVerifica que el servidor esté corriendo.`);
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    handleGenerateBackend,
    handleGenerateFlutter, // ✅ NUEVO
    handleAISuggest,
    handleAIGenerate
  };
}