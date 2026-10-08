function nowIso_() {
  return new Date().toISOString();
}

function safeJsonParse_(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function cloneObject_(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function mergeDeep_(target, source) {
  const output = cloneObject_(target || {});
  Object.keys(source || {}).forEach(function(key) {
    const incoming = source[key];
    if (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) {
      output[key] = mergeDeep_(output[key] || {}, incoming);
    } else {
      output[key] = incoming;
    }
  });
  return output;
}

function getByPath_(object, path) {
  return String(path || '').split('.').reduce(function(current, key) {
    return current && Object.prototype.hasOwnProperty.call(current, key) ? current[key] : undefined;
  }, object);
}

function setByPath_(object, path, value) {
  const parts = String(path || '').split('.');
  let current = object;
  parts.forEach(function(part, index) {
    if (index === parts.length - 1) {
      current[part] = value;
    } else {
      current[part] = current[part] || {};
      current = current[part];
    }
  });
  return object;
}

function cleanString_(value, maxLength) {
  const limit = Number(maxLength || AG24_CONFIG.MAX_TEXT_LENGTH);
  return String(value === null || value === undefined ? '' : value)
    .replace(/[<>]/g, '')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, limit);
}

function cleanEmail_(value) {
  return cleanString_(value, 320).toLowerCase();
}

function isValidEmail_(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail_(value));
}

function cleanNumber_(value) {
  if (typeof value === 'number') return isFinite(value) ? value : 0;
  const normalized = String(value || '')
    .replace(/\s/g, '')
    .replace(/,/g, '.')
    .replace(/[^0-9.-]/g, '');
  const parsed = Number(normalized);
  return isFinite(parsed) ? parsed : 0;
}

function normalizeBoolean_(value) {
  return value === true || value === 'true' || value === 'yes' || value === 'oui' || value === 1;
}

function sanitizeObject_(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeObject_).slice(0, 200);
  }
  if (value && typeof value === 'object') {
    const output = {};
    Object.keys(value).slice(0, 300).forEach(function(key) {
      output[cleanString_(key, 100)] = sanitizeObject_(value[key]);
    });
    return output;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  return cleanString_(value);
}

function randomToken_() {
  const raw = Utilities.getUuid() + '|' + Utilities.getUuid() + '|' + new Date().getTime();
  return Utilities.base64EncodeWebSafe(raw).replace(/=+$/g, '').slice(0, 64);
}

function randomAccessCode_() {
  // Avoid predictable Math.random() per digit. Twelve UUID hex nibbles
  // yield a sufficiently dispersed decimal code alongside online throttling.
  const hex = Utilities.getUuid().replace(/[^a-f0-9]/ig, '');
  let output = '';
  for (let i = 0; i < AG24_CONFIG.ACCESS_CODE_LENGTH; i += 1) {
    output += (parseInt(hex.slice(i * 2, i * 2 + 2), 16) % 10).toString();
  }
  return output;
}

function hashValue_(value) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value || ''),
    Utilities.Charset.UTF_8
  );
  return digest.map(function(byte) {
    const normalized = byte < 0 ? byte + 256 : byte;
    return ('0' + normalized.toString(16)).slice(-2);
  }).join('');
}

function createProjectId_() {
  const timezone = getPrivateConfig_().timezone || AG24_CONFIG.DEFAULT_TIMEZONE;
  const datePart = Utilities.formatDate(new Date(), timezone, 'yyyyMMdd');
  const suffix = Utilities.getUuid().replace(/-/g, '').slice(0, 7).toUpperCase();
  return AG24_CONFIG.PROJECT_PREFIX + '-' + datePart + '-' + suffix;
}

function slugify_(value) {
  return cleanString_(value, 100)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60) || 'projet';
}

function splitLines_(value, maxItems) {
  return cleanString_(value)
    .split(/\n|;|•/)
    .map(function(item) { return item.trim(); })
    .filter(Boolean)
    .slice(0, maxItems || 8);
}

function truncate_(value, maxLength) {
  const text = cleanString_(value);
  if (text.length <= maxLength) return text;
  return text.slice(0, Math.max(0, maxLength - 1)).trim() + '…';
}

function formatMoney_(amount, currency) {
  const number = cleanNumber_(amount);
  if (!number) return 'Montant à préciser';
  return number.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' ' + cleanString_(currency || AG24_CONFIG.DEFAULT_CURRENCY, 12);
}

function requireSetup_() {
  const config = getPrivateConfig_();
  if (!config.databaseSpreadsheetId || !config.rootFolderId) {
    throw new Error('Installation incomplète. Exécutez setupAfriGreen24PitchDeck() une première fois.');
  }
  return config;
}

function withScriptLock_(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function ok_(data) {
  return { ok: true, data: data || null };
}

function fail_(message, code) {
  return { ok: false, error: { message: cleanString_(message, 500), code: code || 'ERROR' } };
}

function safeApi_(callback) {
  try {
    return ok_(callback());
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return fail_(error && error.message ? error.message : 'Une erreur inattendue est survenue.');
  }
}
