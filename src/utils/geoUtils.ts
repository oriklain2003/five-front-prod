/**
 * Calculate distance between two geographic points using Haversine formula
 * Returns distance in kilometers
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance from a point to the nearest point on a line segment
 */
function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { distance: number; nearestPoint: [number, number] } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  
  if (dx === 0 && dy === 0) {
    return {
      distance: haversineDistance(py, px, y1, x1),
      nearestPoint: [x1, y1]
    };
  }
  
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  const nearestX = x1 + t * dx;
  const nearestY = y1 + t * dy;
  
  return {
    distance: haversineDistance(py, px, nearestY, nearestX),
    nearestPoint: [nearestX, nearestY]
  };
}

/**
 * Parse WKT LINESTRING and return array of coordinates
 */
export function parseLineString(wkt: string): Array<[number, number]> {
  const coordsStr = wkt.match(/LINESTRING\s*\((.*)\)/i)?.[1];
  if (!coordsStr) return [];
  
  return coordsStr.split(',').map(pair => {
    const [lon, lat] = pair.trim().split(/\s+/).map(Number);
    return [lon, lat];
  });
}

/**
 * Calculate nearest point on a LINESTRING and distance to it
 */
export function nearestPointOnLineString(
  targetLon: number,
  targetLat: number,
  lineCoords: Array<[number, number]>
): { distance: number; nearestPoint: [number, number] } {
  let minDistance = Infinity;
  let nearestPoint: [number, number] = [0, 0];
  
  for (let i = 0; i < lineCoords.length - 1; i++) {
    const [x1, y1] = lineCoords[i];
    const [x2, y2] = lineCoords[i + 1];
    
    const result = distanceToSegment(targetLon, targetLat, x1, y1, x2, y2);
    
    if (result.distance < minDistance) {
      minDistance = result.distance;
      nearestPoint = result.nearestPoint;
    }
  }
  
  return { distance: minDistance, nearestPoint };
}

/**
 * Calculate ETA in seconds from current position/speed to nearest point on linestring
 * Speed is in knots, distance in km
 */
export function calculateETA(
  targetLon: number,
  targetLat: number,
  speedKnots: number,
  lineCoords: Array<[number, number]>
): number {
  const { distance } = nearestPointOnLineString(targetLon, targetLat, lineCoords);
  
  // Convert knots to km/h
  const speedKmh = speedKnots * 1.852;
  
  // Calculate time in hours, then convert to seconds
  const timeHours = distance / speedKmh;
  const timeSeconds = timeHours * 3600;
  
  return Math.round(timeSeconds);
}

