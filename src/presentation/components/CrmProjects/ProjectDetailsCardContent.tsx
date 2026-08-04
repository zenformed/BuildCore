'use client';

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import {
  LuClipboardList,
  LuBuilding2,
  LuGitBranch,
  LuListChecks,
  LuMail,
  LuMapPin,
  LuPhone,
  LuStickyNote,
  LuUser,
} from 'react-icons/lu';
import type { CrmIndustry, CrmTeamMemberRef } from '@/domain/crm';
import type { CrmProjectPreview } from '@/domain/crm/projectPreview';
import {
  projectPrimaryPhotoCircleColor,
  projectPrimaryPhotoInitials,
} from '@/domain/crm/projectPrimaryPhoto';
import type { ProjectCustomFieldDefinition } from '@/domain/buildcore/projectCustomFields';
import type { ProjectPaymentFinancials } from '@/domain/crm/projectPaymentValue';
import { formatCrmProjectLocationLine } from '@/domain/crm/projectAddress';
import { INDUSTRY_LABELS } from '@/domain/crm';
import { nonEmptyContactValues } from '@/domain/crm/contactMultiValue';
import { isProjectPriorityUrgent } from '@/domain/crm/projectPriorityToggle';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  CRM_INDUSTRY_OPTIONS,
  formatCentsAsUsd,
  formatContactEmailDisplay,
  formatPhoneDisplay,
  getProjectIndustryDisplayLabel,
} from '@/presentation/features/crmProjects/crmProjectFormatters';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import type { SummaryEditableField } from '@/presentation/features/crmProjectDetail/projectDetailFormModel';
import {
  buildProjectPrimaryPhotoApiPath,
  useProjectPrimaryPhotoBlob,
} from '@/presentation/features/crmProjectDetail/useProjectPrimaryPhotoBlob';
import { ProjectHeaderAssignee } from '../CrmProjectDetail/ProjectHeaderAssignee';
import { TeamMemberAvatar } from '../CrmProjectDetail/TeamMemberAvatar';
import { CrmProjectPriorityIcon } from '../crmShared/CrmProjectPriorityIcon';
import cardStyles from '../CrmProjectDetail/WorkflowTaskPreviewCard.module.css';
import shared from '../crmShared/crmShared.module.css';
import {
  PreviewMetaColumn,
  PreviewMetaCustomFieldValue,
  PreviewMetaInlineField,
  PreviewMetaNotesField,
  StackedMetaList,
  formatMetaList,
  previewCustomFieldValueTitle,
  truncatePreviewCustomFieldValue,
} from './projectDetailsPreviewShared';

export type ProjectDetailsEditContext = {
  readonly readOnly: boolean;
  readonly memberView: boolean;
  readonly isApiSource: boolean;
  readonly savingField: SummaryEditableField | null;
  readonly customFieldSavingKey: string | null;
  readonly patchField: (field: SummaryEditableField, value: string) => Promise<boolean>;
  readonly patchIndustry: (industry: CrmIndustry, customIndustry: string) => Promise<boolean>;
  readonly patchCustomFieldValue: (fieldKey: string, value: string) => Promise<boolean>;
};

export type ProjectDetailsCardContentProps = {
  readonly preview: CrmProjectPreview;
  readonly customFieldDefinitions: readonly ProjectCustomFieldDefinition[];
  readonly financials?: ProjectPaymentFinancials | null;
  readonly stageLabel?: string | null;
  readonly progressPercent?: number | null;
  readonly mode: 'preview' | 'full' | 'map';
  readonly edit?: ProjectDetailsEditContext | null;
};

function resolveFinancials(
  summary: CrmProjectPreview['summary'],
  financials: ProjectPaymentFinancials | null | undefined
): ProjectPaymentFinancials {
  if (financials != null) return financials;
  const valueCents = summary.dealValueCents;
  const balanceCents = summary.balanceRemainingCents;
  return {
    valueCents,
    collectedCents: Math.max(0, valueCents - balanceCents),
    balanceCents,
  };
}

