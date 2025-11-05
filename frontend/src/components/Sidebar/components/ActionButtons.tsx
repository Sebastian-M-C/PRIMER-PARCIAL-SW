import React from 'react';
import { Plus, Download, Upload, Save, RotateCcw, Sparkles, Type, Smartphone } from 'lucide-react';

interface ActionButtonsProps {
  onAddClass: () => void;
  onExportUML: () => void;
  onImportUML: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onGenerateBackend: () => void;
  onGenerateFlutter: () => void; // ✅ NUEVO
  onResetDiagram: () => void;
  onAISuggest: () => void;
  onAIGenerate: () => void;
  isGenerating: boolean;
  hasClasses: boolean;
  // Nuevo: handler opcional para subir imagen (multipart). Recibe el change event del input file.
  onUploadImage?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onAddClass,
  onExportUML,
  onImportUML,
  onGenerateBackend,
  onGenerateFlutter, // ✅ NUEVO
  onResetDiagram,
  onAISuggest,
  onAIGenerate,
  isGenerating,
  hasClasses
  , onUploadImage
}) => {
  return (
    <div style={{
      padding: '16px',
      borderBottom: '1px solid #dee2e6',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      {/* Agregar Clase */}
      <button
        onClick={onAddClass}
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
        title="Agregar una nueva clase al diagrama"
      >
        <Plus size={16} />
        Agregar Clase
      </button>

      {/* Exportar/Importar */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={onExportUML}
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
          title="Exportar diagrama como JSON"
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
        }}
        title="Importar diagrama desde JSON"
        >
          <Upload size={14} />
          Importar
          <input
            type="file"
            accept=".json"
            onChange={onImportUML}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* Nuevo: Subir imagen para convertir a diagrama (IA) */}
      <label style={{
        marginTop: 8,
        padding: '8px 12px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: onUploadImage ? 'pointer' : 'not-allowed',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        justifyContent: 'center'
      }}
      title="Subir imagen para convertir a diagrama (IA)"
      >
        <Upload size={16} />
        Subir imagen
        <input
          type="file"
          accept="image/*"
          onChange={(e) => onUploadImage ? onUploadImage(e) : undefined}
          style={{ display: 'none' }}
        />
      </label>

      {/* ✅ NUEVO: Generar Backend y Frontend */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {/* Generar Backend (Spring Boot) */}
        <button
          onClick={onGenerateBackend}
          disabled={isGenerating || !hasClasses}
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: isGenerating || !hasClasses ? '#6c757d' : '#fd7e14',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isGenerating || !hasClasses ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '13px',
            opacity: isGenerating || !hasClasses ? 0.6 : 1,
            fontWeight: '500'
          }}
          title="Generar proyecto Spring Boot desde el diagrama"
        >
          <Save size={16} />
          Backend
        </button>

        {/* ✅ NUEVO: Generar Flutter */}
        <button
          onClick={onGenerateFlutter}
          disabled={isGenerating || !hasClasses}
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: isGenerating || !hasClasses ? '#6c757d' : '#02569B',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isGenerating || !hasClasses ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '13px',
            opacity: isGenerating || !hasClasses ? 0.6 : 1,
            fontWeight: '500'
          }}
          title="Generar aplicación Flutter desde el diagrama"
        >
          <Smartphone size={16} />
          Flutter
        </button>
      </div>

      {/* Texto de estado cuando está generando */}
      {isGenerating && (
        <div style={{
          padding: '8px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#856404',
          textAlign: 'center'
        }}>
          ⏳ Generando código...
        </div>
      )}

      {/* Reiniciar Diagrama */}
      <button
        onClick={onResetDiagram}
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
        title="Resetear diagrama a estado inicial (se perderán los cambios)"
      >
        <RotateCcw size={16} />
        Reiniciar Diagrama
      </button>

      {/* IA Buttons */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={onAISuggest}
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
            fontSize: '12px',
            opacity: isGenerating ? 0.6 : 1
          }}
          title="Obtener sugerencias de IA para mejorar el diagrama"
        >
          <Sparkles size={14} />
          {isGenerating ? 'Cargando...' : 'IA Sugerir'}
        </button>

        <button
          onClick={onAIGenerate}
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
            fontSize: '12px',
            opacity: isGenerating ? 0.6 : 1
          }}
          title="Generar clase desde descripción de texto usando IA"
        >
          <Type size={14} />
          {isGenerating ? 'Cargando...' : 'IA Generar'}
        </button>
      </div>
    </div>
  );
};