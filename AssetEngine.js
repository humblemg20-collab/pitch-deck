/**
 * AfriGreen24 Pitch Asset Engine V1
 * Source canonique: feuille Assets (métadonnées) + Drive (octets).
 * Jamais de base64 ni de fichier binaire dans Projects/dataJson.
 */
const AG24_ASSETS_V1 = Object.freeze({
  SHEET: 'Assets',
  HEADERS: Object.freeze([
    'assetId', 'projectId', 'role', 'kind', 'fileId', 'name',
    'mimeType', 'bytes', 'sha256', 'status', 'createdAt', 'updatedAt'
  ]),
  IMAGE_MAX_BYTES: 2 * 1024 * 1024,
  DOCUMENT_MAX_BYTES: 8 * 1024 * 1024,
  MAX_ASSETS_PER_PROJECT: 30,
  IMAGE_ROLES: Object.freeze([
    'LOGO', 'COVER_HERO', 'PRODUCT', 'SOLUTION',
    'TRACTION_PROOF', 'FOUNDER', 'TEAM', 'IMPACT'
  ]),
  DOCUMENT_ROLES: Object.freeze(['SOURCE_DOCUMENT']),
  TYPES: Object.freeze({
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  })
});

function AG24_ASSET_getSheet_(create) {
  const spreadsheet = getDatabase_();
  let sheet = spreadsheet.getSheetByName(AG24_ASSETS_V1.SHEET);
  if (!sheet) {
    if (!create) return null;
    sheet = spreadsheet.insertSheet(AG24_ASSETS_V1.SHEET);
    sheet.getRange(1, 1, 1, AG24_ASSETS_V1.HEADERS.length)
      .setValues([Array.from(AG24_ASSETS_V1.HEADERS)]);
    sheet.setFrozenRows(1);
    return sheet;
  }
  const actual = sheet.getRange(1, 1, 1, AG24_ASSETS_V1.HEADERS.length)
    .getValues()[0];
  const valid = AG24_ASSETS_V1.HEADERS.every(function(header, index) {
    return actual[index] === header;
  });
  if (!valid) {
    throw new Error('Schéma Assets incompatible : migration explicite requise. Aucune donnée modifiée.');
  }
  return sheet;
}

function AG24_ASSET_rows_(projectId) {
  const sheet = AG24_ASSET_getSheet_(false);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 12).getValues()
    .map(function(row, index) {
      return {
        rowNumber: index + 2,
        assetId: String(row[0] || ''),
        projectId: String(row[1] || ''),
        role: String(row[2] || ''),
        kind: String(row[3] || ''),
        fileId: String(row[4] || ''),
        name: String(row[5] || ''),
        mimeType: String(row[6] || ''),
        bytes: Number(row[7] || 0),
        sha256: String(row[8] || ''),
        status: String(row[9] || ''),
        createdAt: String(row[10] || ''),
        updatedAt: String(row[11] || '')
      };
    })
    .filter(function(record) { return record.projectId === projectId; });
}

function AG24_ASSET_public_(record) {
  return {
    assetId: record.assetId,
    role: record.role,
    kind: record.kind,
    name: record.name,
    mimeType: record.mimeType,
    bytes: record.bytes,
    createdAt: record.createdAt
  };
}

function AG24_ASSET_authorize_(projectId, token) {
  const project = findProject_(cleanString_(projectId, 100));
  if (!project) throw new Error('Projet introuvable.');
  assertProjectToken_(project, token);
  return project;
}

