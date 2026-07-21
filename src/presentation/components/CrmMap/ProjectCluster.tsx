'use client';

import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { useMap } from '@vis.gl/react-google-maps';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import type { CrmMapMarker } from '@/presentation/features/crmMap';
import { ProjectMarker } from './ProjectMarker';

export type ProjectClusterProps = {
  readonly markers: readonly CrmMapMarker[];
  readonly selectedParentProjectId: string | null;
  readonly onMarkerClick: (marker: CrmMapMarker) => void;
};

export function ProjectCluster({
  markers,
  selectedParentProjectId,
  onMarkerClick,
}: ProjectClusterProps): ReactElement {
  const map = useMap();
  const [markerMap, setMarkerMap] = useState<
    Record<string, google.maps.marker.AdvancedMarkerElement | null>
  >({});

  const onMarkerReady = useCallback(
    (parentProjectId: string, marker: google.maps.marker.AdvancedMarkerElement | null) => {
      setMarkerMap((previous) => {
        if (previous[parentProjectId] === marker) return previous;
        return { ...previous, [parentProjectId]: marker };
      });
    },
    []
  );

  const clusterMarkers = useMemo(
    () =>
      Object.values(markerMap).filter(
        (marker): marker is google.maps.marker.AdvancedMarkerElement => marker != null
      ),
    [markerMap]
  );

  useEffect(() => {
    if (!map) return;
    const clusterer = new MarkerClusterer({
      map,
      markers: clusterMarkers,
    });
    return () => {
      clusterer.clearMarkers(true);
      clusterer.setMap(null);
    };
  }, [map, clusterMarkers]);

  return (
    <>
      {markers.map((marker) => (
        <ProjectMarker
          key={marker.parentProjectId}
          marker={marker}
          selected={selectedParentProjectId === marker.parentProjectId}
          onClick={onMarkerClick}
          onMarkerReady={onMarkerReady}
        />
      ))}
    </>
  );
}
