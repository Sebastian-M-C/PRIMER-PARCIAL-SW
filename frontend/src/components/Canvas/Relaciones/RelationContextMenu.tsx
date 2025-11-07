import React, { useEffect, useRef } from 'react';

interface RelationContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const RelationContextMenu: React.FC<RelationContextMenuProps> = ({
  x,
  y,
  isOpen,
  onClose,
  onEdit,
  onDelete
}) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutside = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: x,
    top: y,
    background: 'white',
    border: '1px solid rgba(0,0,0,0.12)',
    boxShadow: '0 6px 12px rgba(0,0,0,0.12)',
    zIndex: 9999,
    borderRadius: 4,
    padding: 6,
    minWidth: 140
  };

  const btnStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '8px 10px',
    background: 'transparent',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer'
  };

  return (
    <div ref={ref} style={style} role="menu" aria-hidden={!isOpen}>
      <button
        style={{ ...btnStyle, color: '#000' }}
        onClick={() => {
          onEdit();
          onClose();
        }}
      >
        Editar relación
      </button>
      <button
        style={{ ...btnStyle, color: '#c53030' }}
        onClick={() => {
          // eliminar sin confirmación adicional según tu requerimiento
          onDelete();
          onClose();
        }}
      >
        Eliminar relación
      </button>
    </div>
  );
};