import test from 'node:test';
import assert from 'node:assert/strict';
import { validator } from '../src/utils/validate.js';

/**
 * The public forms checked presence only, so any value the column could not
 * hold reached the driver and threw — and under `STRICT_ALL_TABLES` that is
 * every over-long value. Combined with the missing async guard, the request
 * hung instead of answering 422 (MEL2-SEC-003).
 */

test('a well-formed contact submission passes', () => {
  const v = validator({
    name: 'Hawi Bekele',
    email: 'hawi@example.com',
    phone: '+251 91 234 5678',
    subject: 'Appointment enquiry',
    message: 'I would like to book an appointment with the paediatrics department.',
  })
    .string('name', { required: true, max: 255, min: 2 })
    .email('email', { required: true })
    .phone('phone')
    .string('subject', { required: true, max: 255, min: 3 })
    .string('message', { required: true, max: 5000, min: 10 });

  assert.equal(v.ok, true);
  assert.equal(v.values.name, 'Hawi Bekele');
});

test('a phone number longer than the column is rejected, not passed to the driver', () => {
  // `contact_submissions.phone` is varchar(20).
  const v = validator({ phone: '0'.repeat(64) }).phone('phone');
  assert.equal(v.ok, false);
  assert.match(v.message, /20 characters or fewer/);
});

test('an over-long subject is rejected', () => {
  const v = validator({ subject: 'x'.repeat(300) }).string('subject', {
    required: true,
    max: 255,
    label: 'Subject',
  });
  assert.equal(v.ok, false);
  assert.match(v.message, /255 characters or fewer/);
});

test('a malformed email address is rejected', () => {
  for (const bad of ['not-an-email', 'a@b', 'a@b.c', '@example.com', 'a b@example.com']) {
    const v = validator({ email: bad }).email('email', { required: true });
    assert.equal(v.ok, false, `expected ${bad} to be rejected`);
  }
});

test('a repeated form field is refused rather than silently joined', () => {
  // `?name=a&name=b` arrives as an array; String() would store "a,b".
  const v = validator({ name: ['Abebe', 'Kebede'] }).string('name', { required: true });
  assert.equal(v.ok, false);
  assert.match(v.message, /single text value/);
});

test('missing required fields are reported by name', () => {
  const v = validator({}).string('name', { required: true, label: 'Name' });
  assert.equal(v.ok, false);
  assert.match(v.message, /Name is required/);
});

test('optional fields absent from the body become null, not the string "undefined"', () => {
  const v = validator({}).string('department', { required: false });
  assert.equal(v.ok, true);
  assert.equal(v.values.department, null);
});

test('surrounding whitespace is trimmed before length is measured', () => {
  const v = validator({ name: '   Abebe   ' }).string('name', { required: true, min: 2 });
  assert.equal(v.ok, true);
  assert.equal(v.values.name, 'Abebe');
});

test('whitespace alone does not satisfy a required field', () => {
  const v = validator({ name: '     ' }).string('name', { required: true, label: 'Name' });
  assert.equal(v.ok, false);
});

test('the first error is the one reported, and errors accumulate', () => {
  const v = validator({ email: 'nope', phone: 'x' })
    .email('email', { required: true })
    .phone('phone', { required: true });
  assert.equal(v.ok, false);
  assert.equal(Object.keys(v.errors).length, 2);
});
