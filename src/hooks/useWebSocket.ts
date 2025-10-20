import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

interface UseWebSocketOptions {
  onObjectChange: (object: any) => void;
  onChatMessage?: (message: string, sender: string, timestamp: Date, buttons?: Array<{label: string; action: string}>, objectData?: any) => void;
}

export const useWebSocket = (url: string, options: UseWebSocketOptions) => {
  useEffect(() => {
    if (!socket) {
      socket = io(url);
    }

    socket.on('objectChange', options.onObjectChange);

    if (options.onChatMessage) {
      socket.on('chatMessage', (data: { message: string; sender: string; timestamp: Date; buttons?: Array<{label: string; action: string}>; objectData?: any }) => {
        options.onChatMessage!(data.message, data.sender, data.timestamp, data.buttons, data.objectData);
      });
    }

    return () => {
      socket?.off('objectChange', options.onObjectChange);
      if (options.onChatMessage) {
        socket?.off('chatMessage');
      }
    };
  }, [url, options]);

  return socket;
};

export const approveClassification = (objectData: any) => {
  if (socket) {
    socket.emit('approveClassification', { objectData });
    console.log(`Sent classification approval request for object: ${objectData}`);
    
    // If this is ב149, also emit event to remove special trail
    if (objectData.name === 'ב149' && objectData.id) {
      socket.emit('removeSpecialTrail', { objectId: objectData.id });
    }
  } else {
    console.error('Socket not connected, cannot approve classification');
  }
};

