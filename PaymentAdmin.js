function createAccessForCustomer() {
  const result = adminCreateSelarAccess(
    'client@email.com',
    'Nom du client',
    'REFERENCE-SELAR-12345',
    10000
  );

  Logger.log(JSON.stringify(result, null, 2));
}

function testCreatePaymentAccess() {
  const result = createPaymentAccess_({
    email: 'test@afrigreen24.com',
    customerName: 'Client Test',
    transactionId: 'SELAR-TEST-' + new Date().getTime(),
    amount: 10000,
    currency: 'XOF',
    source: 'Test manuel'
  });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function adminCancelPitchAccess(email, accessCode) {
  const payment = findPaymentAccess_(email, accessCode);
  if (!payment) throw new Error('Accès introuvable.');

  updatePaymentRow_(setupPaymentsSheet_(), payment._rowNumber, {
    status: 'CANCELLED',
    updatedAt: paymentNowIso_()
  });

  return { success: true, paymentId: payment.paymentId, status: 'CANCELLED' };
}
