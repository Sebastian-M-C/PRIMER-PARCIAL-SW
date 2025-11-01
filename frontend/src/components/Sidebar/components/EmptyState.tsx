import React from 'react';

export const EmptyState: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: '#6c757d',
      textAlign: 'center',
      padding: '32px'
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
        Ningún Elemento Seleccionado
      </h3>
      <p style={{ margin: 0, fontSize: '14px' }}>
        Haz clic en una clase o relación en el lienzo para editar sus propiedades
      </p>
    </div>
  );
};