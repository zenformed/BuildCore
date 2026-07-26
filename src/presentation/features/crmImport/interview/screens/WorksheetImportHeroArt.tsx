'use client';

import type { ReactElement } from 'react';
import { LuBuilding2, LuSparkle } from 'react-icons/lu';
import styles from '@/presentation/components/CrmImport/SpreadsheetImportWizard.module.css';

/** Shared workbook hero illustration for worksheet import screens. */
export function WorksheetImportHeroArt(): ReactElement {
  return (
    <div className={styles.worksheetProjectsHeroArt} aria-hidden="true">
      <span className={styles.worksheetProjectsHeroGlow} />
      <div className={styles.worksheetProjectsHeroWindow}>
        <div className={styles.worksheetProjectsHeroWindowChrome}>
          <span />
          <span />
          <span />
        </div>
        <div className={styles.worksheetProjectsHeroTable}>
          <div className={styles.worksheetProjectsHeroTableHead}>
            <span />
            <span />
            <span />
            <span />
          </div>
          {Array.from({ length: 4 }, (_, row) => (
            <div key={row} className={styles.worksheetProjectsHeroTableRow}>
              <span />
              <span />
              <span />
              <span />
            </div>
          ))}
        </div>
      </div>
      <span className={styles.worksheetProjectsHeroBadge}>
        <LuBuilding2 size={18} strokeWidth={2.25} />
      </span>
      <LuSparkle className={styles.worksheetProjectsHeroSparkle1} size={15} strokeWidth={2.4} />
      <LuSparkle className={styles.worksheetProjectsHeroSparkle2} size={11} strokeWidth={2.4} />
      <LuSparkle className={styles.worksheetProjectsHeroSparkle3} size={13} strokeWidth={2.4} />
      <LuSparkle className={styles.worksheetProjectsHeroSparkle4} size={10} strokeWidth={2.4} />
      <LuSparkle className={styles.worksheetProjectsHeroSparkle5} size={12} strokeWidth={2.4} />
      <span className={styles.worksheetProjectsHeroPlus1}>+</span>
      <span className={styles.worksheetProjectsHeroPlus2}>+</span>
      <span className={styles.worksheetProjectsHeroPlus3}>+</span>
      <span className={styles.worksheetProjectsHeroDot1} />
      <span className={styles.worksheetProjectsHeroDot2} />
      <span className={styles.worksheetProjectsHeroDot3} />
      <span className={styles.worksheetProjectsHeroDot4} />
      <span className={styles.worksheetProjectsHeroDot5} />
    </div>
  );
}
