/**
 * AfriGreen24 Pitch — deterministic image placement V1.
 * Only validated files from the project's canonical private Assets registry.
 * A missing asset is not replaced by a random image or invented illustration.
 */
function AG24_SLIDE_selectAsset_(assets, roles) {
  for (let i = 0; i < roles.length; i += 1) {
    const candidates = (assets || []).filter(function(asset) {
      return asset.role === roles[i] && asset.status === 'ACTIVE';
    });
    if (candidates.length) return candidates[candidates.length - 1];
  }
  return null;
}

function AG24_SLIDE_placeImage_(slide, slideData, assets) {
  const kind = cleanString_(slideData.type, 40).toLowerCase();
  let asset = null;
  let box = null;
  if (kind === 'cover') {
    asset = AG24_SLIDE_selectAsset_(assets, ['COVER_HERO', 'LOGO']);
    box = asset && asset.role === 'LOGO'
      ? [708, 85, 145, 125] : [665, 65, 230, 320];
  } else if (kind === 'solution') {
    asset = AG24_SLIDE_selectAsset_(assets, ['PRODUCT', 'SOLUTION']);
    box = [654, 196, 242, 160];
  } else if (kind === 'team') {
    asset = AG24_SLIDE_selectAsset_(assets, ['FOUNDER', 'TEAM']);
    box = [538, 217, 132, 134];
  }
  if (!asset || !box) return false;

  // Fail visibly for a missing registered file: don't publish a silently incomplete deck.
  const blob = AG24_ASSET_imageBlob_(asset);
  slide.insertImage(
    blob,
    ag24ScaleX_(box[0]), ag24ScaleY_(box[1]),
    ag24ScaleX_(box[2]), ag24ScaleY_(box[3])
  );
  if (kind === 'solution') {
    const theme = getPremiumTheme_();
    addPanel_(slide, 650, 332, 250, 28, theme.panelAlt);
    addTextBox_(slide, ag24Text_(slideData.status, 'Stade à préciser'),
      660, 338, 230, 16, {fontSize: 10, color: theme.white});
  }
  return true;
}
