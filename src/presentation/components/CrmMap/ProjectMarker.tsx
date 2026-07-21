'use client';

import { AdvancedMarker, Pin, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';
import { useEffect, type ReactElement } from 'react';
import type { CrmMapMarker } from '@/presentation/features/crmMap';

export type ProjectMarkerProps = {
  readonly marker: CrmMapMarker;
  readonly selected: boolean;
  readonly onClick: (marker: CrmMapMarker) => void;
  readonly onMarkerReady: (
    parentProjectId: string,
    marker: google.maps.marker.AdvancedMarkerElement | null
  ) => void;
};

export function ProjectMarker({
  marker,
  selected,
  onClick,
  onMarkerReady,
}: ProjectMarkerProps): ReactElement {
  const [markerRef, markerInstance] = useAdvancedMarkerRef();

  useEffect(() => {
    onMarkerReady(marker.parentProjectId, markerInstance);
    return () => onMarkerReady(marker.parentProjectId, null);
  }, [marker.parentProjectId, markerInstance, onMarkerReady]);

  return (
    <AdvancedMarker
      ref={markerRef}
      position={{ lat: marker.latitude, lng: marker.longitude }}
      title={marker.parentProjectName}
      onClick={() => onClick(marker)}
      zIndex={selected ? 10 : 1}
    >
      <Pin
        background={selected ? '#1d4ed8' : '#2563eb'}
        borderColor={selected ? '#1e3a8a' : '#1e40af'}
        glyphColor="#ffffff"
        scale={selected ? 1.15 : 1}
      />
    </AdvancedMarker>
  );
}