function MultilineMetaValue({ text }: { readonly text: string }): ReactElement {
  return <span className={cardStyles.metaValueMultiline}>{text}</span>;
}

function MobilePreviewMetaItem({
  label,
  icon,
  value,
}: {
  readonly label: ReactElement | string;
  readonly icon: ReactElement;
  readonly value: ReactElement | string;
}): ReactElement {
  return (
    <div className={cardStyles.previewMobileListItem}>
      <div className={cardStyles.previewMobileListLabel}>{label}</div>
      <div className={cardStyles.previewMobileListValueRow}>
        <span className={cardStyles.previewMobileListValueIcon} aria-hidden>
          {icon}
        </span>
        <div className={cardStyles.previewMobileListValueContent}>{value}</div>
      </div>
    </div>
  );
}

function truncatePreviewProjectName(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 25) return trimmed;
  return `${trimmed.slice(0, 25)}...`;
}

function ProjectDetailsMetaAssignee({
  assignedTo,
  isApiSource,
  isSaving,
  editable,
  onAssigneeChange,
}: {
  readonly assignedTo: CrmTeamMemberRef | null;
  readonly isApiSource: boolean;
  readonly isSaving: boolean;
  readonly editable: boolean;
  readonly onAssigneeChange?: (assignedMemberId: string) => Promise<boolean>;
}): ReactElement {
  const wf = content.projectDetail.workflow;

  if (editable && onAssigneeChange != null) {
    return (
      <div className={cardStyles.previewMetaAssigneeValue}>
        <ProjectHeaderAssignee
          assignedTo={assignedTo}
          isApiSource={isApiSource}
          isSaving={isSaving}
          onAssigneeChange={onAssigneeChange}
        />
      </div>
    );
  }

  return (
    <div className={cardStyles.previewMetaAssigneeValue}>
      {assignedTo ? (
        <TeamMemberAvatar member={assignedTo} />
      ) : (
        <span
          className={`${shared.avatar} ${shared.avatarUnassigned}`}
          aria-label={wf.unassigned}
          title={content.projectDetail.unassigned}
        >
          —
        </span>
      )}
    </div>
  );
}