function AG24_ASSET_normalizeUpload_(input) {
  if (!input || typeof input !== 'object') throw new Error('Upload invalide.');
  const name = cleanString_(input.fileName, 150).replace(/[\/\\]/g, '_');
  const extension = (name.match(/\.([a-z0-9]+)$/i) || [])[1];
  const mimeType = AG24_ASSETS_V1.TYPES[String(extension || '').toLowerCase()];
  const role = cleanString_(input.role, 40).toUpperCase();
  const kind = mimeType && mimeType.indexOf('image/') === 0 ? 'IMAGE' : 'DOCUMENT';
  const roles = kind === 'IMAGE'
    ? AG24_ASSETS_V1.IMAGE_ROLES : AG24_ASSETS_V1.DOCUMENT_ROLES;
  if (!mimeType || roles.indexOf(role) < 0) {
    throw new Error('Format ou rôle de fichier non autorisé.');
  }
  const claimedMime = cleanString_(input.mimeType, 130).toLowerCase();
  if (claimedMime && claimedMime !== mimeType &&
      claimedMime !== 'application/octet-stream' &&
      !(mimeType === 'image/jpeg' && claimedMime === 'image/jpg')) {
    throw new Error('Le type déclaré ne correspond pas à l’extension du fichier.');
  }
  const base64 = String(input.base64 || '');
  const limit = kind === 'IMAGE'
    ? AG24_ASSETS_V1.IMAGE_MAX_BYTES : AG24_ASSETS_V1.DOCUMENT_MAX_BYTES;
  if (!base64 || base64.length > Math.ceil(limit / 3) * 4 + 8 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new Error('Fichier vide, encodage invalide ou taille dépassée.');
  }
  let bytes;
  try {
    bytes = Utilities.base64Decode(base64);
  } catch (error) {
    throw new Error('Encodage du fichier invalide.');
  }
  if (!bytes.length || bytes.length > limit) throw new Error('Taille maximale dépassée.');
  if (input.size !== undefined && input.size !== null &&
      Number(input.size) !== bytes.length) {
    throw new Error('Taille du fichier incohérente.');
  }
  AG24_ASSET_assertSignature_(mimeType, bytes);
  const signature = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, bytes
  ).map(function(b) {
    return ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2);
  }).join('');
  return {
    name: name, role: role, kind: kind, mimeType: mimeType,
    bytes: bytes.length, sha256: signature,
    blob: Utilities.newBlob(bytes, mimeType, name)
  };
}

function AG24_ASSET_assertSignature_(mimeType, bytes) {
  const unsigned = function(i) { return (bytes[i] || 0) & 255; };
  const prefix = function(values) {
    return values.every(function(value, index) { return unsigned(index) === value; });
  };
  let valid = false;
  if (mimeType === 'image/png') {
    valid = prefix([137, 80, 78, 71, 13, 10, 26, 10]);
  } else if (mimeType === 'image/jpeg') {
    valid = prefix([255, 216, 255]);
  } else if (mimeType === 'application/pdf') {
    valid = prefix([37, 80, 68, 70, 45]);
  } else if (mimeType === 'application/msword') {
    valid = prefix([208, 207, 17, 224, 161, 177, 26, 225]);
  } else if (mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    valid = prefix([80, 75, 3, 4]);
  }
  if (!valid) throw new Error('Signature réelle du fichier invalide.');
}

function AG24_ASSET_folder_(project, kind) {
  const hadFolder = project.folderId;
  const root = getOrCreateProjectFolder_(project);
  if (!hadFolder && project.folderId) updateProject_(project);
  const name = kind === 'IMAGE' ? 'images' : 'source-files';
  const existing = root.getFoldersByName(name);
  return existing.hasNext() ? existing.next() : root.createFolder(name);
}

function AG24_ASSET_invalidateDeck_(project) {
  if (!project.slidesUrl && !project.pdfUrl) return;
  project.slidesUrl = '';
  project.pdfUrl = '';
  project.status = AG24_CONFIG.STATUS.READY;
  updateProject_(project);
  logEvent_(project.projectId, 'DECK_INVALIDATED_BY_ASSET_CHANGE', {});
}

function AG24_ASSET_findActive_(projectId, assetId) {
  return AG24_ASSET_rows_(projectId).find(function(record) {
    return record.assetId === assetId && record.status === 'ACTIVE';
  }) || null;
}

function apiListProjectAssets(projectId, token) {
  return safeApi_(function() {
    const project = AG24_ASSET_authorize_(projectId, token);
    const records = AG24_ASSET_rows_(project.projectId)
      .filter(function(record) { return record.status === 'ACTIVE'; });
    return { assets: records.map(AG24_ASSET_public_) };
  });
}

