import { Drawable, DrawableOptions } from './Drawable';

export interface PlaneOptions extends DrawableOptions {
  rotation?: number;
}

export class Plane extends Drawable {
  private rotation: number;

  constructor(options: PlaneOptions) {
    super(options);
    this.rotation = options.rotation || 0;
  }

  createSVG(): string {
    const size = (this.options.size ?? 20) * 0.6;
    const color = this.color;
    
    // Determine badge content
    let badge = '';
    const badgeCenterX = 16 + Plane.BADGE_SIZE / 2;
    const badgeCenterY = -2 + Plane.BADGE_SIZE / 2;
    if (this.classification?.suggested_identification) {
      // Has suggested classification - show !!
      badge = `
        <g transform="rotate(-90, ${badgeCenterX}, ${badgeCenterY})">
          <rect x="16" y="-2" width="${Plane.BADGE_SIZE}" height="${Plane.BADGE_SIZE}" 
            fill="#FF0000" rx="2"/>
          <text x="${badgeCenterX}" y="${badgeCenterY + 4}" 
            font-family="Arial, sans-serif" font-size="${Plane.BADGE_FONT_SIZE}" 
            font-weight="bold" fill="#FFFFFF" text-anchor="middle">!!</text>
        </g>
      `;
    } else if (!this.classification || !this.classification.current_identification || this.classification.current_identification === 'unknownFast' || this.classification.current_identification === 'radarPoint') {
      // No classification or radar point - show !
      badge = `
        <g transform="rotate(-90, ${badgeCenterX}, ${badgeCenterY})">
          <rect x="16" y="-2" width="${Plane.BADGE_SIZE}" height="${Plane.BADGE_SIZE}" 
            fill="#FFA500" rx="2"/>
          <text x="${badgeCenterX}" y="${badgeCenterY + 4}" 
            font-family="Arial, sans-serif" font-size="${Plane.BADGE_FONT_SIZE}" 
            font-weight="bold" fill="#FFFFFF" text-anchor="middle">!</text>
        </g>
      `;
    }
    
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 1080 1080" fill="none" xmlns="http://www.w3.org/2000/svg" 
        style="transform: rotate(${this.rotation}deg)">
        <path fill="${color}" d="M619.67,530.33v-15.5c0-3.62,13.55-4.61,16.1-1.1,2.22,2.78,4.41,25.84-2.09,27.09l35,26.5v-15.5c0-4.18,13.83-5.64,16.52-1.52.72,1.21.91,21.15.46,23.5-.38,1.97-1.66,2.75-2.96,4.02l53,39.99c4.5,5.19,6.66,20.3,3.49,26.51l-3.15-6.08-55.7-22.99-2.15,3.06c-2.1-1.58-1.48-4.86-3.55-6.43-.92-.7-13.33-5.99-13.94-5.55-.56,1.83-.25,4.71-3.01,4,1.35-7-8.69-9.56-14.22-11.31-4.97-1.57-1.43,1.17-4.77,3.3l-1.69-6.03-11.8-3.98-.5,2.28-2,.73c-.11-6.82-11.22-6.74-16.36-9.08l-2.15,3.06c-1.87-1.05-1.65-4.12-3.24-4.99-4.96-2.71-18.52-6.2-17.25,3.51-1.06,29.38-1.11,58.72-6.02,87.79,12.55,10.48,26.16,19.98,38.49,30.73,11.38,9.92,20.23,16.82,18.52,33.97l-62.54-24c-5.11.06-5.19,15.8-5.58,19.38-.12,1.15-.45,5.48-1.87,5.61-1.86-8.3-.16-17.74-5.59-24.9l-64.41,24.91c-.89-8.06,1.6-15.79,6-22.49l51.44-43.45c-.88-9.14-2.79-18.39-3.44-27.56-1.22-17.31.5-36.25-1.03-52.97-.25-2.69-1.97-12.51-4.66-13.39-2.48-.81-17.66,2.63-16.34,7.87h-1.97s-1.58-2.94-1.58-2.94c-6.63,2.76-14.35,2.23-16.95,9.94l-2.92-2.99c-4.78,2.31-13.18,2.14-12.59,9l-2-.73v-2.27c-.75-.75-16.35,5.13-16.86,6.63s0,3.69-.14,5.36c-3.53.81-.92-3.92-4.45-4.01l-12.78,5.03-1.78,6.98-2.48-4.98-57.9,24.88-2.62,6.11v-14.5c0-2.51,3.18-10.83,5.09-12.91l52.91-40.09c.21-.42-2.15-.95-2.91-2.07-1.66-2.44-1.78-22.75-.16-25.01,4.27-3.72,10.31-3.5,15.11-.96.75.76,1.93,8.45,2,10.08.07,1.54-2.53,8.59.45,7.44l33.51-25.49c.32-.71-1.9-.54-2.5-1.45-1.06-1.62-.91-23.9.41-25.63,2.44-3.88,16.09-2.36,16.09,1.09v15.5c10.52-9.55,24.09-18.57,34.02-28.48,1.24-1.24,2.34-2.21,3.18-3.82,4.05-7.84.28-27.17.76-37.24.52-11.09,4.54-40.02,12.02-47.98,11.51-12.26,19.29,21.91,20.56,28.48,3.65,18.99,1.64,36.79,3.22,55.78,10.81,12.01,24.07,21.67,36.24,32.26Z"/>
        ${badge}
      </svg>
    `;
  }

  setRotation(rotation: number): void {
    this.rotation = rotation;
    if (this.marker) {
      const el = this.marker.getElement();
      const svg = el.querySelector('svg');
      if (svg) {
        svg.style.transform = `rotate(${rotation}deg)`;
      }
    }
  }

  update(options: Partial<import('./Drawable').DrawableOptions> & { rotation?: number }): void {
    super.update(options);
    
    // Update rotation if provided
    if (options.rotation !== undefined) {
      this.setRotation(options.rotation);
    }
  }
}

