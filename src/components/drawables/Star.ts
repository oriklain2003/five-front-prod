import { Drawable, DrawableOptions } from './Drawable';

export class Star extends Drawable {
  constructor(options: DrawableOptions) {
    super(options);
  }

  createSVG(): string {
    const size = (this.options.size ?? 30) * 0.3;
    const glowColor = '#00FF00'; // Bright green
    
    // Determine badge content
    let badge = '';
    const badgeCenterX = 16 + Star.BADGE_SIZE / 2;
    const badgeCenterY = -2 + Star.BADGE_SIZE / 2;
    if (this.classification?.suggested_identification) {
      // Has suggested classification - show !!
      badge = `
        <g transform="rotate(-90, ${badgeCenterX}, ${badgeCenterY})">
          <rect x="16" y="-2" width="${Star.BADGE_SIZE}" height="${Star.BADGE_SIZE}" 
            fill="#FF0000" rx="2"/>
          <text x="${badgeCenterX}" y="${badgeCenterY + 4}" 
            font-family="Arial, sans-serif" font-size="${Star.BADGE_FONT_SIZE}" 
            font-weight="bold" fill="#FFFFFF" text-anchor="middle">!!</text>
        </g>
      `;
    } else if (!this.classification || !this.classification.current_identification || this.classification.current_identification === 'unknownFast') {
      // No classification or radar point - show !
      badge = `
        <g transform="rotate(-90, ${badgeCenterX}, ${badgeCenterY})">
          <rect x="16" y="-2" width="${Star.BADGE_SIZE}" height="${Star.BADGE_SIZE}" 
            fill="#FFA500" rx="2"/>
          <text x="${badgeCenterX}" y="${badgeCenterY + 4}" 
            font-family="Arial, sans-serif" font-size="${Star.BADGE_FONT_SIZE}" 
            font-weight="bold" fill="#FFFFFF" text-anchor="middle">!</text>
        </g>
      `;
    }
    
    return `
      <svg width="${size}" height="${size}" viewBox="-2 -2 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow-${this.id}" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
          fill="${glowColor}" 
          stroke="${glowColor}" 
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          filter="url(#glow-${this.id})"
        />
        ${badge}
      </svg>
    `;
  }
}

