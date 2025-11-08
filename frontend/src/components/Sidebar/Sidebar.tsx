import React, { useState } from 'react';
import { useDiagramStore } from '../../store/useDiagramStore';
import { useDiagramActions } from './hooks/useDiagramActions';
import { useClassEditor } from './hooks/useClassEditor';
import { useBackendGenerator } from './hooks/useBackendGenerator';
import { SidebarHeader } from './components/SidebarHeader';
import { ActionButtons } from './components/ActionButtons';
import { ClassEditor } from './components/ClassEditor';
import { RelationEditor } from './components/RelationEditor';
import { EmptyState } from './components/EmptyState';
import { uploadImageFile } from '../../services/aiImageService';

export const Sidebar: React.FC = () => {
  const {
    diagram,
    selectedRelationId,
    getRelationById,
    updateRelation,
    deleteRelation,
    generateDiagramFromAI,
    applyUMLActions
  } = useDiagramStore();

  const selectedRelation = selectedRelationId ? getRelationById(selectedRelationId) : null;

  // Custom hooks
  const {
    handleAddClass,
    handleResetDiagram,
    handleExportUML,
    handleImportUML,
    handleAIModify
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

  // Upload image state & handler
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadResult(null);

    try {
      const res = await uploadImageFile(file, (pct) => setUploadProgress(pct));
      setUploadResult(res);

      // Normalizar la posible estructura devuelta por el backend
      // Puede venir como: { diagram: { classes: [], relations: [] } }
      // o como: { classes: [], relations: [] } o directamente un array de clases.
      const payload = res?.diagram ?? res;
      let classesParam: any[] = [];
      let relationsParam: any[] = [];

      if (payload) {
        if (Array.isArray(payload.classes)) {
          classesParam = payload.classes;
        } else if (Array.isArray(payload)) {
          // backend devolvió directamente un array de clases
          classesParam = payload;
        }

        if (Array.isArray(payload.relations)) {
          relationsParam = payload.relations;
        }
      }

      if (classesParam.length || relationsParam.length) {
        // Llamada con la firma correcta: (classes, relations)
        generateDiagramFromAI(classesParam, relationsParam);
      } else {
        console.warn('No diagram found in AI response', payload);
      }
    } catch (err: any) {
      setUploadError(err?.message ?? JSON.stringify(err));
      console.error('upload image error', err);
    } finally {
      setIsUploading(false);
      // reset input value so same file can be selected again
      if (e.currentTarget) e.currentTarget.value = '';
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

      {/* Upload status box */}
      {(isUploading || uploadError || uploadResult) && (
        <div style={{ padding: 12, borderBottom: '1px solid #e9ecef', background: '#fff', fontSize: 13 }}>
          {isUploading && <div>Subiendo imagen... {uploadProgress}%</div>}
          {uploadError && <div style={{ color: 'crimson' }}>Error: {uploadError}</div>}
          {uploadResult && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Resultado:</div>
              <pre style={{ maxHeight: 160, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(uploadResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Editor Panel */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
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

