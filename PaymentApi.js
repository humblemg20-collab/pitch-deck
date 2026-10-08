function paymentApiResponse_(callback) {
  try {
    return { success: true, data: callback() };
  } catch (error) {
    console.error(error);
    return { success: false, error: error && error.message ? error.message : 'Une erreur inattendue est survenue.' };
  }
}

function apiGetPitchPaymentInfo() {
  return paymentApiResponse_(function() {
    return {
      productName: AG24_PAYMENT_CONFIG.PRODUCT_NAME,
      paymentUrl: AG24_PAYMENT_CONFIG.SELAR_PAYMENT_URL
    };
  });
}

function apiVerifyPitchAccess(email, accessCode) {
  return paymentApiResponse_(function() {
    return verifyPitchAccess_(email, accessCode);
  });
}
