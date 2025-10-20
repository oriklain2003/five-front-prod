import React, { createContext, useContext, useRef, useState, useCallback, ReactNode } from 'react';
import * as maptilersdk from '@maptiler/sdk';

interface MapContextType {
  map: React.MutableRefObject<maptilersdk.Map | null>;
  radarsVisible: boolean;
  toggleRadars: () => void;
  triggerObjectClick: (objectId: string) => boolean;
  registerObjectClickTrigger: (trigger: (objectId: string) => boolean) => void;
  removeSpecialTrail: (objectId: string) => void;
  registerRemoveSpecialTrail: (remover: (objectId: string) => void) => void;
}

const MapContext = createContext<MapContextType | null>(null);

export const MapProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const map = useRef<maptilersdk.Map | null>(null);
  const [radarsVisible, setRadarsVisible] = useState(false);
  const objectClickTriggerRef = useRef<((objectId: string) => boolean) | null>(null);
  const removeSpecialTrailRef = useRef<((objectId: string) => void) | null>(null);

  const toggleRadars = useCallback(() => {
    setRadarsVisible(prev => !prev);
  }, []);

  const registerObjectClickTrigger = useCallback((trigger: (objectId: string) => boolean) => {
    objectClickTriggerRef.current = trigger;
  }, []);

  const triggerObjectClick = useCallback((objectId: string) => {
    if (objectClickTriggerRef.current) {
      return objectClickTriggerRef.current(objectId);
    }
    return false;
  }, []);

  const registerRemoveSpecialTrail = useCallback((remover: (objectId: string) => void) => {
    removeSpecialTrailRef.current = remover;
  }, []);

  const removeSpecialTrail = useCallback((objectId: string) => {
    if (removeSpecialTrailRef.current) {
      removeSpecialTrailRef.current(objectId);
    }
  }, []);

  return (
    <MapContext.Provider value={{ map, radarsVisible, toggleRadars, triggerObjectClick, registerObjectClickTrigger, removeSpecialTrail, registerRemoveSpecialTrail }}>
      {children}
    </MapContext.Provider>
  );
};

export const useMap = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMap must be used within MapProvider');
  }
  return context;
};

