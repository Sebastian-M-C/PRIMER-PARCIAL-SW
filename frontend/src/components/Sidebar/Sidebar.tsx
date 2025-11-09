import React from 'react';
import { useDiagramStore } from '../../store/useDiagramStore';
import { useDiagramActions } from './hooks/useDiagramActions';
import { useClassEditor } from './hooks/useClassEditor';
import { useBackendGenerator } from './hooks/useBackendGenerator';
import { SidebarHeader } from './components/SidebarHeader';
import { ActionButtons } from './components/ActionButtons';
import { ClassEditor } from './components/ClassEditor';
import { RelationEditor } from './components/RelationEditor';
import { EmptyState } from './components/EmptyState';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  const {
    diagram,
    selectedRelationId,
    getRelationById,
    updateRelation,
    deleteRelation
  } = useDiagramStore();

  const selectedRelation = selectedRelationId ? getRelationById(selectedRelationId) : null;

  // Custom hooks
  const {
    handleAddClass,
    handleResetDiagram,
    handleExportUML,
    handleImportUML,
    handleAIModify,
    handleUploadImage // <-- nuevo handler para subir imagen
  } = useDiagramActions();

  const {
    selectedClass,
    handleClassUpdate,
    handleAddAttribute,
    handleUpdateAttribute,
    handleDeleteAttribute,
    handleAddMethod,
    handleUpdateMethod,
    handleDeleteMethod,
    deleteClass
  } = useClassEditor();

  const {
    isGenerating,
    handleGenerateBackend,
    handleGenerateFlutter, // ✅ NUEVO
    handleAISuggest,
    handleAIGenerate
  } = useBackendGenerator();


  return (
    <div className="sidebar">
      {/* Títulos y labels se controlan desde CSS específico; quitar estilo inline para evitar herencias no deseadas */}
      {/* Header */}
      <SidebarHeader classCount={diagram?.classes.length || 0} />

      {/* Action Buttons */}
      <ActionButtons
        onAddClass={handleAddClass}
        onExportUML={handleExportUML}
        onImportUML={handleImportUML}
        onGenerateBackend={handleGenerateBackend}
        onGenerateFlutter={handleGenerateFlutter}
        onResetDiagram={handleResetDiagram}
        onAISuggest={handleAISuggest}
        onAIGenerate={handleAIGenerate}
        onAIModify={handleAIModify}
        isGenerating={isGenerating}
        hasClasses={!!diagram?.classes.length}
        onUploadImage={handleUploadImage}
      />

      {/* Editor Panel */}
      <div className="sidebar__content">
        {selectedClass ? (
          <ClassEditor
            selectedClass={selectedClass}
            onClassUpdate={handleClassUpdate}
            onAddAttribute={handleAddAttribute}
            onUpdateAttribute={handleUpdateAttribute}
            onDeleteAttribute={handleDeleteAttribute}
            onAddMethod={handleAddMethod}
            onUpdateMethod={handleUpdateMethod}
            onDeleteMethod={handleDeleteMethod}
            onDeleteClass={() => deleteClass(selectedClass.id)}
          />
        ) : selectedRelation ? (
          <RelationEditor
            selectedRelation={selectedRelation}
            onUpdateRelation={updateRelation}
            onDeleteRelation={deleteRelation}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
};

