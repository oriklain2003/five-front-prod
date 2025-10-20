import { Drawable, DrawableOptions } from './Drawable';

export interface ArrowOptions extends DrawableOptions {
  rotation?: number;
}

export class Arrow extends Drawable {
  private rotation: number;

  constructor(options: ArrowOptions) {
    super(options);
    this.rotation = options.rotation || 0;
  }

  createSVG(): string {
    const size = (this.options.size ?? 20) * 1.3;
    
    // Determine badge content
    let badge = '';
    const badgeSize = 18;
    const badgeX = 18;
    const badgeY = -2;
    
    if (this.classification?.suggested_identification) {
      // Has suggested classification - show !! with rounded square
      badge = `
        <g transform="translate(${badgeX}, ${badgeY})">
          <path d="M ${badgeSize * 0.125} ${badgeSize * 0.258} V ${badgeSize * 0.742} C ${badgeSize * 0.125} ${badgeSize * 0.825} ${badgeSize * 0.125} ${badgeSize * 0.867} ${badgeSize * 0.182} ${badgeSize * 0.924} C ${badgeSize * 0.239} ${badgeSize * 0.981} ${badgeSize * 0.281} ${badgeSize * 0.981} ${badgeSize * 0.333} ${badgeSize} H ${badgeSize * 0.742} C ${badgeSize * 0.825} ${badgeSize} ${badgeSize * 0.867} ${badgeSize} ${badgeSize * 0.924} ${badgeSize * 0.924} C ${badgeSize * 0.981} ${badgeSize * 0.867} ${badgeSize * 0.981} ${badgeSize * 0.825} ${badgeSize} ${badgeSize * 0.742} V ${badgeSize * 0.258} C ${badgeSize} ${badgeSize * 0.175} ${badgeSize} ${badgeSize * 0.133} ${badgeSize * 0.924} ${badgeSize * 0.091} C ${badgeSize * 0.867} ${badgeSize * 0.048} ${badgeSize * 0.825} ${badgeSize * 0.048} ${badgeSize * 0.742} ${badgeSize * 0.048} H ${badgeSize * 0.258} C ${badgeSize * 0.175} ${badgeSize * 0.048} ${badgeSize * 0.133} ${badgeSize * 0.048} ${badgeSize * 0.091} ${badgeSize * 0.091} C ${badgeSize * 0.048} ${badgeSize * 0.133} ${badgeSize * 0.048} ${badgeSize * 0.175} ${badgeSize * 0.048} ${badgeSize * 0.258} Z" 
            stroke="#FF0000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="#ffb6a8"/>
          <text x="${badgeSize/2}" y="${badgeSize * 0.72}" text-anchor="middle" font-size="${badgeSize * 0.65}" font-family="Arial" font-weight="bold" fill="#FF0000">!!</text>
        </g>
      `;
    } else if (!this.classification || !this.classification.current_identification || this.classification.current_identification === 'unknownFast' || this.classification.current_identification === 'radarPoint') {
      // No classification or radar point - show ! with rounded square
      badge = `
        <g transform="translate(${badgeX}, ${badgeY})">
          <path d="M ${badgeSize * 0.125} ${badgeSize * 0.258} V ${badgeSize * 0.742} C ${badgeSize * 0.125} ${badgeSize * 0.825} ${badgeSize * 0.125} ${badgeSize * 0.867} ${badgeSize * 0.182} ${badgeSize * 0.924} C ${badgeSize * 0.239} ${badgeSize * 0.981} ${badgeSize * 0.281} ${badgeSize * 0.981} ${badgeSize * 0.333} ${badgeSize} H ${badgeSize * 0.742} C ${badgeSize * 0.825} ${badgeSize} ${badgeSize * 0.867} ${badgeSize} ${badgeSize * 0.924} ${badgeSize * 0.924} C ${badgeSize * 0.981} ${badgeSize * 0.867} ${badgeSize * 0.981} ${badgeSize * 0.825} ${badgeSize} ${badgeSize * 0.742} V ${badgeSize * 0.258} C ${badgeSize} ${badgeSize * 0.175} ${badgeSize} ${badgeSize * 0.133} ${badgeSize * 0.924} ${badgeSize * 0.091} C ${badgeSize * 0.867} ${badgeSize * 0.048} ${badgeSize * 0.825} ${badgeSize * 0.048} ${badgeSize * 0.742} ${badgeSize * 0.048} H ${badgeSize * 0.258} C ${badgeSize * 0.175} ${badgeSize * 0.048} ${badgeSize * 0.133} ${badgeSize * 0.048} ${badgeSize * 0.091} ${badgeSize * 0.091} C ${badgeSize * 0.048} ${badgeSize * 0.133} ${badgeSize * 0.048} ${badgeSize * 0.175} ${badgeSize * 0.048} ${badgeSize * 0.258} Z" 
            stroke="#FFA500" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <text x="${badgeSize/2}" y="${badgeSize * 0.72}" text-anchor="middle" font-size="${badgeSize * 0.65}" font-family="Arial" font-weight="bold" fill="#FFA500">!</text>
        </g>
      `;
    }
    
    return `
      <svg width="${size}" height="${size}" viewBox="-2 -2 36 32" xmlns="http://www.w3.org/2000/svg"
        style="transform: rotate(${this.rotation}deg)">
        <!-- Red arrow -->
        <path d="M12 17.414 3.293 8.707l1.414-1.414L12 14.586l7.293-7.293 1.414 1.414L12 17.414z"
          fill="red"/>

        <!-- Extended thin red pointer line -->
        <line x1="12" y1="17.4" x2="12" y2="29"
          stroke="red" stroke-width="0.8" stroke-linecap="round"/>

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
      this.setRotation(options.rotation - 90);
    }
  }
}

