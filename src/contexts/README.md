# Map Context

Simple and clean context for sharing map instance across components.

## Setup

Wrap your app with `MapProvider`:

```tsx
import { MapProvider } from './contexts/MapContext';

function App() {
  return (
    <MapProvider>
      <Map />
      <YourComponent />
    </MapProvider>
  );
}
```

## Usage

Use the `useMap` hook to access the map from any component:

```tsx
import { useMap } from '../contexts/MapContext';
import { Star } from './drawables';

const MyComponent = () => {
  const map = useMap();

  const addStar = () => {
    if (!map.current) return;

    const star = new Star({
      position: [34.8, 31.5],
      color: '#ff0000',
      size: 40
    });
    star.addTo(map.current);
  };

  return <button onClick={addStar}>Add Star</button>;
};
```

## Example

See `MapControls.tsx` for a complete example of manipulating the map from a separate component.

