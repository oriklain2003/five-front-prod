import * as maptilersdk from '@maptiler/sdk';
import { Plot, PlotData } from './Plot';

interface Point {
  lat: number;
  lng: number;
  timestamp: number;
}

function smoothPath(points: Point[], windowSize = 5): Point[] {
  if (points.length <= windowSize) return points;

  const smoothed: Point[] = [];

  for (let i = 0; i < points.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(points.length - 1, i + Math.floor(windowSize / 2));

    const slice = points.slice(start, end + 1);
    const avgLat = slice.reduce((sum, p) => sum + p.lat, 0) / slice.length;
    const avgLng = slice.reduce((sum, p) => sum + p.lng, 0) / slice.length;
    const avgTime =
      slice.reduce((sum, p) => sum + p.timestamp, 0) / slice.length;

    smoothed.push({ lat: avgLat, lng: avgLng, timestamp: avgTime });
  }

  return smoothed;
}

export type ClassificationOption = "drone" | "plane" | "bird" | "rocket" | "helicopter" | "jet" | "missile" | "unknownFast" | "radarPoint";

export interface Classification {
  current_identification: ClassificationOption | null;
  suggested_identification: ClassificationOption | null;
  suggestion_reason: string | null;
  certainty_percentage: number | null;
}

export interface ObjectDescription {
  created_at: string;
  avg_speed: number;
  altitude: number;
  starting_point: [number, number, number];
  ending_point: [number, number, number];
  total_distance: number;
  total_direction_changes: number;
  total_speed_changes: number;
  total_altitude_changes: number;
  current_speed: number;
  coming_from: string;
  moving_to: string;
  distance_from_origin: number;
  origin_country: string;
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
  steps?: Array<{ question: string; answers: string[] }>| null;
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

export interface DrawableOptions {
  id?: string;
  name?: string | null;
  position: [number, number, number];
  size?: number;
  speed?: number;
  plots?: PlotData[];
  rotation?: number;
  classification?: Classification | null;
  description?: ObjectDescription | null;
  details?: Record<string, any> | null;
  radar_detections?: string[];
  qna?: Array<{ question: string; answers: string[] }>| null;
  steps?: Array<{ question: string; answers: string[] }>| null;
  onAutoDelete?: (id?: string) => void;
  onObjectClick?: (objectData: ObjectInfo) => void;
}

export abstract class Drawable {
  public id?: string;
  public name?: string | null;
  public speed: number;
  public classification: Classification | null;
  public description: ObjectDescription | null;
  public details: Record<string, any> | null;
  public radar_detections: string[];
  public qna: Array<{ question: string; answers: string[] }>| null;
  public steps: Array<{ question: string; answers: string[] }>| null;
  protected marker: maptilersdk.Marker | null = null;
  protected labelMarker: maptilersdk.Marker | null = null;
  protected options: DrawableOptions;
  protected plots: Plot[] = [];
  protected plotsVisible: boolean = false;
  protected map: maptilersdk.Map | null = null;
  protected courseLineId: string;
  protected dashOffset: number = 0;
  private autoDeleteTimer: number | null = null;
  private static readonly AUTO_DELETE_TIMEOUT = 50000; // 50 seconds
  protected static readonly BADGE_SIZE = 16; // Badge width and height in pixels (for small viewBox)
  protected static readonly BADGE_FONT_SIZE = 12; // Font size for badge text (for small viewBox)
  protected static readonly BADGE_SIZE_LARGE = 60; // Badge size for large viewBox (1080x1080)
  protected static readonly BADGE_FONT_SIZE_LARGE = 42; // Font size for large viewBox
  private onAutoDeleteCallback?: (id?: string) => void;
  private onObjectClickCallback?: (objectData: ObjectInfo) => void;

  constructor(options: DrawableOptions) {
    this.id = options.id;
    this.name = options.name || null;
    this.speed = options.speed || 0;
    this.classification = options.classification || null;
    this.description = options.description || null;
    this.details = options.details || null;
    this.radar_detections = options.radar_detections || [];
    this.qna = options.qna ?? null;
    this.steps = options.steps ?? (options.qna ?? null);
    this.onAutoDeleteCallback = options.onAutoDelete;
    this.onObjectClickCallback = options.onObjectClick;
    this.courseLineId = `course-line-${this.id || Math.random()}`;
    this.options = {
      size: 10,
      speed: 0,
      ...options,
    };
    
    if (options.plots) {
      this.plots = options.plots.map(plotData => new Plot(plotData));
    }

    // Start auto-delete timer
    this.startAutoDeleteTimer();
  }

