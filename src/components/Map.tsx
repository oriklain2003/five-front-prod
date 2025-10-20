import React, { useEffect, useRef, useCallback } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { useMap } from '../contexts/MapContext';
import { useChat } from '../contexts/ChatContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { Star, Arrow, Jet, Plane, Drone, Bird, Missile, Drawable, Radar, RadarData } from './drawables';

const Map: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const { map, radarsVisible, registerObjectClickTrigger, registerRemoveSpecialTrail } = useMap();
  const { addObjectInfo, addMessage } = useChat();
  const objectsRef = useRef(new globalThis.Map<string, Drawable>());
  const radarsRef = useRef<Radar[]>([]);
  const specialTrailAppliedRef = useRef<Set<string>>(new Set());

  maptilersdk.config.apiKey = 'r7kaQpfNDVZdaVp23F1r';

  // Constants for special ב149 styling (accessible to all handlers)
  const SPECIAL_POINT_COLOR = '#7ec8ff'; // light blue for plots
  const SPECIAL_PATH_COLOR = '#bfe5ff';  // lighter blue for path

  // Manage a dedicated special trail line separate from object's default course line
  const upsertSpecialTrailLine = useCallback((objId: string, coords: [number, number][]) => {
    if (!map.current) return;
    const lineId = `special-trail-line-${objId}`;
    if (!map.current.getSource(lineId)) {
      map.current.addSource(lineId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coords,
          },
        },
      });
    } else {
      const src = map.current.getSource(lineId) as any;
      src.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: coords },
      });
    }

    if (!map.current.getLayer(lineId)) {
      map.current.addLayer({
        id: lineId,
        type: 'line',
        source: lineId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': SPECIAL_PATH_COLOR, 'line-width': 3, 'line-dasharray': [2, 2] },
      });
    }
  }, [map]);

  // Render special plot points as colored circles (do not use the object's real trail)
  const upsertSpecialPlotPoints = useCallback((objId: string, coords: [number, number][]) => {
    if (!map.current) return;
    const sourceId = `special-plot-points-${objId}`;
    const layerId = `special-plot-points-${objId}`;

    const featureCollection = {
      type: 'FeatureCollection',
      features: coords.map(c => ({
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: c }
      }))
    } as any;

    if (!map.current.getSource(sourceId)) {
      map.current.addSource(sourceId, {
        type: 'geojson',
        data: featureCollection,
      });
    } else {
      const src = map.current.getSource(sourceId) as any;
      src.setData(featureCollection);
    }

    if (!map.current.getLayer(layerId)) {
      map.current.addLayer({
        id: layerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-color': SPECIAL_POINT_COLOR,
          'circle-radius': 4,
          'circle-opacity': 0.9,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#2b6cb0'
        },
      });
    }
  }, [map]);

  // Build the 4 special plots (reversed order) for ב149 given alt/speed/rotation
  const buildSpecialB149Plots = useCallback((alt: number, spd: number, rot: number): any[] => {
    const now = Date.now();
    const base = [
      { lat: 33.236677, lng: 35.430565 },
      { lat: 33.244143, lng: 35.432281 },
      { lat: 33.252757, lng: 35.445328 },
      { lat: 33.260508, lng: 35.445671 },
    ];
    const reversed = [...base].reverse();
    const plots: any[] = [];
    // For each of the 4 points, add a nearby companion point and connect all in sequence
    reversed.forEach((p, i) => {
      const primary = {
        position: [p.lng, p.lat, alt] as [number, number, number],
        speed: spd,
        time: new Date(now - (8000 - (plots.length) * 500)).toISOString(),

        color: SPECIAL_POINT_COLOR,
        rotation: rot,
      };
      plots.push(primary);
      // companion offset (very close)
      const offsetLat = p.lat + 0.00045;
      const offsetLng = p.lng + 0.00045;
      const companion = {
        position: [offsetLng, offsetLat, alt] as [number, number, number],
        speed: spd,
        time: new Date(now - (8000 - (plots.length) * 500)).toISOString(),
        color: SPECIAL_POINT_COLOR,
        rotation: rot,
      };
      plots.push(companion);
    });
    return plots;
  }, []);

  const handleAutoDelete = useCallback((id?: string) => {
    if (id) {
      objectsRef.current.delete(id);
    }
  }, []);

  const handleObjectClick = useCallback((objectData: import('./drawables').ObjectInfo) => {
    addObjectInfo(objectData);
  }, [addObjectInfo]);

  const triggerObjectClickById = useCallback((objectId: string): boolean => {
    const object = objectsRef.current.get(objectId);
    if (object) {
      // Trigger the object click by calling handleObjectClick with object data
      const size: number = (object['options'].size ?? 30) * 0.2;
      const objectData: import('./drawables').ObjectInfo = {
        id: object.id,
        name: object.name,
        position: object['options'].position,
        speed: object.speed,
        size: size,
        rotation: object['options'].rotation,
        classification: object.classification,
        description: object.description,
        details: object.details,
        radar_detections: object.radar_detections,
        plots: object['plots'].map((p: any) => ({
          position: p.position,
          speed: p.speed,
          time: p.time,
          color: p.color,
          rotation: p.rotation,
        })),
        togglePlots: () => object.togglePlots(),
        plotsVisible: object['plotsVisible'],
      };
      handleObjectClick(objectData);
      return true;
    }
    return false;
  }, [handleObjectClick]);

  // Function to remove special trail for a given object ID
  const removeSpecialTrailById = useCallback((objectId: string) => {
    if (!map.current) return;
    
    const lineId = `special-trail-line-${objectId}`;
    const plotPointsId = `special-plot-points-${objectId}`;
    
    // Remove the special trail line layer and source
    if (map.current.getLayer(lineId)) {
      map.current.removeLayer(lineId);
    }
    if (map.current.getSource(lineId)) {
      map.current.removeSource(lineId);
    }
    
    // Remove the special plot points layer and source
    if (map.current.getLayer(plotPointsId)) {
      map.current.removeLayer(plotPointsId);
    }
    if (map.current.getSource(plotPointsId)) {
      map.current.removeSource(plotPointsId);
    }
    
    // Remove from the tracking set
    specialTrailAppliedRef.current.delete(objectId);
    
    console.log(`Removed special trail for object ${objectId}`);
  }, [map]);

  // Register the trigger function with MapContext
  useEffect(() => {
    registerObjectClickTrigger(triggerObjectClickById);
  }, [registerObjectClickTrigger, triggerObjectClickById]);

  // Register the removeSpecialTrail function with MapContext
  useEffect(() => {
    registerRemoveSpecialTrail(removeSpecialTrailById);
  }, [registerRemoveSpecialTrail, removeSpecialTrailById]);

  const handleObjectChange = useCallback((object: any) => {
    if (!map.current) return;
    let { type, position, size, speed, rotation, id, name, plots, classification, description, details, radar_detections, qna, steps } = object;
    
    // Check if this is a downed target (טיל שיוט that was intercepted)
    const downTargets = JSON.parse(localStorage.getItem('downTargets') || '[]');
    if (name === 'טיל שיוט' && downTargets.includes(id)) {
      // Ignore updates for downed cruise missiles
      return;
    }
    
    // Also check if this is a radar detection point for a downed cruise missile
    if (details?.parent_object && downTargets.includes(details.parent_object)) {
      // Ignore radar detection points for downed targets
      return;
    }
    
    speed = Math.round(speed);
    if (position) {
      if (position[2]) {
        position[2] = Math.round(position[2]);
      }
    }

    // For target ב149, only use the 4 predefined points (reversed order) as plots
    const buildInitialSpecialB149Plots = (): any[] => {
      if (name !== 'ב149') return plots || [];
      const alt = position && position.length >= 3 ? position[2] : 0;
      const rot = rotation || 0;
      return buildSpecialB149Plots(alt, speed, rot);
    };
    // If object has an ID, check if it already exists
    if (id) {
      const existingObject = objectsRef.current.get(id);
      
      if (existingObject) {
        // Check if type has changed
        const existingType = existingObject.constructor.name.toLowerCase();
        
        // DON'T let arrow type override other types
        if (type === 'arrow' && existingType !== 'arrow') {
          // Incoming is arrow, but we have a classified type (drone, jet, etc.)
          // Keep the existing type and just update properties
          console.log(`Preserving ${existingType} type, ignoring arrow update for ${id}`);
          existingObject.update({ position, size, speed, rotation, name, plots, description, details, radar_detections, qna, steps });
          return;
        }
        
        if (type !== existingType) {
          // Type changed legitimately - remove old object and create new one
          existingObject.remove();
          objectsRef.current.delete(id);
          // Continue to create new object below
        } else {
          // Same type - just update properties
          const altForSpecial = position && position.length >= 3 ? position[2] : 0;
          const rotForSpecial = rotation || 0;
          const specialPlots = name === 'ב149' ? buildSpecialB149Plots(altForSpecial, speed, rotForSpecial) : [];
          const nextPlots = name === 'ב149' ? specialPlots : (plots || []);
          existingObject.update({ position, size, speed, rotation, name, plots: nextPlots, classification, description, details, radar_detections, qna, steps });

          if (name === 'ב149') {
            // Render special points and a dedicated light-blue path; do NOT open the object's real trail
            const coords: [number, number][] = specialPlots.map(p => [p.position[0], p.position[1]]);
            upsertSpecialPlotPoints(id, coords);
            upsertSpecialTrailLine(id, coords);
          }
          return;
        }
      }
    }

    // Create new object
    let newObject: Drawable;
    const initialPlots = name === 'ב149' ? buildInitialSpecialB149Plots() : (plots || []);
    if (type === 'star') {
      newObject = new Star({ position, size, speed, id, name, plots: initialPlots, classification, description, details, radar_detections, qna, steps, onAutoDelete: handleAutoDelete, onObjectClick: handleObjectClick });
    } else if (type === 'arrow') {
      newObject = new Arrow({ position, size, speed, rotation, id, name, plots: initialPlots, classification, description, details, radar_detections, qna, steps, onAutoDelete: handleAutoDelete, onObjectClick: handleObjectClick });
    } else if (type === 'jet') {
      newObject = new Jet({ position, size, speed, rotation, id, name, plots: initialPlots, classification, description, details, radar_detections, qna, steps, onAutoDelete: handleAutoDelete, onObjectClick: handleObjectClick });
    } else if (type === 'plane') {
      newObject = new Plane({ position, size, speed, rotation, id, name, plots: initialPlots, classification, description, details, radar_detections, qna, steps, onAutoDelete: handleAutoDelete, onObjectClick: handleObjectClick });
    } else if (type === 'drone') {
      newObject = new Drone({ position, size, speed, rotation, id, name, plots: initialPlots, classification, description, details, radar_detections, qna, steps, onAutoDelete: handleAutoDelete, onObjectClick: handleObjectClick });
    } else if (type === 'bird') {
      newObject = new Bird({ position, size, speed, rotation, id, name, plots: initialPlots, classification, description, details, radar_detections, qna, steps, onAutoDelete: handleAutoDelete, onObjectClick: handleObjectClick });
    } else if (type === 'missile') {
      newObject = new Missile({ position, size, speed, rotation, id, name, plots: initialPlots, classification, description, details, radar_detections, qna, steps, onAutoDelete: handleAutoDelete, onObjectClick: handleObjectClick });
    } else {
      return;
    }

    newObject.addTo(map.current);

    // Track object by ID if it has one
    if (id) {
      objectsRef.current.set(id, newObject);
    }
  }, [map, handleAutoDelete, handleObjectClick]);

  const socket = useWebSocket('http://localhost:3001', {
    onObjectChange: handleObjectChange,
    onChatMessage: (message, sender, timestamp, buttons, objectData) => {
      // Don't prepend sender for Classification System messages
      const displayMessage = sender === 'Classification System' ? message : `[${sender}] ${message}`;
       
      // For טיל שיוט (cruise missile) flow - ask if user wants to open in separate window
      if (sender === 'Classification System' && objectData && objectData.autoOpenPopup) {
        // Play alert sound
        const audio = new Audio('/alert.mp3');
        audio.play().catch(err => console.error('Failed to play alert sound:', err));
        
        // Store the original message and buttons for when popup opens
        const cruiseMissileData = {
          originalMessage: displayMessage,
          originalButtons: buttons,
          objectData: objectData,
        };
        localStorage.setItem('cruiseMissileFlowData', JSON.stringify(cruiseMissileData));
        
        // Add prompt message asking if user wants to open in separate window
        addMessage('נראה שיש אירוע שמתפתח במקביל האם תרצה לפעול עליו בחלון נפרד?', false, [
          {
            label: 'כן',
            action: 'open_cruise_missile_popup',
            data: {}
          }
        ], objectData);
        return;
      }

      addMessage(displayMessage, false, buttons, objectData);

      // If special ב149 classify message arrives, show only the 4 light-blue plots and a lighter-blue path between them
      if (sender === 'Classification System' && objectData && objectData.name === 'ב149') {
        const tryApply = (attempts: number) => {
          const objId = objectData.id as string;
          const obj = objectsRef.current.get(objId);
          if (obj) {
            const alt = (objectData.position && objectData.position.length >= 3) ? objectData.position[2] : 0;
            const rot = (objectData.rotation || 0) as number;
            const now = Date.now();

            const base = [
              { lat: 33.236677, lng: 35.430565 },
              { lat: 33.244143, lng: 35.432281 },
              { lat: 33.252757, lng: 35.445328 },
              { lat: 33.260508, lng: 35.445671 },
            ];
            const reversed = [...base].reverse();
            const specialPlotData = reversed.map((p, idx) => ({
              position: [p.lng, p.lat, alt] as [number, number, number],
              speed: Math.round(objectData.speed || 0),
              time: new Date(now - (8000 - idx * 1000)).toISOString(),
              color: SPECIAL_POINT_COLOR,
              rotation: rot,
            }));

            (obj as any).update({ plots: specialPlotData });

            const coords: [number, number][] = specialPlotData.map(p => [p.position[0], p.position[1]]);
            // Render special points and a dedicated light-blue path; do NOT open the object's real trail
            upsertSpecialPlotPoints(objId, coords);
            upsertSpecialTrailLine(objId, coords);
            specialTrailAppliedRef.current.add(objId);
          } else if (attempts > 0) {
            setTimeout(() => tryApply(attempts - 1), 150);
          }
        };
        tryApply(12);
      }
    },
  });

  // Listen for removeSpecialTrail event from socket
  useEffect(() => {
    if (socket) {
      socket.on('removeSpecialTrail', (data: { objectId: string }) => {
        removeSpecialTrailById(data.objectId);
      });

      return () => {
        socket.off('removeSpecialTrail');
      };
    }
  }, [socket, removeSpecialTrailById]);

  // Load radars from backend
  useEffect(() => {
    const loadRadars = async () => {
      try {
        const response = await fetch('http://localhost:3001/objects/radars');
        const radars: RadarData[] = await response.json();
        radarsRef.current = radars.map(radarData => new Radar(radarData));
      } catch (error) {
        console.error('Error loading radars:', error);
      }
    };
    loadRadars();
  }, []);

  // Toggle radar visibility
  useEffect(() => {
    if (!map.current) return;

    if (radarsVisible) {
      radarsRef.current.forEach(radar => radar.addTo(map.current!));
    } else {
      radarsRef.current.forEach(radar => radar.remove(map.current!));
    }
  }, [radarsVisible, map]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maptilersdk.Map({
      container: mapContainer.current,
      style: 'https://api.maptiler.com/maps/0199b923-1ccc-713b-9138-c9f45e976a77/style.json',
      center: [35.8, 33.5],
      zoom: 8
    });

    // Cleanup on unmount
    return () => {
      objectsRef.current.forEach(obj => obj.remove());
      objectsRef.current.clear();
      
      if (map.current) {
        radarsRef.current.forEach(radar => radar.remove(map.current!));
      }
    };
  }, [map]);

  return (
    <div 
      ref={mapContainer} 
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%' 
      }} 
    />
  );
};

export default Map;