function apiUploadProjectAsset(input) {
  return safeApi_(function() {
    return withScriptLock_(function() {
      const project = AG24_ASSET_authorize_(input && input.projectId, input && input.token);
      const validated = AG24_ASSET_normalizeUpload_(input);
      const existing = AG24_ASSET_rows_(project.projectId)
        .filter(function(record) { return record.status === 'ACTIVE'; });
      const duplicate = existing.find(function(record) {
        return record.sha256 === validated.sha256 && record.role === validated.role;
      });
      if (duplicate) {
        logEvent_(project.projectId, 'ASSET_DEDUPLICATED', {
          assetId: duplicate.assetId, role: duplicate.role
        });
        return { asset: AG24_ASSET_public_(duplicate), deduplicated: true };
      }
      if (existing.length >= AG24_ASSETS_V1.MAX_ASSETS_PER_PROJECT) {
        throw new Error('Limite de fichiers atteinte pour ce projet.');
      }
      const folder = AG24_ASSET_folder_(project, validated.kind);
      const file = folder.createFile(validated.blob);
      const timestamp = nowIso_();
      const record = {
        assetId: 'ASSET-' + Utilities.getUuid(),
        projectId: project.projectId,
        role: validated.role,
        kind: validated.kind,
        fileId: file.getId(),
        name: validated.name,
        mimeType: validated.mimeType,
        bytes: validated.bytes,
        sha256: validated.sha256,
        status: 'ACTIVE',
        createdAt: timestamp,
        updatedAt: timestamp
      };
      try {
        AG24_ASSET_getSheet_(true).appendRow([
          record.assetId, record.projectId, record.role, record.kind,
          record.fileId, record.name, record.mimeType, record.bytes,
          record.sha256, record.status, record.createdAt, record.updatedAt
        ]);
      } catch (error) {
        try { file.setTrashed(true); } catch (cleanupError) {
          console.error('ASSET_UPLOAD_ROLLBACK_FAILED', cleanupError);
        }
        throw error;
      }
      AG24_ASSET_invalidateDeck_(project);
      logEvent_(project.projectId, 'ASSET_UPLOADED', {
        assetId: record.assetId, role: record.role,
        kind: record.kind, bytes: record.bytes
      });
      return { asset: AG24_ASSET_public_(record), deduplicated: false };
    });
  });
}

function apiDeleteProjectAsset(input) {
  return safeApi_(function() {
    return withScriptLock_(function() {
      const project = AG24_ASSET_authorize_(input && input.projectId, input && input.token);
      const assetId = cleanString_(input && input.assetId, 100);
      const record = AG24_ASSET_findActive_(project.projectId, assetId);
      if (!record) {
        const deleted = AG24_ASSET_rows_(project.projectId).find(function(row) {
          return row.assetId === assetId && row.status === 'DELETED';
        });
        if (deleted) {
          // A previous Drive cleanup may have failed: retry safely.
          try { DriveApp.getFileById(deleted.fileId).setTrashed(true); }
          catch (error) { return { deleted: true, cleanupPending: true }; }
        }
        return { deleted: true, alreadyAbsent: true };
      }
      AG24_ASSET_getSheet_(false).getRange(record.rowNumber, 10, 1, 3)
        .setValues([['DELETED', record.createdAt, nowIso_()]]);
      let cleanupPending = false;
      try {
        DriveApp.getFileById(record.fileId).setTrashed(true);
      } catch (error) {
        cleanupPending = true;
        console.error('ASSET_DELETE_CLEANUP_PENDING', record.assetId, error);
      }
      AG24_ASSET_invalidateDeck_(project);
      logEvent_(project.projectId, 'ASSET_DELETED', {
        assetId: record.assetId, cleanupPending: cleanupPending
      });
      return { deleted: true, cleanupPending: cleanupPending };
    });
  });
}

function apiGetProjectImageData(projectId, token, assetId) {
  return safeApi_(function() {
    const project = AG24_ASSET_authorize_(projectId, token);
    const record = AG24_ASSET_findActive_(project.projectId, cleanString_(assetId, 100));
    if (!record || record.kind !== 'IMAGE') throw new Error('Image introuvable.');
    const blob = DriveApp.getFileById(record.fileId).getBlob();
    if (blob.getBytes().length > AG24_ASSETS_V1.IMAGE_MAX_BYTES) {
      throw new Error('Image trop volumineuse.');
    }
    return {
      assetId: record.assetId,
      dataUrl: 'data:' + record.mimeType + ';base64,' +
        Utilities.base64Encode(blob.getBytes())
    };
  });
}

/** Images can be used in Slides without ever granting public Drive access. */
function AG24_ASSET_imagesForGeneration_(projectId) {
  return AG24_ASSET_rows_(projectId)
    .filter(function(record) {
      return record.status === 'ACTIVE' && record.kind === 'IMAGE';
    });
}

function AG24_ASSET_imageBlob_(asset) {
  if (!asset || !asset.fileId) return null;
  const blob = DriveApp.getFileById(asset.fileId).getBlob();
  if (blob.getBytes().length > AG24_ASSETS_V1.IMAGE_MAX_BYTES) {
    throw new Error('Image enregistrée invalide ou trop volumineuse.');
  }
  AG24_ASSET_assertSignature_(asset.mimeType, blob.getBytes());
  return blob;
}
