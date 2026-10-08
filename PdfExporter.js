function exportPresentationToPdf_(project, presentationResult) {
  const folder = getOrCreateProjectFolder_(project);
  const sourceFile = DriveApp.getFileById(presentationResult.presentationId);
  const pdfName = presentationResult.fileName + '.pdf';
  const pdfBlob = sourceFile.getAs(MimeType.PDF).setName(pdfName);
  const pdfFile = folder.createFile(pdfBlob);
  try {
    if (isValidEmail_(project.email)) pdfFile.addViewer(project.email);
  } catch (error) {
    console.warn('Partage PDF impossible : ' + error.message);
  }
  return {
    pdfId: pdfFile.getId(),
    pdfUrl: pdfFile.getUrl(),
    fileName: pdfName
  };
}
