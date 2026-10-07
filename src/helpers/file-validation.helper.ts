export function isValidDocumentExtension(
  files: Express.Multer.File | Express.Multer.File[],
): boolean {
  const typesAcceptes = ["image/jpeg", "image/png", "application/pdf"];
  if (Array.isArray(files)) {
    for (const file of files) {
      if (!typesAcceptes.includes(file.mimetype)) {
        return false;
      }
    }
  } else {
    if (!typesAcceptes.includes(files.mimetype)) {
      return false;
    }
  }
  return true;
}
