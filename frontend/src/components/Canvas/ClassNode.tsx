import React from 'react';
import { Group, Rect, Text, Line, Circle } from 'react-konva';
import Konva from 'konva';
import { UMLClass } from '../../types/uml';

interface ClassNodeProps {
  umlClass: UMLClass;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<UMLClass>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onConnectionStart?: (classId: string, x: number, y: number) => void;
}

export const ClassNode: React.FC<ClassNodeProps> = ({
  umlClass,
  isSelected,
  onSelect,
  onDragEnd,
  onConnectionStart
}) => {
  const { position, width, height, name, attributes, methods } = umlClass;

  // Don't render if dimensions are invalid
  if (!width || !height || width <= 0 || height <= 0) {
    return null;
  }

  // State for drag detection
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStartTime, setDragStartTime] = React.useState<number | null>(null);
  const [dragStartPos, setDragStartPos] = React.useState<{ x: number; y: number } | null>(null);

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Prevent right-click from interfering
    if (e.evt.button === 2) return;
    
    const pos = e.target.getStage()?.getPointerPosition();
    if (pos) {
      setDragStartTime(Date.now());
      setDragStartPos(pos);
      setIsDragging(false);
    }
  };

  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    // Only allow drag if we've held the mouse down for at least 200ms
    // or if we've moved more than 15 pixels
    if (dragStartTime && dragStartPos) {
      const timeDiff = Date.now() - dragStartTime;
      const currentPos = e.target.getStage()?.getPointerPosition();
      
      if (currentPos) {
        const distance = Math.sqrt(
          Math.pow(currentPos.x - dragStartPos.x, 2) + 
          Math.pow(currentPos.y - dragStartPos.y, 2)
        );
        
        if (timeDiff > 200 || distance > 15) {
          setIsDragging(true);
        } else {
          // Cancel the drag
          e.target.stopDrag();
          return;
        }
      }
    }
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (isDragging) {
      onDragEnd(e);
    }
    setIsDragging(false);
    setDragStartTime(null);
    setDragStartPos(null);
  };

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Only handle click if we're not dragging
    if (!isDragging) {
      e.cancelBubble = true;
      e.evt.stopPropagation();
      onSelect(umlClass.id);
    }
  };

  const handleContextMenu = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Prevent right-click context menu from interfering
    e.evt.preventDefault();
    e.cancelBubble = true;
  };

  const handleConnectionPointClick = (e: Konva.KonvaEventObject<MouseEvent>, x: number, y: number) => {
    e.cancelBubble = true;
    if (onConnectionStart) {
      onConnectionStart(umlClass.id, position.x + x, position.y + y);
    }
  };

  const headerHeight = 30;
  const attributeHeight = 20;
  const methodHeight = 20;
  const padding = 10;
  
  const totalHeight = headerHeight + 
    (attributes.length * attributeHeight) + 
    (methods.length * methodHeight) + 
    (attributes.length > 0 && methods.length > 0 ? 1 : 0); // separator line

  return (
    <Group
      id={umlClass.id}
      x={position.x}
      y={position.y}
      draggable={true}
      onMouseDown={handleMouseDown}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Invisible click area for better detection */}
      <Rect
        x={-5}
        y={-5}
        width={width + 10}
        height={totalHeight + 10}
        fill="transparent"
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onTap={handleClick}
      />
      {/* Main rectangle */}
      <Rect
        width={width}
        height={totalHeight}
        fill={isSelected ? '#e3f2fd' : '#ffffff'}
        stroke={isSelected ? '#2196f3' : '#333333'}
        strokeWidth={isSelected ? 3 : 1}
        shadowColor="black"
        shadowBlur={isSelected ? 8 : 4}
        shadowOffset={{ x: 2, y: 2 }}
        shadowOpacity={isSelected ? 0.3 : 0.2}
        cornerRadius={4}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onTap={handleClick}
      />

      {/* Header section */}
      <Rect
        width={width}
        height={headerHeight}
        fill={isSelected ? '#bbdefb' : '#f5f5f5'}
        stroke="#333333"
        strokeWidth={1}
        cornerRadius={[4, 4, 0, 0]}
      />
      
      <Text
        text={name}
        x={padding}
        y={headerHeight / 2 - 8}
        fontSize={14}
        fontStyle="bold"
        fill="#333333"
        width={width - padding * 2}
        align="center"
      />

      {/* Separator line between header and content */}
      <Line
        points={[0, headerHeight, width, headerHeight]}
        stroke="#333333"
        strokeWidth={1}
      />

      {/* Attributes section */}
      {(attributes ?? []).map((attr, index) => {
        const y = headerHeight + (index * attributeHeight);
        const visibility = attr.isId ? '+' : (attr.nullable ? '?' : '+');
        const text = `${visibility} ${attr.name}: ${attr.type}`;
        
        return (
          <Text
            key={`attr-${index}`}
            text={text}
            x={padding}
            y={y + 2}
            fontSize={12}
            fill="#333333"
            width={width - padding * 2}
          />
        );
      })}

      {/* Separator line between attributes and methods */}
      {(attributes?.length ?? 0) > 0 && (methods?.length ?? 0) > 0 && (
        <Line
          points={[0, headerHeight + (attributes?.length ?? 0) * attributeHeight, width, headerHeight + (attributes?.length ?? 0) * attributeHeight]}
          stroke="#333333"
          strokeWidth={1}
        />
      )}

      {/* Methods section */}
      {(methods ?? []).map((method, index) => {
        const y = headerHeight + (attributes?.length ?? 0) * attributeHeight + 
          ((attributes?.length ?? 0) > 0 && (methods?.length ?? 0) > 0 ? 1 : 0) + (index * methodHeight);
        const params = (method.parameters ?? []).map(p => `${p.name}: ${p.type}`).join(', ');
        const text = `+ ${method.name}(${params}): ${method.returnType}`;
        
        return (
          <Text
            key={`method-${index}`}
            text={text}
            x={padding}
            y={y + 2}
            fontSize={12}
            fill="#333333"
            width={width - padding * 2}
          />
        );
      })}

       {/* Connection points - only show when selected */}
       {isSelected && onConnectionStart && (
         <Group>
           {/* Top connection point */}
           <Circle
             x={width / 2}
             y={0}
             radius={8}
             fill="#007bff"
             stroke="white"
             strokeWidth={3}
             onClick={(e) => handleConnectionPointClick(e, width / 2, 0)}
             shadowColor="black"
             shadowBlur={4}
             shadowOffset={{ x: 1, y: 1 }}
             shadowOpacity={0.3}
           />
           
           {/* Right connection point */}
           <Circle
             x={width}
             y={height / 2}
             radius={8}
             fill="#007bff"
             stroke="white"
             strokeWidth={3}
             onClick={(e) => handleConnectionPointClick(e, width, height / 2)}
             shadowColor="black"
             shadowBlur={4}
             shadowOffset={{ x: 1, y: 1 }}
             shadowOpacity={0.3}
           />
           
           {/* Bottom connection point */}
           <Circle
             x={width / 2}
             y={height}
             radius={8}
             fill="#007bff"
             stroke="white"
             strokeWidth={3}
             onClick={(e) => handleConnectionPointClick(e, width / 2, height)}
             shadowColor="black"
             shadowBlur={4}
             shadowOffset={{ x: 1, y: 1 }}
             shadowOpacity={0.3}
           />
           
           {/* Left connection point */}
           <Circle
             x={0}
             y={height / 2}
             radius={8}
             fill="#007bff"
             stroke="white"
             strokeWidth={3}
             onClick={(e) => handleConnectionPointClick(e, 0, height / 2)}
             shadowColor="black"
             shadowBlur={4}
             shadowOffset={{ x: 1, y: 1 }}
             shadowOpacity={0.3}
           />
         </Group>
       )}
    </Group>
  );
};

