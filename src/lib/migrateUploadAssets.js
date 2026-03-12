import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SRD from '../models/SRD.js';
import { getAssetDirectoryName, normalizeAssetEntries } from './assetUtils.js';
import {
  buildAssetStorageInfo,
  buildStoredAssetRecord,
  resolveManagedUploadRelativePath,
  toAbsolutePublicPath,
} from './serverAssetUtils.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const APPLY_MODE = process.argv.includes('--apply');
const projectRoot = process.cwd();

function getFieldType(field) {
  return field?.type || field?.field?.type || null;
}

function getFieldId(field) {
  const rawFieldId =
    field?.originalFieldId ||
    (field?.field && typeof field.field === 'object' ? field.field._id || field.field : field.field) ||
    field?._id ||
    field?.name ||
    'unknown';

  return String(rawFieldId);
}

function isExternalUrl(value) {
  try {
    const parsed = new URL(String(value));
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function cloneValue(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function collectSrdImages(srd) {
  if (Array.isArray(srd.images)) {
    return srd.images.filter(Boolean);
  }

  return srd.images ? [srd.images] : [];
}

function createStats() {
  return {
    srdsScanned: 0,
    srdsUpdated: 0,
    fieldsScanned: 0,
    fieldsUpdated: 0,
    assetsRewritten: 0,
    assetsMoved: 0,
    anomalies: 0,
  };
}

function logSection(title) {
  console.log(`\n=== ${title} ===`);
}

function pushAnomaly(anomalies, stats, type, details) {
  anomalies.push({ type, ...details });
  stats.anomalies += 1;
}

function buildNormalizedAssetFromExistingPath({
  asset,
  fieldType,
  srdId,
  fieldId,
  relativePath,
}) {
  const normalizedRelativePath = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const storedFileName = path.posix.basename(normalizedRelativePath);
  const originalName = asset.originalName || asset.fileName || storedFileName;

  return buildStoredAssetRecord({
    fieldType,
    srdId,
    fieldId,
    storedFileName,
    originalName,
    relativePath: normalizedRelativePath,
    mimeType: asset.mimeType || '',
    size: Number.isFinite(Number(asset.size)) ? Number(asset.size) : 0,
    uploadedAt: asset.uploadedAt || new Date().toISOString(),
  });
}

function migrateAssetCollection({
  assets,
  field,
  fieldType,
  srd,
  stats,
  anomalies,
}) {
  const srdId = String(srd._id);
  const fieldId = getFieldId(field);
  const targetDirectory = getAssetDirectoryName(fieldType);

  if (!targetDirectory) {
    pushAnomaly(anomalies, stats, 'unsupported-field-type', {
      srdId,
      refNo: srd.refNo,
      fieldId,
      fieldName: field.name,
      fieldType,
    });
    return { blocked: true };
  }

  const migratedAssets = [];
  const plannedMoves = [];
  let changed = false;

  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index];
    const assetUrl = asset.url || '';
    const relativePath = resolveManagedUploadRelativePath(asset.relativePath || assetUrl);

    if (relativePath) {
      const targetPrefix = `uploads/${targetDirectory}/${srdId}/`;
      const originalName =
        asset.originalName ||
        asset.fileName ||
        path.posix.basename(relativePath) ||
        `${field.name || fieldId}-${index + 1}`;

      if (relativePath.startsWith(targetPrefix)) {
        const normalizedAsset = buildNormalizedAssetFromExistingPath({
          asset,
          fieldType,
          srdId,
          fieldId,
          relativePath,
        });
        const existingAbsolutePath = toAbsolutePublicPath(relativePath, projectRoot);
        if (!normalizedAsset.size && fs.existsSync(existingAbsolutePath)) {
          normalizedAsset.size = fs.statSync(existingAbsolutePath).size;
        }

        migratedAssets.push(normalizedAsset);
        changed = changed || JSON.stringify(normalizedAsset) !== JSON.stringify(asset);
        continue;
      }

      const sourceAbsolutePath = toAbsolutePublicPath(relativePath, projectRoot);
      if (!fs.existsSync(sourceAbsolutePath)) {
        pushAnomaly(anomalies, stats, 'missing-source-file', {
          srdId,
          refNo: srd.refNo,
          fieldId,
          fieldName: field.name,
          source: relativePath,
        });
        return { blocked: true };
      }

      const sourceStats = fs.statSync(sourceAbsolutePath);
      const storageInfo = buildAssetStorageInfo({
        projectRoot,
        srdId,
        fieldId,
        fieldType,
        fileName: originalName,
        timestamp: Date.now() + index,
      });

      if (sourceAbsolutePath !== storageInfo.absolutePath && fs.existsSync(storageInfo.absolutePath)) {
        pushAnomaly(anomalies, stats, 'target-file-exists', {
          srdId,
          refNo: srd.refNo,
          fieldId,
          fieldName: field.name,
          target: storageInfo.relativePath,
        });
        return { blocked: true };
      }

      migratedAssets.push(
        buildStoredAssetRecord({
          fieldType,
          srdId,
          fieldId,
          storedFileName: storageInfo.storedFileName,
          originalName,
          relativePath: storageInfo.relativePath,
          mimeType: asset.mimeType || '',
          size: Number.isFinite(Number(asset.size)) ? Number(asset.size) : sourceStats.size,
          uploadedAt: asset.uploadedAt || new Date().toISOString(),
        })
      );
      plannedMoves.push({ sourceAbsolutePath, storageInfo });
      changed = true;
      continue;
    }

    if (isExternalUrl(assetUrl)) {
      const externalPathName = (() => {
        try {
          return path.posix.basename(new URL(assetUrl).pathname);
        } catch {
          return '';
        }
      })();

      migratedAssets.push({
        ...asset,
        url: assetUrl,
        relativePath: '',
        kind: fieldType,
        srdId,
        fieldId,
        fileName: asset.fileName || externalPathName,
        originalName: asset.originalName || asset.fileName || externalPathName,
        mimeType: asset.mimeType || '',
        size: Number.isFinite(Number(asset.size)) ? Number(asset.size) : 0,
        uploadedAt: asset.uploadedAt || new Date().toISOString(),
      });
      changed = true;
      continue;
    }

    pushAnomaly(anomalies, stats, 'unsupported-asset-value', {
      srdId,
      refNo: srd.refNo,
      fieldId,
      fieldName: field.name,
      value: assetUrl || field.value,
    });
    return { blocked: true };
  }

  if (APPLY_MODE) {
    for (const move of plannedMoves) {
      fs.mkdirSync(move.storageInfo.absoluteDirectory, { recursive: true });
      if (move.sourceAbsolutePath !== move.storageInfo.absolutePath) {
        fs.renameSync(move.sourceAbsolutePath, move.storageInfo.absolutePath);
      }
    }
  }

  stats.assetsMoved += plannedMoves.length;
  return { blocked: false, changed, migratedAssets };
}

async function migrateUploads() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined');
  }

  const stats = createStats();
  const anomalies = [];

  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to MongoDB. Mode: ${APPLY_MODE ? 'apply' : 'dry-run'}`);

  const srds = await SRD.find({});

  for (const srd of srds) {
    stats.srdsScanned += 1;
    let srdChanged = false;

    const legacyImages = collectSrdImages(srd);
    if (legacyImages.length > 0) {
      pushAnomaly(anomalies, stats, 'legacy-srd-images-present', {
        srdId: String(srd._id),
        refNo: srd.refNo,
        count: legacyImages.length,
      });
    }

    const nextDynamicFields = srd.dynamicFields.map((field) => {
      stats.fieldsScanned += 1;

      const fieldType = getFieldType(field);
      if (!fieldType || (fieldType !== 'image' && fieldType !== 'file')) {
        return field;
      }

      if (field.value === null || field.value === undefined || field.value === '') {
        return field;
      }

      if (Array.isArray(field.value) && field.value.filter(Boolean).length === 0) {
        return field;
      }

      const assets = normalizeAssetEntries(field.value, { kind: fieldType });
      if (!assets.length) {
        pushAnomaly(anomalies, stats, 'unmigratable-field-value', {
          srdId: String(srd._id),
          refNo: srd.refNo,
          fieldId: getFieldId(field),
          fieldName: field.name,
          fieldType,
          value: field.value,
        });
        return field;
      }

      const migration = migrateAssetCollection({
        assets,
        field,
        fieldType,
        srd,
        stats,
        anomalies,
      });

      if (migration.blocked) {
        return field;
      }

      const nextValue = fieldType === 'image' ? migration.migratedAssets : (migration.migratedAssets[0] || null);
      const currentValueSnapshot = JSON.stringify(cloneValue(field.value));
      const nextValueSnapshot = JSON.stringify(cloneValue(nextValue));

      if (migration.changed || currentValueSnapshot !== nextValueSnapshot) {
        stats.fieldsUpdated += 1;
        stats.assetsRewritten += migration.migratedAssets.length;
        srdChanged = true;
        return {
          ...field.toObject(),
          value: nextValue,
        };
      }

      return field;
    });

    if (srdChanged) {
      stats.srdsUpdated += 1;

      if (APPLY_MODE) {
        srd.dynamicFields = nextDynamicFields;
        srd.markModified('dynamicFields');
        await srd.save();
      }
    }
  }

  logSection('Summary');
  console.log(JSON.stringify(stats, null, 2));

  if (anomalies.length > 0) {
    logSection('Anomalies');
    anomalies.slice(0, 50).forEach((entry) => {
      console.log(JSON.stringify(entry));
    });

    if (anomalies.length > 50) {
      console.log(`... ${anomalies.length - 50} more anomaly records omitted`);
    }
  }

  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB');
}

migrateUploads().catch(async (error) => {
  console.error('Upload migration failed:', error);
  try {
    await mongoose.disconnect();
  } catch {
    // Ignore disconnect failures after a fatal error.
  }
  process.exitCode = 1;
});
