function exportPresentationToPdf_(project, presentationResult) {
  const folder = getOrCreateGeneratedFolder_(project);
  const sourceFile = DriveApp.getFileById(presentationResult.presentationId);
  const pdfName = presentationResult.fileName + '.pdf';
  const pdfBlob = sourceFile.getAs(MimeType.PDF).setName(pdfName);
  const pdfFile = folder.createFile(pdfBlob);
  try {
    if (isValidEmail_(project.email)) pdfFile.addViewer(project.email);
  } catch (error) {
    try { pdfFile.setTrashed(true); } catch (cleanupError) {
      console.error('PDF_SHARE_ROLLBACK_FAILED', cleanupError);
    }
    throw new Error('Impossible de donner accès au PDF au contact du projet.');
  }
  return {
    pdfId: pdfFile.getId(),
    pdfUrl: pdfFile.getUrl(),
    fileName: pdfName
  };
}
