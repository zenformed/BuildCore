'use client';

import type { ReactElement } from 'react';
import { US_STATE_OPTIONS } from '@/domain/crm/usStates';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { CreateCrmProjectFormState } from '@/presentation/features/crmCreate/createCrmProjectFormModel';
import type { CrmProjectAssigneeOption } from '@/presentation/features/crmProjects/crmProjectAssigneeOptions';
import { CreateFormAssigneePicker } from '@/presentation/components/crmShared/CreateFormAssigneePicker';
import { CreateFormSelectPicker } from '@/presentation/components/crmShared/CreateFormSelectPicker';
import { IndustrySelectFields } from '@/presentation/components/crmShared/IndustrySelectFields';
import formStyles from './CreateCrmProjectDrawer.module.css';

export type CreateCrmProjectFormFieldsProps = {
  readonly form: CreateCrmProjectFormState;
  readonly saving: boolean;
  readonly assigneeOptions: readonly CrmProjectAssigneeOption[];
  readonly updateField: <K extends keyof CreateCrmProjectFormState>(
    key: K,
    value: CreateCrmProjectFormState[K]
  ) => void;
  /** Edit modal only — create flows omit notes. */
  readonly showNotes?: boolean;
};

export function CreateCrmProjectFormFields({
  form,
  saving,
  assigneeOptions,
  updateField,
  showNotes = false,
}: CreateCrmProjectFormFieldsProps): ReactElement {
  const create = content.crm.create;

  return (
    <>
      <div className={formStyles.field}>
        <label className={formStyles.label} htmlFor="crm-create-name">
          {create.fields.name} *
        </label>
        <input
          id="crm-create-name"
          className={formStyles.input}
          value={form.name}
          disabled={saving}
          onChange={(e) => updateField('name', e.target.value)}
          autoFocus
        />
      </div>

      <div className={formStyles.rowTradeDeal}>
        <div className={formStyles.fieldStack}>
          <IndustrySelectFields
            industry={form.industry}
            customIndustry={form.customIndustry}
            industryLabel={create.fields.industry}
            customIndustryLabel={create.fields.customIndustry}
            disabled={saving}
            required
            industryId="crm-create-industry"
            customIndustryId="crm-create-custom-industry"
            onIndustryChange={(industry) => updateField('industry', industry)}
            onCustomIndustryChange={(value) => updateField('customIndustry', value)}
          />
        </div>
        {assigneeOptions.length > 0 ? (
          <div className={formStyles.fieldAssigneeCompact}>
            <span className={formStyles.label}>{create.fields.assignedShort}</span>
            <CreateFormAssigneePicker
              value={form.assignedMemberId}
              options={assigneeOptions}
              disabled={saving}
              unassignedLabel={create.assigneeUnassigned}
              ariaLabel={create.fields.assignedShort}
              onChange={(memberId) => updateField('assignedMemberId', memberId)}
            />
          </div>
        ) : null}
      </div>

      <div className={formStyles.field}>
        <label className={formStyles.label} htmlFor="crm-create-contact">
          {create.fields.contactName} *
        </label>
        <input
          id="crm-create-contact"
          className={formStyles.input}
          value={form.contactName}
          disabled={saving}
          onChange={(e) => updateField('contactName', e.target.value)}
        />
      </div>

      <div className={formStyles.rowTwoCol}>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="crm-create-email">
            {create.fields.email}
          </label>
          <input
            id="crm-create-email"
            type="email"
            className={formStyles.input}
            value={form.email}
            disabled={saving}
            onChange={(e) => updateField('email', e.target.value)}
          />
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="crm-create-phone">
            {create.fields.phone}
          </label>
          <input
            id="crm-create-phone"
            type="tel"
            className={formStyles.input}
            value={form.phone}
            disabled={saving}
            onChange={(e) => updateField('phone', e.target.value)}
          />
        </div>
      </div>

      <div className={formStyles.field}>
        <label className={formStyles.label} htmlFor="crm-create-address-line-1">
          {create.fields.addressLine1}
        </label>
        <input
          id="crm-create-address-line-1"
          className={formStyles.input}
          value={form.addressLine1}
          disabled={saving}
          onChange={(e) => updateField('addressLine1', e.target.value)}
        />
      </div>

      <div className={formStyles.field}>
        <label className={formStyles.label} htmlFor="crm-create-address-line-2">
          {create.fields.addressLine2}
        </label>
        <input
          id="crm-create-address-line-2"
          className={formStyles.input}
          value={form.addressLine2}
          disabled={saving}
          onChange={(e) => updateField('addressLine2', e.target.value)}
        />
      </div>

      <div className={formStyles.rowCityStateZip}>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="crm-create-city">
            {create.fields.city}
          </label>
          <input
            id="crm-create-city"
            className={formStyles.input}
            value={form.city}
            disabled={saving}
            onChange={(e) => updateField('city', e.target.value)}
          />
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="crm-create-state">
            {create.fields.state}
          </label>
          <CreateFormSelectPicker
            id="crm-create-state"
            value={form.state}
            options={US_STATE_OPTIONS.map((state) => ({
              value: state.code,
              label: state.name,
            }))}
            placeholder="Select state"
            disabled={saving}
            ariaLabel={create.fields.state}
            onChange={(state) => updateField('state', state)}
          />
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="crm-create-postal-code">
            {create.fields.postalCode}
          </label>
          <input
            id="crm-create-postal-code"
            className={formStyles.input}
            value={form.postalCode}
            disabled={saving}
            inputMode="numeric"
            onChange={(e) => updateField('postalCode', e.target.value)}
          />
        </div>
      </div>

      {showNotes ? (
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="crm-create-notes">
            {create.fields.notes}
          </label>
          <textarea
            id="crm-create-notes"
            className={formStyles.textarea}
            value={form.notes}
            disabled={saving}
            onChange={(e) => updateField('notes', e.target.value)}
          />
        </div>
      ) : null}
    </>
  );
}
