'use client';

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import {
  loadCrmMapPageData,
  type CrmMapMarker,
  type CrmMapSearchableProject,
} from '@/presentation/features/crmMap';
import type { CrmProjectWorkflowProgressInputIndex } from '@/domain/crm/projectWorkflowProgressInput';
import { useBuildCoreNavigation } from '@/presentation/providers/BuildCoreNavigationProvider';
import projectStyles from '@/presentation/components/CrmProjectDetail/ProjectDetail.module.css';
import { MapView } from './MapView';
import { ProjectDetailsPanel } from './ProjectDetailsPanel';
import { ProjectSearch } from './ProjectSearch';
import styles from './CrmMap.module.css';

export function CrmMapPage(): ReactElement {
  const router = useRouter();
  const nav = useBuildCoreNavigation();
  const isMobileLayout = useDashboardMobileLayout();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markers, setMarkers] = useState<readonly CrmMapMarker[]>([]);
  const [searchable, setSearchable] = useState<readonly CrmMapSearchableProject[]>([]);
  const [workflowProgressInputIndex, setWorkflowProgressInputIndex] = useState<
    CrmProjectWorkflowProgressInputIndex | undefined
  >(undefined);
  const [selected, setSelected] = useState<CrmMapSearchableProject | null>(null);
  const [selectionToken, setSelectionToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void loadCrmMapPageData()
      .then((data) => {
        if (cancelled) return;
        setMarkers(data.markers);
        setSearchable(data.searchable);
        setWorkflowProgressInputIndex(data.workflowProgressInputIndex);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load map projects.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectEntry = useCallback((entry: CrmMapSearchableProject) => {
    setSelected(entry);
    setSelectionToken((token) => token + 1);
  }, []);

  const onMarkerClick = useCallback(
    (marker: CrmMapMarker) => {
      const parentEntry =
        searchable.find(
          (entry) => entry.projectId === marker.parentProjectId && !entry.isSubproject
        ) ?? searchable.find((entry) => entry.parentProjectId === marker.parentProjectId);
      if (parentEntry) {
        selectEntry(parentEntry);
      }
    },
    [searchable, selectEntry]
  );

  const mapSelection = useMemo(() => {
    if (selected == null) return null;
    return {
      parentProjectId: selected.parentProjectId,
      latitude: selected.marker.latitude,
      longitude: selected.marker.longitude,
      nonce: selectionToken,
    };
  }, [selected, selectionToken]);

  const onOpenProject = useCallback(
    (slug: string) => {
      const entry = searchable.find((item) => item.projectSlug === slug);
      if (entry?.isSubproject) {
        router.push(nav.routes.projectSubDetail(entry.parentProjectSlug, entry.projectSlug));
        return;
      }
      router.push(nav.routes.projectDetail(slug));
    },
    [nav.routes, router, searchable]
  );

  const onViewPhotos = useCallback(
    (projectName: string) => {
      const query = new URLSearchParams({ q: projectName });
      router.push(`${nav.routes.photos}?${query.toString()}`);
    },
    [nav.routes.photos, router]
  );

  return (
    <div className={styles.pageShell} data-crm-map-page>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={projectStyles.titleBlock}>
            <nav className={projectStyles.breadcrumb} aria-label="Breadcrumb">
              <span className={projectStyles.breadcrumbMuted}>CRM Reports</span>
              <span className={projectStyles.breadcrumbSep} aria-hidden>
                /
              </span>
              <span className={projectStyles.breadcrumbCurrent}>Map</span>
            </nav>
            <h1 className={projectStyles.title}>Map</h1>
          </div>
        </div>
        <div className={styles.headerSearch}>
          <ProjectSearch items={searchable} onSelect={selectEntry} />
        </div>
        <div />
      </header>

      {loading ? <p className={styles.state}>Loading map…</p> : null}
      {!loading && error ? <p className={styles.error}>{error}</p> : null}

      {!loading && !error ? (
        <div className={styles.mapLayout}>
          {selected && !isMobileLayout ? (
            <ProjectDetailsPanel
              selected={selected}
              workflowProgressInputIndex={workflowProgressInputIndex}
              isMobileLayout={false}
              onClose={() => setSelected(null)}
              onOpenProject={onOpenProject}
              onViewPhotos={onViewPhotos}
            />
          ) : null}
          <MapView
            markers={markers}
            selection={mapSelection}
            isMobileLayout={isMobileLayout}
            panelOpen={selected != null}
            onMarkerClick={onMarkerClick}
          />
          {selected && isMobileLayout ? (
            <ProjectDetailsPanel
              selected={selected}
              workflowProgressInputIndex={workflowProgressInputIndex}
              isMobileLayout
              onClose={() => setSelected(null)}
              onOpenProject={onOpenProject}
              onViewPhotos={onViewPhotos}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
