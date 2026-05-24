const CRM_PROJECT_DELETE_SUCCESS_TOAST_KEY = 'buildcore:crm-project-delete-success';

export function queueCrmProjectDeleteSuccessToast(message: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(CRM_PROJECT_DELETE_SUCCESS_TOAST_KEY, message);
}

export function consumeCrmProjectDeleteSuccessToast(): string | null {
  if (typeof window === 'undefined') return null;
  const message = sessionStorage.getItem(CRM_PROJECT_DELETE_SUCCESS_TOAST_KEY);
  if (message) {
    sessionStorage.removeItem(CRM_PROJECT_DELETE_SUCCESS_TOAST_KEY);
  }
  return message;
}
