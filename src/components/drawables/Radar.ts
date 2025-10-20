import * as maptilersdk from '@maptiler/sdk';

export interface RadarData {
  name: string;
  position: {
    lat: number;
    lng: number;
  };
  range: number;
}

export class Radar {
  public name: string;
  public position: { lat: number; lng: number };
  public range: number;
  private marker: maptilersdk.Marker | null = null;
  private rangeCircleId: string;

  constructor(data: RadarData) {
    this.name = data.name;
    this.position = data.position;
    this.range = data.range;
    this.rangeCircleId = `radar-range-${this.name}`;
  }

  createSVG(): string {
    return `
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Base -->
        <rect x="16" y="30" width="8" height="6" fill="#2563eb" stroke="#1e40af" stroke-width="1"/>
        
        <!-- Tower body -->
        <rect x="17" y="15" width="6" height="15" fill="#3b82f6" stroke="#2563eb" stroke-width="1"/>
        
        <!-- Top platform -->
        <rect x="14" y="12" width="12" height="3" fill="#60a5fa" stroke="#3b82f6" stroke-width="1"/>
        
        <!-- Antenna -->
        <line x1="20" y1="12" x2="20" y2="5" stroke="#1e40af" stroke-width="2" stroke-linecap="round"/>
        <circle cx="20" cy="5" r="2" fill="#ef4444" stroke="#dc2626" stroke-width="1"/>
        
        <!-- Signal waves -->
        <path d="M 15 8 Q 12 10 10 12" stroke="#60a5fa" stroke-width="1.5" fill="none" opacity="0.6"/>
        <path d="M 25 8 Q 28 10 30 12" stroke="#60a5fa" stroke-width="1.5" fill="none" opacity="0.6"/>
        <path d="M 12 10 Q 8 13 6 16" stroke="#60a5fa" stroke-width="1" fill="none" opacity="0.4"/>
        <path d="M 28 10 Q 32 13 34 16" stroke="#60a5fa" stroke-width="1" fill="none" opacity="0.4"/>
        
        <!-- Label background -->
        <rect x="5" y="36" width="30" height="4" rx="2" fill="rgba(37, 99, 235, 0.9)"/>
        
        <!-- Label text -->
        <text x="20" y="39" font-family="Arial, sans-serif" font-size="3" font-weight="bold" 
              fill="#ffffff" text-anchor="middle">${this.name.toUpperCase()}</text>
      </svg>
    `;
  }

  addTo(map: maptilersdk.Map): void {
    // Create marker
    const el = document.createElement('div');
    el.innerHTML = this.createSVG();
    el.style.cursor = 'pointer';
    el.title = `${this.name} Radar Station\nRange: ${this.range / 1000}km`;

    this.marker = new maptilersdk.Marker({ element: el })
      .setLngLat([this.position.lng, this.position.lat])
      .addTo(map);

    // Add range circle
    this.showRangeCircle(map);
  }

  private showRangeCircle(map: maptilersdk.Map): void {
    // Create circle coordinates (approximation using polygon)
    const coordinates: [number, number][] = [];
    const numPoints = 64;
    const radiusInDegrees = this.range / 111320; // Rough conversion: 1 degree ≈ 111.32 km

    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI;
      const lat = this.position.lat + radiusInDegrees * Math.cos(angle);
      const lng = this.position.lng + (radiusInDegrees * Math.sin(angle)) / Math.cos(this.position.lat * Math.PI / 180);
      coordinates.push([lng, lat]);
    }

    if (!map.getSource(this.rangeCircleId)) {
      map.addSource(this.rangeCircleId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates]
          }
        }
      });
    }

    if (!map.getLayer(`${this.rangeCircleId}-fill`)) {
      map.addLayer({
        id: `${this.rangeCircleId}-fill`,
        type: 'fill',
        source: this.rangeCircleId,
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.1
        }
      });
    }

    if (!map.getLayer(`${this.rangeCircleId}-outline`)) {
      map.addLayer({
        id: `${this.rangeCircleId}-outline`,
        type: 'line',
        source: this.rangeCircleId,
        paint: {
          'line-color': '#3b82f6',
          'line-width': 2,
          'line-opacity': 0.5,
          'line-dasharray': [2, 2]
        }
      });
    }
  }

  remove(map: maptilersdk.Map): void {
    this.marker?.remove();
    this.marker = null;

    // Remove range circle layers and source
    if (map.getLayer(`${this.rangeCircleId}-outline`)) {
      map.removeLayer(`${this.rangeCircleId}-outline`);
    }
    if (map.getLayer(`${this.rangeCircleId}-fill`)) {
      map.removeLayer(`${this.rangeCircleId}-fill`);
    }
    if (map.getSource(this.rangeCircleId)) {
      map.removeSource(this.rangeCircleId);
    }
  }
}