  private startAutoDeleteTimer(): void {
    // Clear existing timer if any
    this.clearAutoDeleteTimer();

    // Set new timer
    this.autoDeleteTimer = window.setTimeout(() => {
      this.autoDelete();
    }, Drawable.AUTO_DELETE_TIMEOUT);
  }

  private clearAutoDeleteTimer(): void {
    if (this.autoDeleteTimer !== null) {
      window.clearTimeout(this.autoDeleteTimer);
      this.autoDeleteTimer = null;
    }
  }

  private autoDelete(): void {
    
    // Call the callback before removing
    if (this.onAutoDeleteCallback) {
      this.onAutoDeleteCallback(this.id);
    }
    
    this.remove();
  }

  get color(): string {
    const identification = this.classification?.current_identification;
    
    switch (identification) {
      case 'bird':
        return '#FFA500'; // orange
      case 'helicopter':
        return '#0000FF'; // blue
      case 'plane':
        return '#FFC0CB'; // pink
      case 'jet':
        return '#FFFF00'; // yellow
      case 'drone':
        return '#FF0000'; // red
      case 'rocket':
        return '#800080'; // purple
      case 'missile':
        return '#ab21b5'; // purple/magenta
      case 'unknownFast':
        return '#d92727'; // dark red
      case 'radarPoint':
        return '#40E0D0'; // turquoise
      default:
        return '#d92727'; // dark red (null case)
    }
  }

  /**
   * Determine the color for the dashed course/history line.
   * Arrows should always use a light blue path regardless of classification.
   */
  protected getCourseLineColor(): string {
    const objectType = this.constructor.name.toLowerCase();
    if (objectType === 'arrow') {
      return '#7ec8ff';
    }
    return this.color;
  }

  abstract createSVG(): string;

  private createLabel(): HTMLDivElement {
    const el = document.createElement('div');
    el.style.cssText = `
      background: transparent;
      color: ${this.color};
      font-family: 'Courier New', monospace;
      font-size: 11px;
      font-weight: bold;
      white-space: nowrap;
      pointer-events: none;
      text-shadow: 
        -1px -1px 0 rgba(0,0,0,0.8),
        1px -1px 0 rgba(0,0,0,0.8),
        -1px 1px 0 rgba(0,0,0,0.8),
        1px 1px 0 rgba(0,0,0,0.8);
      line-height: 1.3;
    `;
    
    const lines: string[] = [];
    if (this.name) {
      lines.push(this.name);
    }
    const altitude = Math.round(this.options.position[2]  / 1000);
    
    let altitudeText: string = '';
    if (altitude < 10 ) {
      altitudeText = `00${altitude}ft`;
    } else if (altitude < 100) {
      altitudeText = `0${altitude}ft`;
    } else {
      altitudeText = `${altitude}ft`;
    }
    
    lines.push(altitudeText);
    lines.push(`${Math.round(this.speed)}kn`);
    
    el.innerHTML = lines.join('<br>');
    return el;
  }

  private updateLabel(): void {
    // Don't update labels for radar points or stars
    const isRadarPoint = this.classification?.current_identification === 'radarPoint';
    const objectType = this.constructor.name.toLowerCase();
    if (isRadarPoint || objectType === 'star') return;
    
    if (!this.labelMarker || !this.map) return;
    
    // Remove old label
    this.labelMarker.remove();
    
    // Create and add new label
    const labelEl = this.createLabel();
    const [lng, lat] = this.options.position;
    this.labelMarker = new maptilersdk.Marker({ 
      element: labelEl,
      anchor: 'left',
      offset: [15, -10]
    })
      .setLngLat([lng, lat])
      .addTo(this.map);
  }

