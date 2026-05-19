from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REPLACEMENTS = [
    (
        "src/presentation/components/CrmProjectDetail/ProjectCostSummary.tsx",
        """      <div className={styles.cardTitleRow}>
        <h3 id="project-cost-heading" className={styles.cardTitle}>
          {p.title}
        </h3>
        <DetailPanelHeaderButton variant="download" title={p.generatePl} onClick={() => undefined} />
      </motion>""",
        """      <DetailPanelHeader title={p.title} titleId="project-cost-heading">
        <DetailPanelHeaderButton variant="download" title={p.generatePl} onClick={() => undefined} />
      </DetailPanelHeader>""",
    ),
]
