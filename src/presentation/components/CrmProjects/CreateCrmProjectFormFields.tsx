'use client';

import type { ReactElement } from 'react';
import { DEFAULT_PIPELINE_STAGES, type CrmPriority, type CrmTradeType } from '@/domain/crm';
import { US_STATE_OPTIONS } from '@/domain/crm/usStates';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CRM_TRADE_TYPE_OPTIONS } from '@/presentation/features/crmProjects/crmProjectFormatters';
import type { CreateCrmProjectFormState } from '@/presentation/features/crmCreate/createCrmProjectFormModel';
import type { CrmProjectAssigneeOption } from '@/presentation/features/crmProjects/crmProjectAssigneeOptions';
import formStyles from './CreateCrmProjectDrawer.module.css';

export type CreateCrmProjectFormFieldsProps = {
  readonly form: CreateCrmProjectFormState;
  readonly saving: boolean;
  readonly assigneeOptions: readonly CrmProjectAssigneeOption[];
  readonly updateField: <K extends keyof CreateCrmProjectFormState>(
    key: K,
    value: CreateCrmProjectFormState[K]
  ) => void;
};

export function CreateCrmProjectFormFields({
  form,
  saving,
  assigneeOptions,
  updateField,
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

      <div className={formStyles.field}>
        <label className={formStyles.label} htmlFor="crm-create-trade">
          {create.fields.tradeType} *
        </label>
        <select
          id="crm-create-trade"
          className={formStyles.select}
          value={form.tradeType}
          disabled={saving}
          onChange={(e) => updateField('tradeType', e.target.value as CrmTradeType)}
        >
          {CRM_TRADE_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
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

      <div className={formStyles.rowTwoCol}>
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
          <select
            id="crm-create-state"
            className={formStyles.select}
            value={form.state}
            disabled={saving}
            onChange={(e) => updateField('state', e.target.value)}
          >
            <option value="">Select state</option>
            {US_STATE_OPTIONS.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
          </select>
        </div>
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

      <div className={formStyles.rowTwoCol}>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="crm-create-priority">
            {create.fields.priority}
          </label>
          <select
            id="crm-create-priority"
            className={formStyles.select}
            value={form.priority}
            disabled={saving}
            onChange={(e) => updateField('priority', e.target.value as CrmPriority)}
          >
            {(['low', 'normal', 'high', 'urgent'] as const).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="crm-create-stage">
            {create.fields.stage}
          </label>
          <select
            id="crm-create-stage"
            className={formStyles.select}
            value={form.currentStageSlug}
            disabled={saving}
            onChange={(e) =>
              updateField('currentStageSlug', e.target.value as CreateCrmProjectFormState['currentStageSlug'])
            }
          >
            {DEFAULT_PIPELINE_STAGES.map((stage) => (
              <option key={stage.slug} value={stage.slug}>
                {stage.label}
              </option>
            ))}
          </select>
        </div>
      </div>

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

      <div className={assigneeOptions.length > 0 ? formStyles.rowTwoCol : formStyles.field}>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="crm-create-deal">
            {create.fields.dealValue}
          </label>
          <input
            id="crm-create-deal"
            className={formStyles.input}
            inputMode="decimal"
            placeholder="0.00"
            value={form.dealValueUsd}
            disabled={saving}
            onChange={(e) => updateField('dealValueUsd', e.target.value)}
          />
        </div>
        {assigneeOptions.length > 0 ? (
          <div className={formStyles.field}>
            <label className={formStyles.label} htmlFor="crm-create-assignee">
              {create.fields.assigned}
            </label>
            <select
              id="crm-create-assignee"
              className={formStyles.select}
              value={form.assignedMemberId}
              disabled={saving}
              onChange={(e) => updateField('assignedMemberId', e.target.value)}
            >
              {assigneeOptions.map((opt) => (
                <option
                  key={opt.id || 'unassigned'}
                  value={opt.id}
                  disabled={opt.disabled === true}
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
    </>
  );
}
