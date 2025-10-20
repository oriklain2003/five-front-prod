import { Drawable, DrawableOptions } from './Drawable';

export interface MissileOptions extends DrawableOptions {
  rotation?: number;
}

export class Missile extends Drawable {
  private rotation: number;

  constructor(options: MissileOptions) {
    super(options);
    this.rotation = (options.rotation || 270) - 180;
  }

  createSVG(): string {
    const size = (this.options.size ?? 20) * 0.6;
    const color = this.color;
    
    // Determine badge content
    let badge = '';
    const badgeCenterX = 16 + Missile.BADGE_SIZE / 2;
    const badgeCenterY = -2 + Missile.BADGE_SIZE / 2;
    if (this.classification?.suggested_identification) {
      // Has suggested classification - show !!
      badge = `
        <g transform="rotate(-90, ${badgeCenterX}, ${badgeCenterY})">
          <rect x="16" y="-2" width="${Missile.BADGE_SIZE}" height="${Missile.BADGE_SIZE}" 
            fill="#FF0000" rx="2"/>
          <text x="${badgeCenterX}" y="${badgeCenterY + 4}" 
            font-family="Arial, sans-serif" font-size="${Missile.BADGE_FONT_SIZE}" 
            font-weight="bold" fill="#FFFFFF" text-anchor="middle">!!</text>
        </g>
      `;
    } else if (!this.classification || !this.classification.current_identification || this.classification.current_identification === 'unknownFast' || this.classification.current_identification === 'radarPoint') {
      // No classification or radar point - show !
      badge = `
        <g transform="rotate(-90, ${badgeCenterX}, ${badgeCenterY})">
          <rect x="16" y="-2" width="${Missile.BADGE_SIZE}" height="${Missile.BADGE_SIZE}" 
            fill="#FFA500" rx="2"/>
          <text x="${badgeCenterX}" y="${badgeCenterY + 4}" 
            font-family="Arial, sans-serif" font-size="${Missile.BADGE_FONT_SIZE}" 
            font-weight="bold" fill="#FFFFFF" text-anchor="middle">!</text>
        </g>
      `;
    }
    
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 459.615 459.614" xmlns="http://www.w3.org/2000/svg" 
        style="transform: rotate(${this.rotation + 180}deg)">
        <g>
          <path fill="${color}" d="M455.456,249.343l-13.932,3.993v53.451h-40.142l-30.042-37.909h-68.935v50.638c0,6.752-2.573,12.224-5.734,12.224 l-78.506-62.856H101.073c-1.374,0-2.733-0.027-4.09-0.05v-78.049c1.357-0.022,2.717-0.047,4.09-0.047h121.717l73.873-62.862 c3.169,0,5.729,5.475,5.729,12.238v50.624h64.635l34.354-43.598h40.142v59.82l13.927,4.169 C464.818,230.934,455.456,249.343,455.456,249.343z M0,229.808c0,19.485,34.821,35.634,80.359,38.594v-77.169 C34.827,194.19,0,210.327,0,229.808z"/>
        </g>
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
        svg.style.transform = `rotate(${rotation + 180}deg)`;
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

