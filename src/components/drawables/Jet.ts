import { Drawable, DrawableOptions } from './Drawable';

export interface JetOptions extends DrawableOptions {
  rotation?: number;
}

export class Jet extends Drawable {
  private rotation: number;

  constructor(options: JetOptions) {
    super(options);
    this.rotation = options.rotation || 0;
  }

  createSVG(): string {
    const size = (this.options.size ?? 20) * 0.5;
    const color = this.color;
    
    // Determine badge content
    let badge = '';
    const badgeCenterX = 16 + Jet.BADGE_SIZE / 2;
    const badgeCenterY = -2 + Jet.BADGE_SIZE / 2;
    if (this.classification?.suggested_identification) {
      // Has suggested classification - show !!
      badge = `
        <g transform="rotate(-90, ${badgeCenterX}, ${badgeCenterY})">
          <rect x="16" y="-2" width="${Jet.BADGE_SIZE}" height="${Jet.BADGE_SIZE}" 
            fill="#FF0000" rx="2"/>
          <text x="${badgeCenterX}" y="${badgeCenterY + 4}" 
            font-family="Arial, sans-serif" font-size="${Jet.BADGE_FONT_SIZE}" 
            font-weight="bold" fill="#FFFFFF" text-anchor="middle">!!</text>
        </g>
      `;
    } else if (!this.classification || !this.classification.current_identification || this.classification.current_identification === 'unknownFast' || this.classification.current_identification === 'radarPoint') {
      // No classification or radar point - show !
      badge = `
        <g transform="rotate(-90, ${badgeCenterX}, ${badgeCenterY})">
          <rect x="16" y="-2" width="${Jet.BADGE_SIZE}" height="${Jet.BADGE_SIZE}" 
            fill="#FFA500" rx="2"/>
          <text x="${badgeCenterX}" y="${badgeCenterY + 4}" 
            font-family="Arial, sans-serif" font-size="${Jet.BADGE_FONT_SIZE}" 
            font-weight="bold" fill="#FFFFFF" text-anchor="middle">!</text>
        </g>
      `;
    }
    
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 1080 1080" fill="none" xmlns="http://www.w3.org/2000/svg" 
        style="transform: rotate(${this.rotation}deg)">
        <defs>
          <style>
            .st0 { fill: ${color}; }
          </style>
        </defs>
        <path class="st0" d="M658.17,563.67c12.75.06,25.33.53,38,2v17c-23.99,3.71-48.44,1.94-72.46,4.04l-232.54-.04,1.48,2,242.53-.5c-13.25,2.89-26.47,6.63-39.82,9.19-52.54,10.09-107.14,3.08-160.49,5.51l-39.33,42.67c-4.97,1.48-24.47,3.17-26.18-2.56l-.26-40.71,3.63-1.52.44-6.08h30v-2.98s-18.57-2.95-18.57-2.95l-.43-12.07h-25.5c-.31,0-1.84-2.03-2.48-2.5-.01-3.94,24.31-2.28,27.97-2.5v-13.01s18.56-1.94,18.56-1.94l.45-3.05h-30v-6.01s-4,0-4,0v-42.5c0-.16,1.55-1.77,2.01-1.99,1.99-.93,22.85-.96,24.97,0,11.75,11.91,21.96,25.44,33.5,37.5,1.72,1.8,4.83,5.54,7.04,5.96,49.49,2.59,102.97-4.81,151.67,3.33,15.4,2.58,30.41,7.17,45.81,9.7h-241.51s-1.48,1.99-1.48,1.99l212.54-.04,6.92,1.08,46.96-.08c.79-.04.53,1.01.58,1.04-8.78-.04-31.6-1.57-37.43,5.07-6.93,7.89,2.21,14.8,10.01,15.84,9.65,1.29,33.08.54,42.19-2.64,10.7-3.73,9.56-12.13-1-15.56-4.6-1.49-11.2-1.2-13.78-2.72ZM620.17,565.68c-9.22.27-18.85,1.56-27.82,3.67-14.86,3.5-15.47,6.04-.2,9.83,9.21,2.28,18.69,2.96,28.01,4.48-5.8-6.34-6.57-11.88,0-17.98Z"/>
        <path class="st0" d="M464.17,666.67l6.95-.05,10.05-62.96h2.99s-.11,10.39-.11,10.39l-14.87,77.61c1.57-.27,1.5-4.16,1.83-5.66,5.29-24.58,9.34-49.43,15.1-73.9l54.86-.15.7,1.72c6.06-4.9,15.37-.12,22.51-.99l-69,78.5c3.6,1.34,7.8-.13,11.45.54,1.67.31,2.74,1.71,4.99,2.01,3.98.53,12.99-2.31,13.55,2.95h-68v-5.01c1.42.17,7,.29,7-1.49v-23.5Z"/>
        <path class="st0" d="M525.17,452.67c-2.59,3.78-9.23,1.42-13.45,2.05-1.84.28-3.27,1.63-5.1,1.9-3.73.54-7.8-.69-11.44.55l68.99,79.5c-7.78-1.04-18.01,2.75-23.99-2.99l.49,3h-55.5c-3.96-24.8-8.87-49.72-14.16-74.34-.32-1.5-.25-5.39-1.83-5.66l14.86,78.62c-.33,3.87,2.24,10.79-2.85,9.37l-10.07-62.95-6.95-.05v-23.5c0-1.78-5.58-1.65-7.01-1.5v-4h68.01Z"/>
        <path class="st0" d="M696.15,561.7v2.97c-1.18-.52-2.11-.89-3.46-1.02-15.37-1.44-32.33-.45-46.92-2.08-28.75-3.22-60.48-18.86-91.06-16.94l-55.55.05v-6.01s-6,0-6,0l1,5.99h-8s0-7,0-7c25.22,1.01,51.44-1.33,76.55-.04,24.55,1.26,47.04,11.85,71.25,15.75,11.53,1.86,23.69,1.59,34.67,3.33,2.65.42,3.88,2.52,6.08,2.92,3.24.58,20.57.98,21.45,2.07Z"/>
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

