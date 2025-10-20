import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Classification, ObjectDescription } from '../components/drawables';
import { buildApiUrl } from '../config';

export interface ChatMessage {
  message: string;
  isUser: boolean;
  timestamp: Date;
  objectInfo?: ObjectInfo;
  buttons?: Array<{
    label: string;
    action: string;
    data?: any;
  }>;
}

export interface ObjectInfo {
  id?: string;
  name?: string | null;
  position: [number, number, number];
  speed: number;
  size: number;
  rotation?: number;
  classification: Classification | null;
  description: ObjectDescription | null;
  details: Record<string, any> | null;
  radar_detections: string[];
  qna?: Array<{ question: string; answers: string[] }>| null;
  plots: Array<{
    position: [number, number, number];
    speed: number;
    time: string;
    color: string;
    rotation: number;
  }>;
  togglePlots?: () => void;
  plotsVisible?: boolean;
}

interface ChatContextType {
  messages: ChatMessage[];
  addMessage: (message: string, isUser: boolean, buttons?: Array<{label: string; action: string; data?: any}>, objectInfo?: ObjectInfo) => void;
  addObjectInfo: (objectData: ObjectInfo) => void;
  currentObject: ObjectInfo | null;
  objectChats: ObjectInfo[];
  openObjectChat: (objectData: ObjectInfo) => void;
  closeObjectChat: (objectId: string) => void;
  clearChat: () => Promise<void>;
  getClientSummary: () => Promise<string>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentObject, setCurrentObject] = useState<ObjectInfo | null>(null);
  const [objectChats, setObjectChats] = useState<ObjectInfo[]>([]);
  const [cachedSummary, setCachedSummary] = useState<string>('');

  const addMessage = useCallback((message: string, isUser: boolean, buttons?: Array<{label: string; action: string; data?: any}>, objectInfo?: ObjectInfo) => {
    setMessages(prev => [...prev, { message, isUser, timestamp: new Date(), buttons, objectInfo }]);
    
    // If this message has buttons (classify message) and objectInfo, set it as current object
    if (buttons && buttons.length > 0 && objectInfo) {

      setCurrentObject(objectInfo);
    }
  }, []);

  const getClientSummary = useCallback(async (): Promise<string> => {
    try {
      const recent = messages.slice(-24); // more generous window on UI
      const formatted = recent.map(m => ({ role: m.isUser ? 'user' : 'assistant', content: m.message }));
      const resp = await fetch(buildApiUrl('/chat/summarize'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: formatted })
      });
      const data = await resp.json();
      const summary = (data && data.summary) ? String(data.summary) : '';
      setCachedSummary(summary);
      return summary;
    } catch (e) {
      console.error('Failed to summarize client messages:', e);
      return cachedSummary || '';
    }
  }, [messages, cachedSummary]);

  const addObjectInfo = useCallback((objectData: ObjectInfo) => {
    // Update current object
    setCurrentObject(objectData);
    const formatPosition = (pos: [number, number, number]) =>
      `[${pos[0].toFixed(4)}, ${pos[1].toFixed(4)}, ${pos[2].toFixed(0)}ft]`;

    const formatDate = (dateStr: string) => {
      try {
        return new Date(dateStr).toLocaleString();
      } catch {
        return dateStr;
      }
    };

    // Build message with HTML styling for better organization
    let message = `<div style="width: 100%; padding: 4px 0;">`;
    
    // Target name/ID as header
    message += `<div style="margin-bottom: 12px;"><span style="color: #888; font-size: 12px;">מטרה:</span> <span style="font-weight: bold; color: #e0e0e0; font-size: 15px;">${objectData.name || objectData.id || 'לא ידוע'}</span></div>`;
    
    // Speed
    message += `<div style="margin-bottom: 8px;"><span style="color: #888;">מהירות:</span> <span style="font-weight: 600; color: #e0e0e0;">${objectData.speed}</span> <span style="color: #aaa;">קשר</span></div>`;
    
    // Altitude if available
    if (objectData.position && objectData.position[2]) {
      message += `<div style="margin-bottom: 8px;"><span style="color: #888;">גובה:</span> <span style="font-weight: 600; color: #e0e0e0;">${objectData.position[2]}</span> <span style="color: #aaa;">רגל</span></div>`;
    }

    // Classification section
    if (objectData.classification && (objectData.classification.current_identification || objectData.classification.suggested_identification)) {
      if (objectData.classification.current_identification) {
        message += `<div style="margin-bottom: 8px;"><span style="color: #888;">זיהוי נוכחי:</span> <span style="font-weight: 600; color: #4ade80; text-transform: capitalize;">${objectData.classification.current_identification}</span></div>`;
      }
      if (objectData.classification.suggested_identification) {
        message += `<div style="margin-bottom: 8px;"><span style="color: #888;">זיהוי מומלץ:</span> <span style="font-weight: 600; color: #fbbf24;">${objectData.classification.suggested_identification}</span></div>`;
      }
      if (objectData.classification.suggestion_reason) {
        message += `<div style="margin-bottom: 8px; padding-right: 8px; border-right: 2px solid #444;"><span style="color: #aaa; font-size: 13px;">${objectData.classification.suggestion_reason}</span></div>`;
      }
    }

    // Tracking Metrics (if available)
    if (objectData.description) {
      const desc = objectData.description;
      message += `<div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #333;">`;
      message += `<div style="color: #888; font-size: 12px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">נתוני מעקב</div>`;
      message += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px;">`;
      message += `<div><span style="color: #888;">נוצר:</span> <span style="color: #e0e0e0;">${formatDate(desc.created_at)}</span></div>`;
      message += `<div><span style="color: #888;">מרחק כולל:</span> <span style="color: #e0e0e0;">${desc.total_distance}ft</span></div>`;
      message += `<div><span style="color: #888;">ממוצע מהירות:</span> <span style="color: #e0e0e0;">${desc.avg_speed} קשר</span></div>`;
      message += `<div><span style="color: #888;">שינויי כיוון:</span> <span style="color: #e0e0e0;">${desc.total_direction_changes}</span></div>`;
      message += `<div><span style="color: #888;">שינויי מהירות:</span> <span style="color: #e0e0e0;">${desc.total_speed_changes}</span></div>`;
      message += `<div><span style="color: #888;">שינויי גובה:</span> <span style="color: #e0e0e0;">${desc.total_altitude_changes}</span></div>`;
      message += `</div>`;
      if (desc.coming_from || desc.moving_to) {
        message += `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #2a2a2a;">`;
        if (desc.coming_from) message += `<div style="margin-bottom: 4px;"><span style="color: #888;">מגיע מ:</span> <span style="color: #e0e0e0;">${desc.coming_from}</span></div>`;
        if (desc.moving_to) message += `<div><span style="color: #888;">נע לכיוון:</span> <span style="color: #e0e0e0;">${desc.moving_to}</span></div>`;
        message += `</div>`;
      }
      message += `</div>`;
    }

    // Radar Detections
    if (objectData.radar_detections && objectData.radar_detections.length > 0) {
      const radarNameMap: Record<string, string> = {
        'north': 'צפון',
        'south': 'דרום', 
        'center': 'מרכז'
      };
      const translatedRadars = objectData.radar_detections.map(radar => radarNameMap[radar] || radar);
      message += `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #333;">`;
      message += `<span style="color: #888;">גילוי ע"י המכמים:</span> <span style="font-weight: 600; color: #e0e0e0;">${translatedRadars.join(', ')}</span>`;
      message += `</div>`;
    }
    
    // Close main container
    message += `</div>`;

    // Send object data to backend to set as current context
    fetch(buildApiUrl('/chat/current-object'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(objectData),
    }).catch(error => {
      console.error('Error setting current object context:', error);
    });

    // Add message with objectInfo for toggle functionality
    setMessages(prev => [...prev, { 
      message, 
      isUser: false, 
      timestamp: new Date(),
      objectInfo: objectData 
    }]);
  }, []);

  const openObjectChat = useCallback((objectData: ObjectInfo) => {
    // Check if chat for this object is already open
    if (objectChats.some(obj => obj.id === objectData.id)) {
      return;
    }
    
    // Limit to 3 object chats
    setObjectChats(prev => {
      if (prev.length >= 3) {
        // Remove the oldest one
        return [...prev.slice(1), objectData];
      }
      return [...prev, objectData];
    });
  }, [objectChats]);

  const closeObjectChat = useCallback((objectId: string) => {
    setObjectChats(prev => prev.filter(obj => obj.id !== objectId));
  }, []);

  const clearChat = useCallback(async () => {
    try {
      // Clear backend conversation history
      await fetch(buildApiUrl('/chat/conversation'), {
        method: 'DELETE',
      });
      
      // Clear local messages
      setMessages([]);
    } catch (error) {
      console.error('Error clearing chat:', error);
    }
  }, []);

  return (
    <ChatContext.Provider value={{ messages, addMessage, addObjectInfo, currentObject, objectChats, openObjectChat, closeObjectChat, clearChat, getClientSummary }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

