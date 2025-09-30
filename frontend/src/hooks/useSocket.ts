import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDiagramStore } from '../store/useDiagramStore';
import { UMLDiagramJSON } from '../types/uml';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const useSocket = (diagramId?: string) => {
  const socketRef = useRef<Socket | null>(null);
  const {
    setConnectionStatus,
    setError,
    setUsers,
    addUser,
    removeUser,
    updateUserCursor,
    setLocks,
    addLock,
    removeLock,
    setCurrentUser
  } = useDiagramStore();

  useEffect(() => {
    if (!diagramId) return;

    // Initialize socket connection
    socketRef.current = io(SERVER_URL);

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to server');
      setConnectionStatus(true);
      setError(null);
      
      // Join the diagram room
      socket.emit('diagram:join', { diagramId });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnectionStatus(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setError('Failed to connect to server');
    });

    // Collaboration events
    socket.on('diagram:users', (users) => {
      setUsers(users);
    });

    socket.on('diagram:user-joined', (user) => {
      addUser(user);
    });

    socket.on('diagram:user-left', (userId) => {
      removeUser(userId);
    });

    socket.on('diagram:cursor-update', ({ userId, cursor }) => {
      updateUserCursor(userId, cursor);
    });

    socket.on('diagram:locks', (locks) => {
      setLocks(locks);
    });

    socket.on('diagram:lock', (lock) => {
      addLock(lock);
    });

    socket.on('diagram:unlock', (elementId) => {
      removeLock(elementId);
    });

    socket.on('diagram:update', (diagramData) => {
      // Handle diagram updates from other users
      console.log('Diagram updated by another user:', diagramData);
    });

    // Set current user
    const user = {
      id: socket.id || 'unknown',
      name: `User ${(socket.id || 'unknown').slice(0, 6)}`,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`
    };
    setCurrentUser(user);

    return () => {
      if (socket) {
        socket.emit('diagram:leave', { diagramId });
        socket.disconnect();
      }
    };
  }, [diagramId]);

  // Socket action functions
  const joinDiagram = (diagramId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('diagram:join', { diagramId });
    }
  };

  const leaveDiagram = (diagramId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('diagram:leave', { diagramId });
    }
  };

  const updateDiagram = (diagramData: UMLDiagramJSON) => {
    if (socketRef.current) {
      socketRef.current.emit('diagram:update', { diagramId, diagramData });
    }
  };

  const lockElement = (elementId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('diagram:lock', { diagramId, elementId });
    }
  };

  const unlockElement = (elementId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('diagram:unlock', { diagramId, elementId });
    }
  };

  const updateCursor = (cursor: { x: number; y: number }) => {
    if (socketRef.current) {
      socketRef.current.emit('diagram:cursor-update', { diagramId, cursor });
    }
  };

  return {
    socket: socketRef.current,
    joinDiagram,
    leaveDiagram,
    updateDiagram,
    lockElement,
    unlockElement,
    updateCursor,
    isConnected: useDiagramStore.getState().isConnected
  };
};

