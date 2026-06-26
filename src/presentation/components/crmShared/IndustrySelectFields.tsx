'use client';

import type { ReactElement } from 'react';
import type { CrmIndustry } from '@/domain/crm';
import { CRM_INDUSTRY_OPTIONS } from '@/presentation/features/crmProjects/crmProjectFormatters';
import formStyles from '@/presentation/components/CrmProjects/CreateCrmProjectDrawer.module.css';

export type IndustrySelectFieldsProps = {
  readonly industry: CrmIndustry;
  readonly customIndustry: string;
  readonly industryLabel: string;
  readonly customIndustryLabel: string;
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly industryId?: string;
  readonly customIndustryId?: string;
  readonly selectClassName?: string;
  readonly inputClassName?: string;
  /** When `industryOnly`, renders only the industry select (custom industry omitted). */
  readonly variant?: 'full' | 'industryOnly';
  readonly onIndustryChange: (industry: CrmIndustry) => void;
  readonly onCustomIndustryChange: (value: string) => void;
};

export function IndustrySelectFields({
  industry,
  customIndustry,
  industryLabel,
  customIndustryLabel,
  disabled = false,
  required = false,
  industryId = 'crm-industry',
  customIndustryId = 'crm-custom-industry',
  selectClassName = formStyles.select,
  inputClassName = formStyles.input,
  variant = 'full',
  onIndustryChange,
  onCustomIndustryChange,
}: IndustrySelectFieldsProps): ReactElement {
  const industrySelect = (
    <div className={formStyles.field}>
      <label className={formStyles.label} htmlFor={industryId}>
        {industryLabel}
        {required ? ' *' : null}
      </label>
      <select
        id={industryId}
        className={selectClassName}
        value={industry}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value as CrmIndustry;
          onIndustryChange(next);
          if (next !== 'other') {
            onCustomIndustryChange('');
          }
        }}
      >
        {CRM_INDUSTRY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );

  if (variant === 'industryOnly') {
    return industrySelect;
  }

  return (
    <>
      {industrySelect}
      {industry === 'other' ? (
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor={customIndustryId}>
            {customIndustryLabel} *
          </label>
          <input
            id={customIndustryId}
            className={inputClassName}
            value={customIndustry}
            disabled={disabled}
            onChange={(e) => onCustomIndustryChange(e.target.value)}
          />
        </div>
      ) : null}
    </>
  );
}
