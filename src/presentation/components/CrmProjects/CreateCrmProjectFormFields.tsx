'use client';

import type { ReactElement, ReactNode } from 'react';
import {
  LuBuilding2,
  LuListChecks,
  LuMail,
  LuMapPin,
  LuPhone,
  LuStickyNote,
  LuUser,
} from 'react-icons/lu';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  validateCrmProjectCoordinateFormFields,
  type CrmProjectStreetAddressFormField,
  type CreateCrmProjectFormState,
} from '@/presentation/features/crmCreate/createCrmProjectFormModel';
import {
  GooglePlacesAddressInput,
  type GooglePlacesAddressSelection,
} from '@/presentation/components/GooglePlacesAddressInput';
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

const GOOGLE_PLACES_US_REGIONS = ['us'] as const;

export type CreateCrmProjectFormFieldsProps = {
  readonly form: CreateCrmProjectFormState;
  readonly saving: boolean;
  readonly assigneeOptions: readonly CrmProjectAssigneeOption[];
  /** When false, hides the assignee picker (e.g. member role). */
  readonly allowAssignee?: boolean;
  readonly showValidationErrors?: boolean;
  readonly onStreetAddressFieldChange: (
    field: CrmProjectStreetAddressFormField,
    value: string
  ) => void;
  readonly onVerifiedAddressSelected: (address: GooglePlacesAddressSelection) => void;
  readonly updateField: <K extends keyof CreateCrmProjectFormState>(
    key: K,
    value: CreateCrmProjectFormState[K]
  ) => void;
};

type CreateProjectFormSectionProps = {
  readonly title: string;
  readonly icon?: ReactNode;
  readonly open?: boolean;
  readonly children: ReactNode;
};

export function CreateProjectFormSection({
  title,
  icon,
  open = false,
  children,
}: CreateProjectFormSectionProps): ReactElement {
  return (
    <details className={formStyles.createProjectSection} open={open}>
      <summary className={formStyles.createProjectSectionSummary}>
        {icon != null ? <span className={formStyles.createProjectSectionIcon} aria-hidden>{icon}</span> : null}
        <span>
          <span className={formStyles.createProjectSectionTitle}>{title}</span>
        </span>
      </summary>
      <div className={formStyles.createProjectSectionBody}>{children}</div>
    </details>
  );
}

