'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  validateCrmProjectCoordinateFormFields,
  type CreateCrmProjectFormState,
} from '@/presentation/features/crmCreate/createCrmProjectFormModel';
import type { CrmProjectAssigneeOption } from '@/presentation/features/crmProjects/crmProjectAssigneeOptions';
import { CreateFormAssigneePicker } from '@/presentation/components/crmShared/CreateFormAssigneePicker';
import { UsStateCombobox } from '@/presentation/components/crmShared/UsStateCombobox';
import { IndustrySelectFields } from '@/presentation/components/crmShared/IndustrySelectFields';
import {
  MAX_PROJECT_NOTES_LENGTH,
  sanitizeCityInput,
  sanitizePostalCodeInput,
  sanitizeProjectNotesInput,
} from '@/domain/crm/projectFormFieldValidation';
import {
  ContactMultiValueFields,
  CONTACT_EMAIL_FIELD_MAX,
  CONTACT_PHONE_FIELD_MAX,
} from '@/presentation/components/crmShared/ContactMultiValueFields';
import formStyles from './CreateCrmProjectDrawer.module.css';

export type CreateCrmProjectFormFieldsProps = {
  readonly form: CreateCrmProjectFormState;
  readonly saving: boolean;
  readonly assigneeOptions: readonly CrmProjectAssigneeOption[];
  /** When false, hides the assignee picker (e.g. member role). */
  readonly allowAssignee?: boolean;
  readonly showValidationErrors?: boolean;
  readonly updateField: <K extends keyof CreateCrmProjectFormState>(
    key: K,
    value: CreateCrmProjectFormState[K]
  ) => void;
};

export function CreateCrmProjectFormFields({
  form,
  saving,
  assigneeOptions,
  allowAssignee = true,
  showValidationErrors = false,
  updateField,
}: CreateCrmProjectFormFieldsProps): ReactElement {
  const create = content.crm.create;
  const showAssignee = allowAssignee && assigneeOptions.length > 0;
  const coordinateErrors = validateCrmProjectCoordinateFormFields(form);
  const latitudeError =
    showValidationErrors || form.latitude.trim().length > 0
      ? coordinateErrors.latitude
      : undefined;
  const longitudeError =
    showValidationErrors || form.longitude.trim().length > 0
      ? coordinateErrors.longitude
      : undefined;

  return (
    <>
      <div
        className={`${formStyles.rowTopFour}${showAssignee ? '' : ` ${formStyles.rowTopFourNoAssignee}`}`}
      >
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

        <IndustrySelectFields
          variant="industryOnly"
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

        <div className={formStyles.rowTopContactAssignee}>
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

          {showAssignee ? (
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
      </div>

      {form.industry === 'other' ? (
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="crm-create-custom-industry">
            {create.fields.customIndustry} *
          </label>
          <input
            id="crm-create-custom-industry"
            className={formStyles.input}
            value={form.customIndustry}
            disabled={saving}
            onChange={(e) => updateField('customIndustry', e.target.value)}
          />
        </div>
      ) : null}

      <div className={formStyles.rowContactEmailPhone}>
        <div className={formStyles.rowContactEmailCol}>
          <ContactMultiValueFields
            label={create.fields.emailAddresses}
            values={form.emails}
            inputType="email"
            disabled={saving}
            maxCount={CONTACT_EMAIL_FIELD_MAX}
            idPrefix="crm-create-email"
            addButtonLabel={create.fields.addEmail}
            addAriaLabel={create.fields.addEmail}
            removeAriaLabel={create.fields.removeEmail}
            removeConfirmCopy={create.fields.removeEmailConfirm}
            onChange={(emails) => updateField('emails', emails)}
          />
        </div>
        <div className={formStyles.rowContactPhoneCol}>
          <ContactMultiValueFields
            label={create.fields.phoneNumbers}
            values={form.phones}
            inputType="tel"
            disabled={saving}
            maxCount={CONTACT_PHONE_FIELD_MAX}
            idPrefix="crm-create-phone"
            addButtonLabel={create.fields.addPhone}
            addAriaLabel={create.fields.addPhone}
            removeAriaLabel={create.fields.removePhone}
            removeConfirmCopy={create.fields.removePhoneConfirm}
            onChange={(phones) => updateField('phones', phones)}
          />
        </div>
      </div>

      <div className={formStyles.addressSection}>
        {form.addressEntryMode === 'street' ? (
          <>
            <div className={formStyles.field}>
              <div className={formStyles.addressLabelRow}>
                <label className={formStyles.label} htmlFor="crm-create-address-line-1">
                  {create.fields.addressLine1}
                </label>
                <button
                  type="button"
                  className={formStyles.addressModeToggle}
                  disabled={saving}
                  onClick={() => updateField('addressEntryMode', 'coordinates')}
                >
                  {create.fields.useCoordinates}
                </button>
              </div>
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
                  autoComplete="address-level2"
                  onChange={(e) => updateField('city', sanitizeCityInput(e.target.value))}
                />
              </div>
              <div className={formStyles.field}>
                <label className={formStyles.label} htmlFor="crm-create-state">
                  {create.fields.state}
                </label>
                <UsStateCombobox
                  id="crm-create-state"
                  value={form.state}
                  disabled={saving}
                  ariaLabel={create.fields.state}
                  placeholder="Select state"
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
                  autoComplete="postal-code"
                  maxLength={5}
                  onChange={(e) =>
                    updateField('postalCode', sanitizePostalCodeInput(e.target.value))
                  }
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={formStyles.rowCoordinates}>
              <div className={formStyles.field}>
                <label className={formStyles.label} htmlFor="crm-create-latitude">
                  {create.fields.latitude}
                </label>
                <input
                  id="crm-create-latitude"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="-90"
                  max="90"
                  className={[
                    formStyles.input,
                    latitudeError ? formStyles.inputInvalid : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  value={form.latitude}
                  disabled={saving}
                  aria-invalid={latitudeError ? true : undefined}
                  aria-describedby={latitudeError ? 'crm-create-latitude-error' : undefined}
                  onChange={(e) => updateField('latitude', e.target.value)}
                />
                {latitudeError ? (
                  <p id="crm-create-latitude-error" className={formStyles.fieldError}>
                    {latitudeError}
                  </p>
                ) : null}
              </div>
              <div className={formStyles.field}>
                <label className={formStyles.label} htmlFor="crm-create-longitude">
                  {create.fields.longitude}
                </label>
                <input
                  id="crm-create-longitude"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="-180"
                  max="180"
                  className={[
                    formStyles.input,
                    longitudeError ? formStyles.inputInvalid : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  value={form.longitude}
                  disabled={saving}
                  aria-invalid={longitudeError ? true : undefined}
                  aria-describedby={longitudeError ? 'crm-create-longitude-error' : undefined}
                  onChange={(e) => updateField('longitude', e.target.value)}
                />
                {longitudeError ? (
                  <p id="crm-create-longitude-error" className={formStyles.fieldError}>
                    {longitudeError}
                  </p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              className={formStyles.addressModeToggle}
              disabled={saving}
              onClick={() => updateField('addressEntryMode', 'street')}
            >
              {create.fields.useStreetAddress}
            </button>
          </>
        )}
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
          maxLength={MAX_PROJECT_NOTES_LENGTH}
          onChange={(e) => updateField('notes', sanitizeProjectNotesInput(e.target.value))}
        />
      </div>
    </>
  );
}
