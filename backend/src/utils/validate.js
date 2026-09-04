/**
 * Input validation for the public write endpoints.
 *
 * These endpoints previously checked presence only, so anything the column
 * could not hold reached the driver and threw — and under `STRICT_ALL_TABLES`
 * that is every over-long value. Combined with the missing async guard that
 * produced a hung request rather than a 422 (MEL2-SEC-003).
 *
 * Limits mirror the live column definitions so a value that passes here always
 * fits.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
/** Digits, spaces and the punctuation real phone numbers are written with. */
const PHONE = /^[+()\d][\d\s().-]{4,}$/;

/**
 * Collect field errors instead of failing on the first one, so a form can show
 * everything wrong at once.
 */
export class Validator {
  constructor(source = {}) {
    this.source = source || {};
    this.errors = {};
    this.values = {};
  }

  #fail(field, message) {
    if (!this.errors[field]) this.errors[field] = message;
  }

  #raw(field) {
    const value = this.source[field];
    if (value === undefined || value === null) return '';
    // An array here means a repeated form field; String() would silently join
    // it into "a,b" and store nonsense.
    if (typeof value === 'object') return null;
    return String(value).trim();
  }

  /** @param {{required?:boolean, max?:number, min?:number}} opts */
  string(field, opts = {}) {
    const { required = false, max = 255, min = 0, label = field } = opts;
    const raw = this.#raw(field);
    if (raw === null) {
      this.#fail(field, `${label} must be a single text value`);
      return this;
    }
    if (!raw) {
      if (required) this.#fail(field, `${label} is required`);
      else this.values[field] = null;
      return this;
    }
    if (raw.length < min) {
      this.#fail(field, `${label} must be at least ${min} characters`);
      return this;
    }
    if (raw.length > max) {
      this.#fail(field, `${label} must be ${max} characters or fewer`);
      return this;
    }
    this.values[field] = raw;
    return this;
  }

  email(field, opts = {}) {
    const { required = false, max = 191, label = 'Email address' } = opts;
    this.string(field, { required, max, label });
    const value = this.values[field];
    if (value && !EMAIL.test(value)) {
      this.#fail(field, `${label} is not a valid email address`);
      delete this.values[field];
    }
    return this;
  }

  phone(field, opts = {}) {
    const { required = false, max = 20, label = 'Phone number' } = opts;
    this.string(field, { required, max, label });
    const value = this.values[field];
    if (value && !PHONE.test(value)) {
      this.#fail(field, `${label} is not a valid phone number`);
      delete this.values[field];
    }
    return this;
  }

  get ok() {
    return Object.keys(this.errors).length === 0;
  }

  /** First error message — the API envelope carries one `message` field. */
  get message() {
    return Object.values(this.errors)[0] || 'Invalid input';
  }
}

export function validator(source) {
  return new Validator(source);
}

export { EMAIL as EMAIL_PATTERN, PHONE as PHONE_PATTERN };
