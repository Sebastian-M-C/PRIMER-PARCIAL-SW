import { useDiagramStore } from '../../../store/useDiagramStore';
import { UMLAttribute, UMLMethod } from '../../../types/uml';

export function useClassEditor() {
  const {
    selectedClassId,
    getClassById,
    updateClass,
    deleteClass
  } = useDiagramStore();

  const selectedClass = selectedClassId ? getClassById(selectedClassId) : null;

  // ============ CLASE ============
  
  const handleClassUpdate = (updates: any) => {
    if (selectedClassId && updates) {
      updateClass(selectedClassId, updates);
    }
  };

  // ============ ATRIBUTOS ============
  
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
    updatedAttributes[index] = { 
      ...updatedAttributes[index], 
      ...updates 
    };

    handleClassUpdate({ attributes: updatedAttributes });
  };

  const handleDeleteAttribute = (index: number) => {
    if (!selectedClass) return;

    const updatedAttributes = selectedClass.attributes.filter((_: UMLAttribute, i: number) => i !== index);
    handleClassUpdate({ attributes: updatedAttributes });
  };

  // ============ MÉTODOS ============
  
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
    updatedMethods[index] = { 
      ...updatedMethods[index], 
      ...updates 
    };

    handleClassUpdate({ methods: updatedMethods });
  };

  const handleDeleteMethod = (index: number) => {
    if (!selectedClass) return;

    const updatedMethods = selectedClass.methods.filter((_: UMLMethod, i: number) => i !== index);
    handleClassUpdate({ methods: updatedMethods });
  };

  return {
    selectedClass,
    handleClassUpdate,
    handleAddAttribute,
    handleUpdateAttribute,
    handleDeleteAttribute,
    handleAddMethod,
    handleUpdateMethod,
    handleDeleteMethod,
    deleteClass
  };
}