function ProjectDetailsMetaIndustry({
  industry,
  customIndustry,
  isSaving,
  readOnly,
  onIndustryChange,
}: {
  readonly industry: CrmIndustry;
  readonly customIndustry: string | null;
  readonly isSaving: boolean;
  readonly readOnly: boolean;
  readonly onIndustryChange: (industry: CrmIndustry, customIndustry: string) => Promise<boolean>;
}): ReactElement {
  const fields = content.projectDetail.edit.fields;
  const displayLabel = getProjectIndustryDisplayLabel(industry, customIndustry);
  const [editing, setEditing] = useState(false);
  const [draftIndustry, setDraftIndustry] = useState(industry);
  const [draftCustomIndustry, setDraftCustomIndustry] = useState(customIndustry ?? '');
  const selectRef = useRef<HTMLSelectElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) {
      setDraftIndustry(industry);
      setDraftCustomIndustry(customIndustry ?? '');
    }
  }, [customIndustry, editing, industry]);

  useEffect(() => {
    if (editing) selectRef.current?.focus();
  }, [editing]);

  const commitChange = useCallback(
    async (nextIndustry: CrmIndustry, nextCustomIndustry: string) => {
      const normalizedCustom = nextIndustry === 'other' ? nextCustomIndustry.trim() : '';
      if (nextIndustry === industry && normalizedCustom === (customIndustry ?? '').trim()) {
        setEditing(false);
        return;
      }
      const ok = await onIndustryChange(nextIndustry, normalizedCustom);
      if (ok) setEditing(false);
    },
    [customIndustry, industry, onIndustryChange]
  );

  if (readOnly) {
    return <>{displayLabel}</>;
  }

  if (editing) {
    return (
      <div className={cardStyles.previewMetaEditStack}>
        <select
          ref={selectRef}
          className={cardStyles.previewMetaEditSelect}
          value={draftIndustry}
          disabled={isSaving}
          aria-label={fields.industry}
          onChange={(event) => {
            const nextIndustry = event.target.value as CrmIndustry;
            setDraftIndustry(nextIndustry);
            if (nextIndustry !== 'other') {
              setDraftCustomIndustry('');
              void commitChange(nextIndustry, '');
              return;
            }
            setDraftCustomIndustry('');
            customInputRef.current?.focus();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setEditing(false);
            }
          }}
        >
          {CRM_INDUSTRY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {draftIndustry === 'other' ? (
          <input
            ref={customInputRef}
            className={cardStyles.previewMetaEditInput}
            value={draftCustomIndustry}
            disabled={isSaving}
            aria-label={fields.customIndustry}
            placeholder={fields.customIndustry}
            onChange={(event) => setDraftCustomIndustry(event.target.value)}
            onBlur={() => {
              if (draftCustomIndustry.trim()) {
                void commitChange('other', draftCustomIndustry);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                if (draftCustomIndustry.trim()) {
                  void commitChange('other', draftCustomIndustry);
                }
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                setEditing(false);
              }
            }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cardStyles.previewMetaClickable}
      disabled={isSaving}
      onClick={() => setEditing(true)}
    >
      {displayLabel}
    </button>
  );
}

export function ProjectDetailsCardContent({
  preview,
  customFieldDefinitions,
  financials,
  stageLabel,
  progressPercent,
  mode,
  edit = null,
}: ProjectDetailsCardContentProps): ReactElement {
  const isMobileLayout = useDashboardMobileLayout();
  const previewCopy = content.crm.projectPreview;
  const fields = content.projectDetail.fields;
  const emptyValue = content.crm.projectCustomFields.emptyValue;
  const { summary } = preview;
  const projectPhotoApiPath = buildProjectPrimaryPhotoApiPath(summary.slug, summary.primaryPhotoPath);
  const projectPhotoUrl = useProjectPrimaryPhotoBlob(projectPhotoApiPath);
  const projectPhotoLabel = summary.parentProjectId != null ? summary.name : summary.client.name;
  const projectPhotoInitials = projectPrimaryPhotoInitials({
    parentProjectId: summary.parentProjectId,
    projectName: summary.name,
    clientName: summary.client.name,
  });
  const notesText = preview.notes?.trim() ?? '';
  const editable = mode === 'full' && edit != null && !edit.readOnly;

  const assignedDisplay =
    summary.assignedTo?.displayName?.trim() || content.projectDetail.unassigned;
  const addressDisplay = formatCrmProjectLocationLine(
    summary.address,
    summary.latitude,
    summary.longitude
  );
  const industryDisplay =
    summary.industry === 'other'
      ? summary.customIndustry?.trim() || INDUSTRY_LABELS.other
      : INDUSTRY_LABELS[summary.industry];
  const emails = nonEmptyContactValues(summary.contact.emails).map((email) =>
    formatContactEmailDisplay(email, { maskForMember: edit?.memberView })
  );
  const phones = nonEmptyContactValues(summary.contact.phones).map((phone) =>
    formatPhoneDisplay(phone)
  );
  const paymentFinancials = resolveFinancials(summary, financials);
  const progressDisplay =
    progressPercent != null ? `${Math.round(progressPercent)}%` : emptyValue;
  const previewProjectName = truncatePreviewProjectName(summary.name || emptyValue);
  const projectNameValue = isProjectPriorityUrgent(summary.priority) ? (
    <span className={cardStyles.previewProjectNameWithPriority}>
      <CrmProjectPriorityIcon ariaLabel={content.crm.table.priorityMarkAriaLabel} />
      <span>{previewProjectName}</span>
    </span>
  ) : (
    previewProjectName
  );

  const patchField = useCallback(
    async (field: SummaryEditableField, value: string) => {
      if (edit == null) return;
      await edit.patchField(field, value);
    },
    [edit]
  );

  if (mode === 'full') {
    const labelPosition = 'above' as const;

    return (
      <div className={cardStyles.previewBody}>
        <section className={cardStyles.previewSection} aria-label={previewCopy.sections.overview}>
          <div className={cardStyles.metaRow}>
            <PreviewMetaColumn
              label={content.projectDetail.fullDetails.labels.project}
              labelPosition={labelPosition}
              value={
                editable ? (
                  <PreviewMetaInlineField
                    label={content.projectDetail.fullDetails.labels.project}
                    value={summary.name}
                    isSaving={edit?.savingField === 'name'}
                    onSave={(next) => patchField('name', next)}
                  />
                ) : (
                  summary.name || emptyValue
                )
              }
            />
            <PreviewMetaColumn
              label={previewCopy.labels.industry}
              labelPosition={labelPosition}
              align="center"
              value={
                editable && edit != null ? (
                  <ProjectDetailsMetaIndustry
                    industry={summary.industry}
                    customIndustry={summary.customIndustry}
                    isSaving={edit.savingField === 'industry' || edit.savingField === 'customIndustry'}
                    readOnly={false}
                    onIndustryChange={edit.patchIndustry}
                  />
                ) : (
                  industryDisplay
                )
              }
            />
            <PreviewMetaColumn
              label={previewCopy.labels.assigned}
              labelPosition={labelPosition}
              align="end"
              value={
                <ProjectDetailsMetaAssignee
                  assignedTo={summary.assignedTo}
                  isApiSource={edit?.isApiSource ?? false}
                  isSaving={edit?.savingField === 'assignedMemberId'}
                  editable={editable && edit != null}
                  onAssigneeChange={
                    edit != null
                      ? (id) => edit.patchField('assignedMemberId', id)
                      : undefined
                  }
                />
              }
            />
          </div>
          <div className={`${cardStyles.metaRow} ${cardStyles.metaRow_spaced}`}>
            <PreviewMetaColumn
              label={previewCopy.labels.contact}
              labelPosition={labelPosition}
              value={
                editable ? (
                  <PreviewMetaInlineField
                    label={previewCopy.labels.contact}
                    value={summary.contact.name}
                    isSaving={edit?.savingField === 'contactName'}
                    onSave={(next) => patchField('contactName', next)}
                  />
                ) : (
                  summary.contact.name || emptyValue
                )
              }
            />
            <PreviewMetaColumn
              label={previewCopy.labels.address}
              labelPosition={labelPosition}
              value={addressDisplay || emptyValue}
            />
            <PreviewMetaColumn
              label={content.projectDetail.fullDetails.labels.phones}
              labelPosition={labelPosition}
              value={<MultilineMetaValue text={formatMetaList(phones, emptyValue)} />}
            />
            <PreviewMetaColumn
              label={content.projectDetail.fullDetails.labels.emails}
              labelPosition={labelPosition}
              value={<MultilineMetaValue text={formatMetaList(emails, emptyValue)} />}
            />
          </div>
          <div className={`${cardStyles.metaRow} ${cardStyles.metaRow_spaced}`}>
            <PreviewMetaColumn
              label={fields.value}
              labelPosition={labelPosition}
              value={formatCentsAsUsd(paymentFinancials.valueCents)}
            />
            <PreviewMetaColumn
              label={fields.collected}
              labelPosition={labelPosition}
              align="center"
              value={formatCentsAsUsd(paymentFinancials.collectedCents)}
            />
            <PreviewMetaColumn
              label={fields.balance}
              labelPosition={labelPosition}
              align="end"
              value={formatCentsAsUsd(paymentFinancials.balanceCents)}
            />
          </div>
        </section>

        {editable || notesText ? (
          <section className={cardStyles.previewSection} aria-label={previewCopy.sections.notes}>
            <h4 className={cardStyles.previewSectionHeading}>{previewCopy.labels.notes}</h4>
            {editable ? (
              <PreviewMetaNotesField
                label={previewCopy.labels.notes}
                value={preview.notes ?? ''}
                isSaving={edit?.savingField === 'notes'}
                onSave={(next) => patchField('notes', next)}
              />
            ) : notesText ? (
              <p className={`${cardStyles.metaValue} ${cardStyles.previewNotes}`}>{notesText}</p>
            ) : null}
          </section>
        ) : null}

        {customFieldDefinitions.length > 0 ? (
          <section
            className={cardStyles.previewSection}
            aria-label={previewCopy.sections.customFields}
          >
            <h4 className={cardStyles.previewCustomFieldsHeading}>
              {previewCopy.sections.customFields}
            </h4>
            <dl className={cardStyles.customFieldList}>
              {customFieldDefinitions.map((definition) => {
                const raw = summary.customFields?.[definition.fieldKey];
                const value =
                  raw != null && raw.trim().length > 0 ? raw.trim() : emptyValue;
                const displayValue =
                  value === emptyValue ? value : truncatePreviewCustomFieldValue(value);
                const valueTitle = previewCustomFieldValueTitle(value, emptyValue);
                const rawValue = raw ?? '';
                return (
                  <div key={definition.fieldKey} className={cardStyles.customFieldRow}>
                    <dt className={cardStyles.customFieldLabel}>{definition.label}</dt>
                    <dd
                      className={[
                        cardStyles.customFieldValue,
                        value === emptyValue ? cardStyles.customFieldValue_muted : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      title={editable ? undefined : valueTitle}
                    >
                      {editable && edit != null ? (
                        <PreviewMetaCustomFieldValue
                          label={definition.label}
                          value={rawValue}
                          emptyValue={emptyValue}
                          isSaving={edit.customFieldSavingKey === definition.fieldKey}
                          onSave={async (next) => {
                            await edit.patchCustomFieldValue(definition.fieldKey, next);
                          }}
                        />
                      ) : (
                        displayValue
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ) : null}
      </div>
    );
  }

  if (mode === 'map') {
    const labelPosition = 'above' as const;

    return (
      <div className={cardStyles.previewBody}>
        <section className={cardStyles.previewSection} aria-label={previewCopy.sections.overview}>
          <div className={cardStyles.previewMetaRow}>
            <PreviewMetaColumn
              label={previewCopy.labels.contact}
              labelPosition={labelPosition}
            leadingIcon={<LuUser />}
              value={summary.contact.name || emptyValue}
            />
          </div>
          <div className={`${cardStyles.previewMetaRow} ${cardStyles.previewMetaRow_spaced}`}>
            <PreviewMetaColumn
              label={previewCopy.labels.email}
              labelPosition={labelPosition}
            leadingIcon={<LuMail />}
              value={<StackedMetaList values={emails} emptyValue={emptyValue} />}
            />
          </div>
          <div className={`${cardStyles.previewMetaRow} ${cardStyles.previewMetaRow_spaced}`}>
            <PreviewMetaColumn
              label={previewCopy.labels.phone}
              labelPosition={labelPosition}
            leadingIcon={<LuPhone />}
              value={<StackedMetaList values={phones} emptyValue={emptyValue} />}
            />
          </div>
          <div
            className={`${cardStyles.previewMetaRow} ${cardStyles.previewMetaRow_spaced} ${cardStyles.mapNotesRow}`}
          >
            <PreviewMetaColumn
              label={previewCopy.labels.notes}
              labelPosition={labelPosition}
            leadingIcon={<LuStickyNote />}
              value={notesText || emptyValue}
            />
          </div>
        </section>
      </div>
    );
  }

  const previewLabelPosition = 'above' as const;
  const isSubproject = summary.parentProjectId != null;
  const projectKindLabel = isSubproject ? previewCopy.kindSubproject : previewCopy.kindProject;
  const stageDisplay = stageLabel?.trim() || summary.currentStageSlug || emptyValue;

  if (isMobileLayout) {
    return (
      <div className={cardStyles.previewBody}>
        <section className={cardStyles.previewMobileHeroSection} aria-label={projectKindLabel}>
          <div className={cardStyles.previewMobileHeroMedia}>
            {projectPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={projectPhotoUrl} alt="" className={cardStyles.previewMobileHeroImage} />
            ) : (
              <span
                className={cardStyles.previewMobileHeroInitials}
                style={{ backgroundColor: projectPrimaryPhotoCircleColor(projectPhotoLabel) }}
                aria-hidden
              >
                {projectPhotoInitials}
              </span>
            )}
          </div>
          <h3 className={cardStyles.previewMobileHeroTitle}>{projectNameValue}</h3>
        </section>
        <section className={cardStyles.previewSection} aria-label={previewCopy.sections.overview}>
          <div className={cardStyles.previewMobileList}>
            <MobilePreviewMetaItem
              label={previewCopy.labels.industry}
              icon={<LuClipboardList />}
              value={industryDisplay}
            />
            <MobilePreviewMetaItem
              label={previewCopy.labels.assigned}
              icon={<LuUser />}
              value={assignedDisplay}
            />
            <MobilePreviewMetaItem
              label={previewCopy.labels.contact}
              icon={<LuUser />}
              value={summary.contact.name || emptyValue}
            />
            <MobilePreviewMetaItem
              label={previewCopy.labels.email}
              icon={<LuMail />}
              value={<StackedMetaList values={emails} emptyValue={emptyValue} />}
            />
            <MobilePreviewMetaItem
              label={previewCopy.labels.phone}
              icon={<LuPhone />}
              value={<StackedMetaList values={phones} emptyValue={emptyValue} />}
            />
            <MobilePreviewMetaItem
              label={previewCopy.labels.address}
              icon={<LuMapPin />}
              value={addressDisplay ? <MultilineMetaValue text={addressDisplay} /> : emptyValue}
            />
            <MobilePreviewMetaItem
              label={previewCopy.labels.stage}
              icon={<LuGitBranch />}
              value={stageDisplay}
            />
            <MobilePreviewMetaItem
              label={previewCopy.labels.progress}
              icon={<LuListChecks />}
              value={progressDisplay}
            />
          </div>
        </section>

        {notesText ? (
          <section className={cardStyles.previewSection} aria-label={previewCopy.sections.notes}>
            <div className={cardStyles.previewMobileList}>
              <MobilePreviewMetaItem
                label={previewCopy.labels.notes}
                icon={<LuStickyNote />}
                value={<span className={cardStyles.previewNotes}>{notesText}</span>}
              />
            </div>
          </section>
        ) : null}

        {customFieldDefinitions.length > 0 ? (
          <section className={cardStyles.previewSection} aria-label={previewCopy.sections.customFields}>
            <h4 className={cardStyles.previewCustomFieldsHeading}>{previewCopy.sections.customFields}</h4>
            <dl className={cardStyles.customFieldList}>
              {customFieldDefinitions.map((definition) => {
                const raw = summary.customFields?.[definition.fieldKey];
                const value = raw != null && raw.trim().length > 0 ? raw.trim() : emptyValue;
                const displayValue =
                  value === emptyValue ? value : truncatePreviewCustomFieldValue(value);
                const valueTitle = previewCustomFieldValueTitle(value, emptyValue);
                return (
                  <div key={definition.fieldKey} className={cardStyles.customFieldRow}>
                    <dt className={cardStyles.customFieldLabel}>{definition.label}</dt>
                    <dd
                      className={[
                        cardStyles.customFieldValue,
                        value === emptyValue ? cardStyles.customFieldValue_muted : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      title={valueTitle}
                    >
                      {displayValue}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cardStyles.previewBody}>
      <section className={cardStyles.previewSection} aria-label={previewCopy.sections.overview}>
        <div className={cardStyles.previewMetaRow}>
          <PreviewMetaColumn
            label={projectKindLabel}
            labelPosition={previewLabelPosition}
            leadingIcon={<LuBuilding2 />}
              value={projectNameValue}
          />
          <PreviewMetaColumn
            label={previewCopy.labels.industry}
            labelPosition={previewLabelPosition}
            align="center"
            leadingIcon={<LuClipboardList />}
            value={industryDisplay}
          />
          <PreviewMetaColumn
            label={previewCopy.labels.assigned}
            labelPosition={previewLabelPosition}
            align="end"
            leadingIcon={<LuUser />}
            value={assignedDisplay}
          />
        </div>
        <div className={`${cardStyles.previewMetaRow} ${cardStyles.previewMetaRow_spaced}`}>
          <PreviewMetaColumn
            label={previewCopy.labels.contact}
            labelPosition={previewLabelPosition}
            leadingIcon={<LuUser />}
            value={summary.contact.name || emptyValue}
          />
          <PreviewMetaColumn
            label={previewCopy.labels.email}
            labelPosition={previewLabelPosition}
            align="center"
            leadingIcon={<LuMail />}
            value={<StackedMetaList values={emails} emptyValue={emptyValue} />}
          />
          <PreviewMetaColumn
            label={previewCopy.labels.phone}
            labelPosition={previewLabelPosition}
            align="end"
            leadingIcon={<LuPhone />}
            value={<StackedMetaList values={phones} emptyValue={emptyValue} />}
          />
        </div>
        <div className={`${cardStyles.previewMetaRow} ${cardStyles.previewMetaRow_spaced}`}>
          <PreviewMetaColumn
            label={previewCopy.labels.address}
            labelPosition={previewLabelPosition}
            leadingIcon={<LuMapPin />}
            value={
              addressDisplay ? <MultilineMetaValue text={addressDisplay} /> : emptyValue
            }
          />
        </div>
        <div className={`${cardStyles.previewMetaRow} ${cardStyles.previewMetaRow_spaced}`}>
          <PreviewMetaColumn
            label={previewCopy.labels.stage}
            labelPosition={previewLabelPosition}
            leadingIcon={<LuGitBranch />}
            value={stageDisplay}
          />
          <div className={cardStyles.metaColumn_spacer} aria-hidden />
          <PreviewMetaColumn
            label={previewCopy.labels.progress}
            labelPosition={previewLabelPosition}
            align="end"
            leadingIcon={<LuListChecks />}
            value={progressDisplay}
          />
        </div>
      </section>

      {notesText ? (
        <section className={cardStyles.previewSection} aria-label={previewCopy.sections.notes}>
          <div className={cardStyles.previewMetaRow}>
            <PreviewMetaColumn
              label={previewCopy.labels.notes}
              labelPosition={previewLabelPosition}
              leadingIcon={<LuStickyNote />}
              value={<span className={cardStyles.previewNotes}>{notesText}</span>}
            />
          </div>
        </section>
      ) : null}

      {customFieldDefinitions.length > 0 ? (
        <section
          className={cardStyles.previewSection}
          aria-label={previewCopy.sections.customFields}
        >
          <h4 className={cardStyles.previewCustomFieldsHeading}>
            {previewCopy.sections.customFields}
          </h4>
          <dl className={cardStyles.customFieldList}>
            {customFieldDefinitions.map((definition) => {
              const raw = summary.customFields?.[definition.fieldKey];
              const value = raw != null && raw.trim().length > 0 ? raw.trim() : emptyValue;
              const displayValue =
                value === emptyValue ? value : truncatePreviewCustomFieldValue(value);
              const valueTitle = previewCustomFieldValueTitle(value, emptyValue);
              return (
                <div key={definition.fieldKey} className={cardStyles.customFieldRow}>
                  <dt className={cardStyles.customFieldLabel}>{definition.label}</dt>
                  <dd
                    className={[
                      cardStyles.customFieldValue,
                      value === emptyValue ? cardStyles.customFieldValue_muted : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    title={valueTitle}
                  >
                    {displayValue}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      ) : null}
    </div>
  );
}
