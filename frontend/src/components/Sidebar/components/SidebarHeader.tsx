import React from 'react';

interface SidebarHeaderProps {
  classCount: number;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({ classCount }) => {
  return (
    <div style={{
      padding: '16px',
      borderBottom: '1px solid #dee2e6',
      backgroundColor: '#fff'
    }}>
      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
        UML Editor
      </h2>
      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6c757d' }}>
        {classCount} {classCount === 1 ? 'clase' : 'clases'}
      </p>
    </div>
  );
};