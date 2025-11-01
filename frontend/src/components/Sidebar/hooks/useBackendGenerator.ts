import { useState } from 'react';
import { useDiagramStore } from '../../../store/useDiagramStore';
import { findFreePosition } from '../utils/positionFinder';
import { downloadFlutterZip } from '../../../services/generatorService'; // ✅ NUEVO

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export function useBackendGenerator() {
  const { diagram, addClass } = useDiagramStore();
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
        classes: diagram.classes.map(cls => ({
          name: cls.name,
          attributes: cls.attributes.map(attr => ({
            name: attr.name,
            type: attr.type,
            nullable: attr.nullable ?? false,
            unique: attr.unique ?? false,
            isId: attr.isId ?? false
          })),
          methods: cls.methods || []
        })),
        relations: (diagram.relations || []).map(rel => ({
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

      console.log('📱 Generando app Flutter con:', umlJson);

      // Usar el servicio de generación
      await downloadFlutterZip(
        umlJson,
        `${diagram.name || 'flutter-app'}.zip`
      );

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
   * IA: Generar clase desde texto
   */
  const handleAIGenerate = async () => {
    const text = prompt('🤖 Describe la clase que quieres crear:');
    if (!text || text.trim().length < 10) {
      if (text !== null) {
        alert('⚠️ La descripción debe tener al menos 10 caracteres');
      }
      return;
    }

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

        if (result.name && result.attributes) {
          const newClass = {
            id: `class-${Date.now()}`,
            name: result.name,
            attributes: result.attributes || [],
            methods: result.methods || [],
            position: findFreePosition({ classes: diagram?.classes || [] }),
            width: 200,
            height: 100
          };

          addClass(newClass);
          alert(`✅ Clase "${result.name}" generada y agregada al diagrama`);
        } else {
          alert('❌ No se pudo generar la clase. Intenta con otra descripción.');
        }
      } else {
        alert('❌ Error al generar clase. Intenta nuevamente.');
      }
    } catch (error) {
      console.error('Error generating from text:', error);
      alert('❌ Error de conexión. Verifica que el servidor esté corriendo.');
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