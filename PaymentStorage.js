function normalizePaymentEmail_(email) {
  const normalized = String(email || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : '';
}

function cleanPaymentText_(value, maxLength) {
  return String(value == null ? '' : value).trim().slice(0, maxLength || 500);
}

function paymentNowIso_() {
  return new Date().toISOString();
}

function paymentHeaders_(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
}

function paymentRowToObject_(headers, rowValues, rowNumber) {
  const result = { _rowNumber: rowNumber };
  headers.forEach(function(header, index) { result[header] = rowValues[index]; });
  return result;
}

function generatePitchDeckAccessCode_() {
  return AG24_PAYMENT_CONFIG.ACCESS_PREFIX + Utilities.getUuid()
    .replace(/-/g, '')
    .slice(0, AG24_PAYMENT_CONFIG.ACCESS_CODE_LENGTH)
    .toUpperCase();
}

function accessCodeExists_(accessCode) {
  const sheet = setupPaymentsSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return false;

  const headers = values[0].map(String);
  const codeIndex = headers.indexOf('accessCode');
  const target = String(accessCode || '').trim().toUpperCase();

  return values.slice(1).some(function(row) {
    return String(row[codeIndex] || '').trim().toUpperCase() === target;
  });
}

function generateUniquePitchDeckAccessCode_() {
  for (let i = 0; i < 10; i++) {
    const code = generatePitchDeckAccessCode_();
    if (!accessCodeExists_(code)) return code;
  }
  throw new Error('Impossible de générer un code unique.');
}

function findPaymentByTransactionId_(transactionId) {
  const target = cleanPaymentText_(transactionId, 150);
  if (!target) return null;

  const sheet = setupPaymentsSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;

  const headers = values[0].map(String);
  const index = headers.indexOf('transactionId');

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][index] || '').trim() === target) {
      return paymentRowToObject_(headers, values[i], i + 1);
    }
  }
  return null;
}

function createPaymentAccess_(paymentData) {
  paymentData = paymentData || {};
  const email = normalizePaymentEmail_(paymentData.email);
  if (!email) throw new Error('Adresse e-mail invalide.');

  const transactionId = cleanPaymentText_(paymentData.transactionId, 150);
  if (!transactionId) throw new Error('Le numéro de transaction est obligatoire.');

  const existing = findPaymentByTransactionId_(transactionId);
  if (existing) {
    return {
      success: true,
      created: false,
      paymentId: existing.paymentId,
      email: existing.email,
      accessCode: existing.accessCode,
      status: existing.status,
      message: 'Cette transaction existe déjà.'
    };
  }

  const sheet = setupPaymentsSheet_();
  const now = paymentNowIso_();
  const paymentId = 'AG24-PAY-' + Utilities.getUuid()
    .replace(/-/g, '').slice(0, 12).toUpperCase();
  const accessCode = generateUniquePitchDeckAccessCode_();

  sheet.appendRow([
    paymentId,
    email,
    cleanPaymentText_(paymentData.customerName, 180),
    transactionId,
    Number(paymentData.amount || 0),
    cleanPaymentText_(paymentData.currency || AG24_PAYMENT_CONFIG.DEFAULT_CURRENCY, 10),
    'PAID',
    accessCode,
    false,
    '',
    cleanPaymentText_(paymentData.source || 'Selar', 100),
    now,
    now,
    ''
  ]);

  return { success: true, created: true, paymentId, email, accessCode, status: 'PAID' };
}

function findPaymentAccess_(email, accessCode) {
  const normalizedEmail = normalizePaymentEmail_(email);
  const normalizedCode = String(accessCode || '').trim().toUpperCase();
  if (!normalizedEmail || !normalizedCode) return null;

  const sheet = setupPaymentsSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;

  const headers = values[0].map(String);
  const emailIndex = headers.indexOf('email');
  const codeIndex = headers.indexOf('accessCode');

  for (let i = 1; i < values.length; i++) {
    const rowEmail = normalizePaymentEmail_(values[i][emailIndex]);
    const rowCode = String(values[i][codeIndex] || '').trim().toUpperCase();
    if (rowEmail === normalizedEmail && rowCode === normalizedCode) {
      return paymentRowToObject_(headers, values[i], i + 1);
    }
  }
  return null;
}

function verifyPitchAccess_(email, accessCode) {
  const payment = findPaymentAccess_(email, accessCode);
  if (!payment) return { valid: false, reason: 'NOT_FOUND', message: 'E-mail ou code d’accès incorrect.' };

  const status = String(payment.status || '').toUpperCase();
  const used = payment.accessUsed === true || String(payment.accessUsed).toLowerCase() === 'true';

  if (status === 'CANCELLED' || status === 'REFUNDED') {
    return { valid: false, reason: status, message: 'Cet accès a été annulé.' };
  }
  if (used || status === 'USED') {
    return { valid: false, reason: 'USED', projectId: String(payment.projectId || ''), message: 'Ce code a déjà été utilisé.' };
  }
  if (status !== 'PAID') {
    return { valid: false, reason: 'NOT_PAID', message: 'Le paiement n’est pas validé.' };
  }

  return {
    valid: true,
    paymentId: String(payment.paymentId || ''),
    email: String(payment.email || ''),
    customerName: String(payment.customerName || ''),
    accessCode: String(payment.accessCode || ''),
    message: 'Accès validé.'
  };
}

function updatePaymentRow_(sheet, rowNumber, updates) {
  const headers = paymentHeaders_(sheet);
  Object.keys(updates).forEach(function(key) {
    const columnIndex = headers.indexOf(key);
    if (columnIndex >= 0) sheet.getRange(rowNumber, columnIndex + 1).setValue(updates[key]);
  });
}

function consumePitchAccessForProject_(email, accessCode, projectId) {
  const verification = verifyPitchAccess_(email, accessCode);
  if (!verification.valid) throw new Error(verification.message);

  const payment = findPaymentAccess_(email, accessCode);
  const now = paymentNowIso_();
  const sheet = setupPaymentsSheet_();

  updatePaymentRow_(sheet, payment._rowNumber, {
    status: 'USED',
    accessUsed: true,
    projectId: cleanPaymentText_(projectId, 150),
    updatedAt: now,
    usedAt: now
  });

  return { success: true, paymentId: verification.paymentId, projectId, status: 'USED' };
}
