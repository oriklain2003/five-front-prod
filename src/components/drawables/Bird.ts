import { Drawable, DrawableOptions } from './Drawable';

export interface BirdOptions extends DrawableOptions {
  rotation?: number;
}

export class Bird extends Drawable {
  private rotation: number;

  constructor(options: BirdOptions) {
    super(options);
    this.rotation = (options.rotation || 0) ;
  }

  createSVG(): string {
    const size = (this.options.size ?? 20) * 0.7;
    const color = this.color;
    
    // Determine badge content
    let badge = '';
    const badgeCenterX = 16 + Bird.BADGE_SIZE / 2;
    const badgeCenterY = -2 + Bird.BADGE_SIZE / 2;
    if (this.classification?.suggested_identification) {
      // Has suggested classification - show !!
      badge = `
        <g transform="rotate(-90, ${badgeCenterX}, ${badgeCenterY})">
          <rect x="16" y="-2" width="${Bird.BADGE_SIZE}" height="${Bird.BADGE_SIZE}" 
            fill="#FF0000" rx="2"/>
          <text x="${badgeCenterX}" y="${badgeCenterY + 4}" 
            font-family="Arial, sans-serif" font-size="${Bird.BADGE_FONT_SIZE}" 
            font-weight="bold" fill="#FFFFFF" text-anchor="middle">!!</text>
        </g>
      `;
    } else if (!this.classification || !this.classification.current_identification || this.classification.current_identification === 'unknownFast' || this.classification.current_identification === 'radarPoint') {
      // No classification or radar point - show !
      badge = `
        <g transform="rotate(-90, ${badgeCenterX}, ${badgeCenterY})">
          <rect x="16" y="-2" width="${Bird.BADGE_SIZE}" height="${Bird.BADGE_SIZE}" 
            fill="#FFA500" rx="2"/>
          <text x="${badgeCenterX}" y="${badgeCenterY + 4}" 
            font-family="Arial, sans-serif" font-size="${Bird.BADGE_FONT_SIZE}" 
            font-weight="bold" fill="#FFFFFF" text-anchor="middle">!</text>
        </g>
      `;
    }
    
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 100 125" fill="none" xmlns="http://www.w3.org/2000/svg" 
        style="transform: rotate(${this.rotation}deg)">
        <path fill="${color}" d="M96.1,31.2H77.6c-5,0-9.9,1.8-13.8,5L55,43.4l-10.5-9.6c-4.6-4.2-10.5-6.6-16.8-6.9l-23.9-1c-0.2,0-0.2,0.2,0,0.3l19.5,6.2  c4.3,1.4,8,4.4,10.2,8.4l7.1,13c0,0-7.9,4.4-15.8,9.8s3.3,11,5.8,10.6c2.5-0.5,8.1-8.2,10.8-10.2c2.7-2,13.4,0.5,25.4-2.3  c5-1.2,9.2-6.3,9.2-6.3l3.9-0.6c0.2,0,0.3-0.3,0.1-0.4l-3.5-2.5c0,0-0.7-2.9-3.2-3.6c-2.5-0.7-4.2,0.2-4.2,0.2l1-2.6  c2.1-5.5,6.8-9.6,12.6-11l13.5-3.3C96.3,31.4,96.3,31.2,96.1,31.2z"/>
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

