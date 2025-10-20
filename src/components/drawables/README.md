# Drawables

Clean architecture for adding custom drawable elements to the map.

## Architecture

- **`Drawable.ts`** - Abstract base class for all drawable components
- **`Star.ts`** - Star drawable implementation
- **`Arrow.ts`** - Arrow drawable implementation

## Usage

### Star

```typescript
import { Star } from './drawables';

const star = new Star({
  position: [34.8, 31.5, 100],  // [longitude, latitude, altitude]
  color: '#ff0000',              // Any CSS color
  size: 40                       // Size in pixels
});

star.addTo(map);
```

### Arrow

```typescript
import { Arrow } from './drawables';

const arrow = new Arrow({
  position: [34.5, 31.3, 200],  // [longitude, latitude, altitude]
  color: '#00ff00',
  size: 40,
  rotation: 0  // Degrees: 0 = right, 90 = down, -90 = up, 180 = left
});

arrow.addTo(map);

// Change rotation dynamically
arrow.setRotation(45);
```

## Methods

All drawables inherit from `Drawable` and have:

- `addTo(map)` - Add drawable to map
- `remove()` - Remove drawable from map
- `setPosition([lng, lat, alt])` - Update position with altitude
- `getAltitude()` - Get altitude value

## Creating Custom Drawables

Extend the `Drawable` class and implement `createSVG()`:

```typescript
import { Drawable, DrawableOptions } from './Drawable';

export class CustomShape extends Drawable {
  createSVG(): string {
    const { color, size } = this.options;
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24">
        <!-- Your SVG path here -->
      </svg>
    `;
  }
}
```