  addTo(map: maptilersdk.Map): void {
    this.map = map;
    const el = document.createElement('div');
    el.innerHTML = this.createSVG();
    
    // Don't make radar points clickable
    const isRadarPoint = this.classification?.current_identification === 'radarPoint';
    if (!isRadarPoint) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', (e) => {
        console.log(e);
        // Check if Shift key is pressed to toggle plots, otherwise show info
        if (e.altKey) {
          this.togglePlots();
        } else {
          this.handleObjectClick();
        }
      });
    } else {
      el.style.cursor = 'default';
    }

    const [lng, lat] = this.options.position;
    this.marker = new maptilersdk.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(map);

    
    // Add label only for non-radar points and non-stars
    const objectType = this.constructor.name.toLowerCase();
    if (!isRadarPoint && objectType !== 'star') {
      const labelEl = this.createLabel();
      this.labelMarker = new maptilersdk.Marker({ 
        element: labelEl,
        anchor: 'left',
        offset: [15, -10]
      })
        .setLngLat([lng, lat])
        .addTo(map);
    }
  }

  private handleObjectClick(): void {
    if (this.onObjectClickCallback) {
      const size: number = (this.options.size ?? 30) * 0.2;
      const objectData: ObjectInfo = {
        id: this.id,
        name: this.name,
        position: this.options.position,
        speed: this.speed,
        size: size,
        rotation: this.options.rotation,
        classification: this.classification,
        description: this.description,
        details: this.details,
        radar_detections: this.radar_detections,
        qna: this.qna ?? null,
        steps: this.steps ?? (this.qna ?? null),
        plots: this.plots.map(p => ({
          position: p.position,
          speed: p.speed,
          time: p.time,
          color: p.color,
          rotation: p.rotation,
        })),
        togglePlots: () => this.togglePlots(),
        plotsVisible: this.plotsVisible,
      };
      this.onObjectClickCallback(objectData);
    }
  }

  remove(): void {
    this.clearAutoDeleteTimer();
    this.hidePlots();
    this.hideCourseLine();
    this.marker?.remove();
    this.marker = null;
    this.labelMarker?.remove();
    this.labelMarker = null;
    this.map = null;
  }

  setPosition(position: [number, number, number]): void {
    this.options.position = position;
    const [lng, lat] = position;
    this.marker?.setLngLat([lng, lat]);
    
    // Only update label for objects that have labels (not stars or radar points)
    const isRadarPoint = this.classification?.current_identification === 'radarPoint';
    const objectType = this.constructor.name.toLowerCase();
    if (!isRadarPoint && objectType !== 'star') {
      this.labelMarker?.setLngLat([lng, lat]);
      this.updateLabel();
    }
    
    // Update course line if visible to keep it connected to current position
    if (this.plotsVisible) {
      this.updateCourseLine();
    }
  }

  getAltitude(): number {
    return this.options.position[2];
  }

  update(options: Partial<DrawableOptions>, shouldUpdateClassification: boolean = true): void {
    // Reset the auto-delete timer on any update
    this.startAutoDeleteTimer();

    let needsLabelUpdate = false;

    // Update name
    if (options.name !== undefined) {
      this.name = options.name;
      this.options.name = options.name;
      needsLabelUpdate = true;
    }

    // Update position
    if (options.position) {
      this.setPosition(options.position);
      needsLabelUpdate = true;
      // Note: setPosition() already handles updating the course line if visible
    }

    // Update size
    if (options.size) {
      this.options.size = options.size;
      if (this.marker) {
        const el = this.marker.getElement();
        el.innerHTML = this.createSVG();
      }
    }

    // Update speed
    if (options.speed !== undefined) {
      this.speed = options.speed;
      this.options.speed = options.speed;
      needsLabelUpdate = true;
    }

    // Update classification
    if (shouldUpdateClassification && options.classification !== undefined) {
      this.classification = options.classification || null;
      this.options.classification = options.classification;
      
      // Redraw marker with new color
      if (this.marker) {
        const el = this.marker.getElement();
        el.innerHTML = this.createSVG();
      }
      
      // Update course line color if visible
      if (this.plotsVisible) {
        this.hideCourseLine();
        this.showCourseLine();
      }
      
      needsLabelUpdate = true;
    }
    

    // Update description
    if (options.description !== undefined) {
      this.description = options.description;
      this.options.description = options.description;
    }

    // Update details
    if (options.details !== undefined) {
      this.details = options.details;
      this.options.details = options.details;
    }

    // Update QnA
    if (options.qna !== undefined) {
      this.qna = options.qna ?? null;
      this.options.qna = options.qna ?? null;
    }

    // Update Steps (mirror to qna if steps provided or derive from qna)
    if (options.steps !== undefined) {
      this.steps = options.steps ?? null;
      this.options.steps = options.steps ?? null;
    } else if (options.qna !== undefined && this.steps == null) {
      this.steps = options.qna ?? null;
      this.options.steps = options.qna ?? null;
    }

    // Update radar detections
    if (options.radar_detections !== undefined) {
      this.radar_detections = options.radar_detections;
      this.options.radar_detections = options.radar_detections;
    }

    // Update plots
    if (options.plots) {
      const oldPlots = this.plots; // Save reference to old plots before replacing
      this.plots = options.plots.map(plotData => new Plot(plotData));
      
      // If plots are currently visible, refresh them
      if (this.plotsVisible) {
        // Remove OLD plots that are on the map, then force re-show for NEW plots
        oldPlots.forEach(plot => plot.remove());
        this.hideCourseLine();
        // Temporarily mark as hidden so showPlots will actually add the new markers
        this.plotsVisible = false;
        this.showPlots();
        this.showCourseLine();
      }
    }

    // Update label if needed
    if (needsLabelUpdate) {
      this.updateLabel();
    }
  }

  togglePlots(): void {
    if (this.plotsVisible) {
      this.hidePlots();
      this.hideCourseLine();
    } else {
      this.showPlots();
      this.showCourseLine();
    }
  }

  showPlots(): void {
    if (!this.map || this.plotsVisible) return;
    
    // Don't show individual plot markers anymore - only the smooth path line
    // Just mark as visible so the path line will be shown
    this.plotsVisible = true;
  }

  hidePlots(): void {
    if (!this.plotsVisible) return;
    
    this.plots.forEach(plot => plot.remove());
    this.plotsVisible = false;
  }

  showCourseLine(): void {
    if (!this.map || this.plots.length === 0) return;

    // Sort plots by time (oldest first) for correct course line
    const sortedPlots = [...this.plots].sort((a, b) => {
      return new Date(a.time).getTime() - new Date(b.time).getTime();
    });
    
    // Convert plots to Point format for smoothing
    const points: Point[] = sortedPlots.map(plot => ({
      lat: plot.position[1],
      lng: plot.position[0],
      timestamp: new Date(plot.time).getTime()
    }));
    
    // Add current object position
    points.push({
      lat: this.options.position[1],
      lng: this.options.position[0],
      timestamp: Date.now()
    });
    
    // Apply smoothing algorithm
    const smoothedPoints = smoothPath(points, 5);
    
    // Convert smoothed points back to coordinates
    const coordinates: [number, number][] = smoothedPoints.map(p => [p.lng, p.lat]);

    // Add source
    if (!this.map.getSource(this.courseLineId)) {
      this.map.addSource(this.courseLineId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coordinates
          }
        }
      });
    }

    // Add layer with same style as before
    if (!this.map.getLayer(this.courseLineId)) {
      this.map.addLayer({
        id: this.courseLineId,
        type: 'line',
        source: this.courseLineId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': this.getCourseLineColor(),
          'line-width': 3,
          'line-dasharray': [2, 2]
        }
      });
    }


  }

  hideCourseLine(): void {
    if (!this.map) return;



    // Remove layer and source
    if (this.map.getLayer(this.courseLineId)) {
      this.map.removeLayer(this.courseLineId);
    }
    if (this.map.getSource(this.courseLineId)) {
      this.map.removeSource(this.courseLineId);
    }

    this.dashOffset = 0;
  }

  updateCourseLine(): void {
    if (!this.map || this.plots.length === 0 || !this.plotsVisible) return;

    // Sort plots by time (oldest first) for correct course line
    const sortedPlots = [...this.plots].sort((a, b) => {
      return new Date(a.time).getTime() - new Date(b.time).getTime();
    });
    
    // Convert plots to Point format for smoothing
    const points: Point[] = sortedPlots.map(plot => ({
      lat: plot.position[1],
      lng: plot.position[0],
      timestamp: new Date(plot.time).getTime()
    }));
    
    // Add current object position
    points.push({
      lat: this.options.position[1],
      lng: this.options.position[0],
      timestamp: Date.now()
    });
    
    // Apply smoothing algorithm
    const smoothedPoints = smoothPath(points, 5);
    
    // Convert smoothed points back to coordinates
    const coordinates: [number, number][] = smoothedPoints.map(p => [p.lng, p.lat]);

    // Update existing source data
    const source = this.map.getSource(this.courseLineId);
    if (source && source.type === 'geojson') {
      (source as maptilersdk.GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coordinates
        }
      });
    }
  }


}

