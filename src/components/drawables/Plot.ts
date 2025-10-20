import * as maptilersdk from '@maptiler/sdk';

export interface PlotData {
  position: [number, number, number];
  speed: number;
  time: string;
  color: string;
  rotation: number;
}

export class Plot {
  public position: [number, number, number];
  public speed: number;
  public time: string;
  public color: string;
  public rotation: number;
  private marker: maptilersdk.Marker | null = null;

  constructor(data: PlotData) {
    this.position = data.position;
    this.speed = data.speed;
    this.time = data.time;
    this.color = data.color;
    this.rotation = data.rotation;
  }

  createSVG(): string {
    return `
      <svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
        <circle cx="5" cy="5" r="4" fill="${this.color}" opacity="0.8"/>
      </svg>
    `;
  }

  addTo(map: maptilersdk.Map): void {
    const el = document.createElement('div');
    el.innerHTML = this.createSVG();
    el.title = `Speed: ${this.speed} | Time: ${this.time}`;

    const [lng, lat] = this.position;
    this.marker = new maptilersdk.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(map);
  }

  remove(): void {
    this.marker?.remove();
    this.marker = null;
  }
}

