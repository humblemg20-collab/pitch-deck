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
  // V2.3: an image's declared role does not prove contextual relevance.
  // An investor FOCUS slide never auto-inserts product/team images. Only the
  // user's explicitly tagged logo can appear on the investor cover.
  // The existing Assets registry has a role but no semantic approval field.
  // Block all contextual photos in V2.3 until a separate user-reviewed media
  // relevance workflow is implemented; never guess relevance from file names.
  if (slideData.investorLayout && kind !== 'cover') return false;
  if (kind === 'cover') {
    asset = slideData.investorLayout ?
      AG24_SLIDE_selectAsset_(assets, ['LOGO']) :
      AG24_SLIDE_selectAsset_(assets, ['LOGO', 'COVER_HERO']);
    box = asset && asset.role === 'LOGO'
      ? [714, 95, 126, 128] : [668, 77, 218, 298];
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
  // Fit into the visual slot without stretching user photos or documents.
  const image = slide.insertImage(blob);
  const targetX=ag24ScaleX_(box[0]), targetY=ag24ScaleY_(box[1]);
  const targetWidth=ag24ScaleX_(box[2]), targetHeight=ag24ScaleY_(box[3]);
  const originalWidth=image.getWidth(),originalHeight=image.getHeight();
  if(!(originalWidth>0&&originalHeight>0)) throw new Error('ASSET_IMAGE_DIMENSIONS_INVALID');
  const fit=Math.min(targetWidth/originalWidth,targetHeight/originalHeight);
  const fittedWidth=originalWidth*fit,fittedHeight=originalHeight*fit;
  image.setWidth(fittedWidth);
  image.setHeight(fittedHeight);
  image.setLeft(targetX+(targetWidth-fittedWidth)/2);
  image.setTop(targetY+(targetHeight-fittedHeight)/2);

  if (kind === 'solution' && ag24Text_(slideData.status)) {
    const theme = getPremiumTheme_();
    addPanel_(slide, 650, 332, 250, 28, theme.panelAlt);
    addTextBox_(slide, ag24Text_(slideData.status),
      660, 338, 230, 16, {fontSize: 10, color: theme.white});
  }
  return true;
}
