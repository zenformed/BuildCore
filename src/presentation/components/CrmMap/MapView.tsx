'use client';

import {
  ColorScheme,
  Map,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from 'react';
import { env } from '@/infrastructure/config/env';
import {
  buildMarkerBounds,
  CRM_MAP_DEFAULT_CENTER,
  CRM_MAP_DEFAULT_ZOOM,
  CRM_MAP_SELECTION_ZOOM,
  type CrmMapMarker,
} from '@/presentation/features/crmMap';
import { ProjectCluster } from './ProjectCluster';
import styles from './CrmMap.module.css';

export type MapViewSelection = {
  readonly parentProjectId: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly nonce: number;
} | null;

export type MapViewProps = {
  readonly markers: readonly CrmMapMarker[];
  readonly selection: MapViewSelection;
  readonly isMobileLayout: boolean;
  readonly panelOpen: boolean;
  readonly onMarkerClick: (marker: CrmMapMarker) => void;
};

function resolveColorScheme(): (typeof ColorScheme)[keyof typeof ColorScheme] {
  if (typeof document === 'undefined') return ColorScheme.LIGHT;
  return document.documentElement.getAttribute('data-theme') === 'dark'
    ? ColorScheme.DARK
    : ColorScheme.LIGHT;
}

function MapCameraController({
  markers,
  selection,
  isMobileLayout,
  panelOpen,
}: {
  readonly markers: readonly CrmMapMarker[];
  readonly selection: MapViewSelection;
  readonly isMobileLayout: boolean;
  readonly panelOpen: boolean;
}): null {
  const map = useMap();
  const [didFitBounds, setDidFitBounds] = useState(false);

  useEffect(() => {
    if (!map || didFitBounds) return;
    const bounds = buildMarkerBounds(markers);
    if (bounds == null) {
      map.setCenter(CRM_MAP_DEFAULT_CENTER);
      map.setZoom(CRM_MAP_DEFAULT_ZOOM);
      setDidFitBounds(true);
      return;
    }
    map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
    setDidFitBounds(true);
  }, [didFitBounds, map, markers]);

  useEffect(() => {
    if (!map || selection == null) return;
    const position = { lat: selection.latitude, lng: selection.longitude };
    map.panTo(position);
    const currentZoom = map.getZoom() ?? CRM_MAP_DEFAULT_ZOOM;
    if (currentZoom < CRM_MAP_SELECTION_ZOOM) {
      map.setZoom(CRM_MAP_SELECTION_ZOOM);
    }
    window.requestAnimationFrame(() => {
      if (!panelOpen) return;
      if (isMobileLayout) {
        map.panBy(0, 140);
      } else {
        map.panBy(-160, 0);
      }
    });
  }, [
    isMobileLayout,
    map,
    panelOpen,
    selection?.latitude,
    selection?.longitude,
    selection?.nonce,
    selection?.parentProjectId,
  ]);

  return null;
}

function MapInner({
  markers,
  selection,
  isMobileLayout,
  panelOpen,
  onMarkerClick,
}: MapViewProps): ReactElement {
  const [colorScheme, setColorScheme] = useState(resolveColorScheme);

  useEffect(() => {
    const observer = new MutationObserver(() => setColorScheme(resolveColorScheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  const defaultCenter = useMemo(() => {
    if (markers.length === 0) return CRM_MAP_DEFAULT_CENTER;
    return { lat: markers[0].latitude, lng: markers[0].longitude };
  }, [markers]);

  return (
    <div className={styles.mapPane}>
      {markers.length === 0 ? (
        <div className={styles.mapOverlayState}>No projects with map coordinates yet.</div>
      ) : null}
      <Map
        className={styles.mapCanvas}
        defaultCenter={defaultCenter}
        defaultZoom={CRM_MAP_DEFAULT_ZOOM}
        mapId={env.googleMapsMapId}
        colorScheme={colorScheme}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
      >
        <MapCameraController
          markers={markers}
          selection={selection}
          isMobileLayout={isMobileLayout}
          panelOpen={panelOpen}
        />
        <ProjectCluster
          markers={markers}
          selectedParentProjectId={selection?.parentProjectId ?? null}
          onMarkerClick={onMarkerClick}
        />
      </Map>
    </div>
  );
}

export function MapView(props: MapViewProps): ReactElement {
  const apiKey = env.googleMapsApiKey;

  if (!apiKey) {
    return (
      <div className={styles.mapPane}>
        <div className={styles.mapOverlayState}>
          Google Maps is not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the map.
        </div>
      </div>
    );
  }

  return <MapInner {...props} />;
}
