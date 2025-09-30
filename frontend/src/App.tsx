import { useEffect, useState } from 'react';
import { Canvas } from './components/Canvas/Canvas';
import { Sidebar } from './components/Sidebar/Sidebar';
import { useDiagramStore } from './store/useDiagramStore';
import { useSocket } from './hooks/useSocket';

function App() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { setDiagram } = useDiagramStore();
  
  // Initialize with a sample diagram
  useEffect(() => {
    const sampleDiagram = {
      id: 'sample-diagram',
      name: 'Sample UML Diagram',
      package: 'com.example',
      classes: [
        {
          id: 'user-class',
          name: 'User',
          attributes: [
            { name: 'id', type: 'Long', isId: true },
            { name: 'username', type: 'String', nullable: false },
            { name: 'email', type: 'String', unique: true }
          ],
          methods: [
            { name: 'save', returnType: 'void', parameters: [] },
            { name: 'findByEmail', returnType: 'User', parameters: [{ name: 'email', type: 'String' }] }
          ],
          position: { x: 100, y: 100 },
          width: 200,
          height: 120
        },
        {
          id: 'order-class',
          name: 'Order',
          attributes: [
            { name: 'id', type: 'Long', isId: true },
            { name: 'orderDate', type: 'LocalDateTime', nullable: false },
            { name: 'total', type: 'BigDecimal', nullable: false }
          ],
          methods: [
            { name: 'calculateTotal', returnType: 'BigDecimal', parameters: [] }
          ],
          position: { x: 400, y: 100 },
          width: 200,
          height: 100
        }
      ],
      relations: [
        {
          id: 'user-order-relation',
          type: 'ONE_TO_MANY' as const,
          source: 'user-class',
          target: 'order-class',
          sourceCardinality: '1',
          targetCardinality: '*',
          mappedBy: 'user',
          label: 'places'
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setDiagram(sampleDiagram);
  }, [setDiagram]);

  // Handle window resize
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth - 350, // Subtract sidebar width
        height: window.innerHeight
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Initialize socket connection
  useSocket('sample-diagram');

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Main Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Canvas width={dimensions.width} height={dimensions.height} />
      </div>
      
      {/* Sidebar */}
      <Sidebar />
    </div>
  );
}

export default App;

