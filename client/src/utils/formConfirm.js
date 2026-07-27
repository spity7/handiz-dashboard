/**
 * Standard SweetAlert copy for form submit / save actions.
 */
export const FORM_CONFIRM_ACTION = {
  CREATE: 'create',
  UPDATE: 'update',
  SAVE: 'save',
  ADD: 'add',
  DELETE: 'delete',
  ENROLL: 'enroll',
  REORDER: 'reorder',
  SUBMIT: 'submit',
  DISCARD: 'discard',
}

const PRESETS = {
  create: {
    title: (subject) => `Create ${subject}?`,
    text: (subject) => `You are about to create ${subject}.`,
    confirmLabel: 'Create',
    icon: 'question',
    variant: 'primary',
  },
  add: {
    title: (subject) => `Add ${subject}?`,
    text: (subject) => `You are about to add ${subject}.`,
    confirmLabel: 'Add',
    icon: 'question',
    variant: 'primary',
  },
  update: {
    title: () => 'Save changes?',
    text: (subject) => `You are about to update ${subject}.`,
    confirmLabel: 'Save',
    icon: 'question',
    variant: 'primary',
  },
  save: {
    title: () => 'Save changes?',
    text: (subject) => `You are about to save ${subject}.`,
    confirmLabel: 'Save',
    icon: 'question',
    variant: 'primary',
  },
  delete: {
    title: (subject) => `Delete ${subject}?`,
    text: (subject) => `This will permanently delete ${subject}.`,
    confirmLabel: 'Delete',
    icon: 'warning',
    variant: 'danger',
  },
  enroll: {
    title: () => 'Enroll student?',
    text: () => 'The selected student will be enrolled in this course.',
    confirmLabel: 'Enroll',
    icon: 'question',
    variant: 'primary',
  },
  reorder: {
    title: () => 'Save new order?',
    text: () => 'The curriculum order will be updated on the live course.',
    confirmLabel: 'Save order',
    icon: 'question',
    variant: 'primary',
  },
  submit: {
    title: () => 'Submit?',
    text: (subject) => `You are about to submit ${subject}.`,
    confirmLabel: 'Submit',
    icon: 'question',
    variant: 'primary',
  },
  discard: {
    title: () => 'Unsaved changes',
    text: () => 'You have unsaved form changes. Continue without saving?',
    confirmLabel: 'Continue',
    icon: 'warning',
    variant: 'warning',
  },
}

/**
 * @param {string} action - FORM_CONFIRM_ACTION value
 * @param {object} [options]
 * @param {string} [options.subject='this item'] - e.g. "this course", "module"
 * @param {string} [options.title]
 * @param {string} [options.text]
 * @param {string} [options.html]
 * @param {string} [options.confirmLabel]
 * @param {string} [options.cancelLabel]
 * @param {string} [options.variant]
 * @param {string} [options.icon]
 */
export function buildFormConfirmOptions(action, options = {}) {
  const subject = options.subject || 'this item'
  const preset = PRESETS[action] || PRESETS.save

  const base = {
    title: preset.title(subject),
    text: preset.text(subject),
    confirmLabel: preset.confirmLabel,
    cancelLabel: options.cancelLabel || 'Cancel',
    variant: preset.variant,
    icon: preset.icon,
  }

  const merged = {
    ...base,
    ...options,
    title: options.title ?? base.title,
    text: options.text ?? base.text,
    confirmLabel: options.confirmLabel ?? base.confirmLabel,
    variant: options.variant ?? base.variant,
    icon: options.icon ?? base.icon,
  }

  if (options.html) {
    delete merged.text
  }

  return merged
}