export function CreateCrmProjectFormFields({
  form,
  saving,
  assigneeOptions,
  allowAssignee = true,
  showValidationErrors = false,
  onStreetAddressFieldChange,
  onVerifiedAddressSelected,
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
  const labelWithIcon = (
    label: string,
    icon: ReactNode,
    required: boolean = false
  ): ReactNode => (
    <span className={formStyles.labelWithIcon}>
      <span className={formStyles.labelIcon} aria-hidden>
        {icon}
      </span>
      <span>
        {label}
        {required ? ' *' : null}
      </span>
    </span>
  );

  return (
    <>
      <CreateProjectFormSection
        title="Project details"
        icon={<LuBuilding2 />}
        open
      >
      <div
        className={`${formStyles.rowTopFour}${showAssignee ? '' : ` ${formStyles.rowTopFourNoAssignee}`}`}
      >
        <div className={`${formStyles.field} ${formStyles.outlinedField}`}>
          <label className={formStyles.label} htmlFor="crm-create-name">
            {labelWithIcon(create.fields.name, <LuBuilding2 />, true)}
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
          industryLabel={labelWithIcon(create.fields.industry, <LuListChecks />)}
          customIndustryLabel={create.fields.customIndustry}
          disabled={saving}
          required
          industryId="crm-create-industry"
          customIndustryId="crm-create-custom-industry"
          fieldClassName={`${formStyles.field} ${formStyles.outlinedField}`}
          onIndustryChange={(industry) => updateField('industry', industry)}
          onCustomIndustryChange={(value) => updateField('customIndustry', value)}
        />

        <div className={formStyles.rowTopContactAssignee}>
          <div className={`${formStyles.field} ${formStyles.outlinedField}`}>
            <label className={formStyles.label} htmlFor="crm-create-contact">
              {labelWithIcon(create.fields.contactName, <LuUser />, true)}
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
        <div className={`${formStyles.field} ${formStyles.outlinedField}`}>
          <label className={formStyles.label} htmlFor="crm-create-custom-industry">
            {labelWithIcon(create.fields.customIndustry, <LuListChecks />, true)}
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
      </CreateProjectFormSection>

      <CreateProjectFormSection
        title="Contact details"
        icon={<LuMail />}
        open
      >
      <div className={formStyles.rowContactEmailPhone}>
        <div className={formStyles.rowContactEmailCol}>
          <ContactMultiValueFields
            label={labelWithIcon(create.fields.emailAddresses, <LuMail />)}
            values={form.emails}
            inputType="email"
            disabled={saving}
            maxCount={CONTACT_EMAIL_FIELD_MAX}
            idPrefix="crm-create-email"
            addButtonLabel={create.fields.addEmail}
            addAriaLabel={create.fields.addEmail}
            removeAriaLabel={create.fields.removeEmail}
            removeConfirmCopy={create.fields.removeEmailConfirm}
            className={formStyles.outlinedField}
            onChange={(emails) => updateField('emails', emails)}
          />
        </div>
        <div className={formStyles.rowContactPhoneCol}>
          <ContactMultiValueFields
            label={labelWithIcon(create.fields.phoneNumbers, <LuPhone />)}
            values={form.phones}
            inputType="tel"
            disabled={saving}
            maxCount={CONTACT_PHONE_FIELD_MAX}
            idPrefix="crm-create-phone"
            addButtonLabel={create.fields.addPhone}
            addAriaLabel={create.fields.addPhone}
            removeAriaLabel={create.fields.removePhone}
            removeConfirmCopy={create.fields.removePhoneConfirm}
            className={formStyles.outlinedField}
            onChange={(phones) => updateField('phones', phones)}
          />
        </div>
      </div>
      </CreateProjectFormSection>

      <CreateProjectFormSection
        title="Address"
        icon={<LuMapPin />}
        open
      >
      <div className={formStyles.addressSection}>
        {form.addressEntryMode === 'street' ? (
          <>
            <div className={`${formStyles.field} ${formStyles.outlinedField}`}>
              <div className={formStyles.addressLabelRow}>
                <label className={formStyles.label} htmlFor="crm-create-address-line-1">
                  {labelWithIcon(create.fields.addressLine1, <LuMapPin />)}
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
              <GooglePlacesAddressInput
                id="crm-create-address-line-1"
                className={formStyles.input}
                value={form.addressLine1}
                disabled={saving}
                includedRegionCodes={GOOGLE_PLACES_US_REGIONS}
                onChange={(value) => onStreetAddressFieldChange('addressLine1', value)}
                onAddressSelected={onVerifiedAddressSelected}
              />
            </div>

            <div className={`${formStyles.field} ${formStyles.outlinedField}`}>
              <label className={formStyles.label} htmlFor="crm-create-address-line-2">
                {labelWithIcon(create.fields.addressLine2, <LuMapPin />)}
              </label>
              <input
                id="crm-create-address-line-2"
                className={formStyles.input}
                value={form.addressLine2}
                disabled={saving}
                onChange={(e) =>
                  onStreetAddressFieldChange('addressLine2', e.target.value)
                }
              />
            </div>

            <div className={formStyles.rowCityStateZip}>
              <div className={`${formStyles.field} ${formStyles.outlinedField}`}>
                <label className={formStyles.label} htmlFor="crm-create-city">
                  {labelWithIcon(create.fields.city, <LuMapPin />)}
                </label>
                <input
                  id="crm-create-city"
                  className={formStyles.input}
                  value={form.city}
                  disabled={saving}
                  autoComplete="address-level2"
                  onChange={(e) =>
                    onStreetAddressFieldChange('city', sanitizeCityInput(e.target.value))
                  }
                />
              </div>
              <div className={`${formStyles.field} ${formStyles.outlinedField}`}>
                <label className={formStyles.label} htmlFor="crm-create-state">
                  {labelWithIcon(create.fields.state, <LuMapPin />)}
                </label>
                <UsStateCombobox
                  id="crm-create-state"
                  value={form.state}
                  disabled={saving}
                  ariaLabel={create.fields.state}
                  placeholder="Select state"
                  onChange={(state) => onStreetAddressFieldChange('state', state)}
                />
              </div>
              <div className={`${formStyles.field} ${formStyles.outlinedField}`}>
                <label className={formStyles.label} htmlFor="crm-create-postal-code">
                  {labelWithIcon(create.fields.postalCode, <LuMapPin />)}
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
                    onStreetAddressFieldChange(
                      'postalCode',
                      sanitizePostalCodeInput(e.target.value)
                    )
                  }
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={formStyles.rowCoordinates}>
              <div className={`${formStyles.field} ${formStyles.outlinedField}`}>
                <label className={formStyles.label} htmlFor="crm-create-latitude">
                  {labelWithIcon(create.fields.latitude, <LuMapPin />)}
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
              <div className={`${formStyles.field} ${formStyles.outlinedField}`}>
                <label className={formStyles.label} htmlFor="crm-create-longitude">
                  {labelWithIcon(create.fields.longitude, <LuMapPin />)}
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
      </CreateProjectFormSection>

      <CreateProjectFormSection
        title="Notes"
        icon={<LuStickyNote />}
      >
      <div className={`${formStyles.field} ${formStyles.outlinedField}`}>
        <label className={formStyles.label} htmlFor="crm-create-notes">
          {labelWithIcon(create.fields.notes, <LuStickyNote />)}
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
      </CreateProjectFormSection>
    </>
  );
}
