import React from 'react';
import { TileLayer } from 'react-leaflet';
import { MAP_CONFIG } from '@/config/mapConfig';

interface AppTileLayerProps {
  forceLight?: boolean;
}

export const AppTileLayer: React.FC<AppTileLayerProps> = () => {
  return (
    <TileLayer
      key={MAP_CONFIG.tileUrl}
      url={MAP_CONFIG.tileUrl}
      subdomains={MAP_CONFIG.subdomains}
      maxZoom={MAP_CONFIG.maxZoom}
      attribution={MAP_CONFIG.attribution}
    />
  );
};

export default AppTileLayer;
