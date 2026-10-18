export function merchantBounds(merchants: { lat: number; lng: number }[]): [[number, number], [number, number]] | null {
  if (!merchants.length) return null;
  const southWest: [number, number] = [Infinity, Infinity];
  const northEast: [number, number] = [-Infinity, -Infinity];
  for (const { lat, lng } of merchants) {
    southWest[0] = Math.min(southWest[0], lat);
    southWest[1] = Math.min(southWest[1], lng);
    northEast[0] = Math.max(northEast[0], lat);
    northEast[1] = Math.max(northEast[1], lng);
  }
  return [southWest, northEast];
}
