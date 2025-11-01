import { useDiagramStore } from '../../../store/useDiagramStore';
import { findFreePosition, generateUniqueClassName } from '../utils/positionFinder';

export function useDiagramActions() {
  const {
    diagram,
    addClass,
    setDiagram,
    selectClass,
    selectRelation
  } = useDiagramStore();

  /**
   * Agregar una nueva clase al diagrama
   */
  const handleAddClass = () => {
    if (!diagram) return;

    const freePosition = findFreePosition({ classes: diagram.classes });
    const existingNames = diagram.classes.map(c => c.name);
    const uniqueName = generateUniqueClassName(existingNames);

    const newClass = {
      id: `class-${Date.now()}`,
      name: uniqueName,
      attributes: [],
      methods: [],
      position: freePosition,
      width: 200,
      height: 100
    };

    addClass(newClass);
  };

  /**
   * Resetear el diagrama a un estado por defecto
   */
  const handleResetDiagram = () => {
    if (!confirm('¿Estás seguro de que quieres resetear el diagrama? Se perderán todos los cambios.')) {
      return;
    }

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
  };

  /**
   * Exportar diagrama como JSON
   */
  const handleExportUML = () => {
    if (!diagram) return;

    const umlJson = {
      package: diagram.package,
      classes: diagram.classes.map(cls => ({
        name: cls.name,
        attributes: cls.attributes,
        methods: cls.methods,
        position: cls.position, // ✅ Ahora incluye posición
        width: cls.width,
        height: cls.height
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

  /**
   * Importar diagrama desde JSON
   */
  const handleImportUML = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const umlJson = JSON.parse(e.target?.result as string);

        // Validar estructura básica
        if (!umlJson.classes || !Array.isArray(umlJson.classes)) {
          throw new Error('Formato de UML inválido: falta "classes"');
        }

        // Generar IDs si no existen y asegurar posiciones
        const importedDiagram = {
          id: diagram?.id || 'imported-diagram',
          name: umlJson.name || 'Diagrama Importado',
          package: umlJson.package || 'com.example',
          classes: umlJson.classes.map((cls: any, index: number) => ({
            ...cls,
            id: cls.id || `imported-class-${Date.now()}-${index}`,
            position: cls.position || { x: 100 + (index * 250), y: 100 },
            width: cls.width || 200,
            height: cls.height || 100,
            attributes: cls.attributes || [],
            methods: cls.methods || []
          })),
          relations: umlJson.relations || [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        setDiagram(importedDiagram);
        selectClass(null);
        selectRelation(null);

        alert('✅ Diagrama importado exitosamente');
      } catch (error) {
        console.error('Error importing UML:', error);
        alert('❌ Error al importar diagrama. Verifica el formato del archivo.');
      }
    };
    reader.readAsText(file);
  };

  return {
    handleAddClass,
    handleResetDiagram,
    handleExportUML,
    handleImportUML
  };
}