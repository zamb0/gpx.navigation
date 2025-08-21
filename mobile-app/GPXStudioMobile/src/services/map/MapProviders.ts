import { MapProvider } from '../../types/map';

export const MAP_PROVIDERS: Record<string, MapProvider> = {
  openStreetMap: {
    id: 'openStreetMap',
    name: 'OpenStreetMap',
    type: 'raster',
    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
    minZoom: 1,
    tileSize: 256,
  },
  openTopoMap: {
    id: 'openTopoMap',
    name: 'OpenTopoMap',
    type: 'raster',
    urlTemplate: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap (CC-BY-SA)',
    maxZoom: 17,
    minZoom: 1,
    tileSize: 256,
  },
  cyclOSM: {
    id: 'cyclOSM',
    name: 'CyclOSM',
    type: 'raster',
    urlTemplate: 'https://tile.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    attribution: '© CyclOSM, © OpenStreetMap contributors',
    maxZoom: 20,
    minZoom: 1,
    tileSize: 256,
  },
  satellite: {
    id: 'satellite',
    name: 'Satellite',
    type: 'raster',
    urlTemplate:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
    minZoom: 1,
    tileSize: 256,
  },
  terrain: {
    id: 'terrain',
    name: 'Terrain',
    type: 'raster',
    urlTemplate:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, USGS, NOAA',
    maxZoom: 13,
    minZoom: 1,
    tileSize: 256,
  },
};

export const DEFAULT_MAP_PROVIDER = MAP_PROVIDERS.openStreetMap;

export function getMapProvider(id: string): MapProvider | undefined {
  return MAP_PROVIDERS[id];
}

export function getAllMapProviders(): MapProvider[] {
  return Object.values(MAP_PROVIDERS);
}

export function isValidMapProvider(id: string): boolean {
  return id in MAP_PROVIDERS;
}
