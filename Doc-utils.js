function insertTextToDoc(text) {
  const body = DocumentApp.getActiveDocument().getBody();
  body.appendParagraph(text);
}

function insertImageToDoc(imageUrl) {
  try {
    const maxHeight = 200;
    const maxWidth = 300;
    const response = UrlFetchApp.fetch(imageUrl);
    const blob = response.getBlob();

    const doc = DocumentApp.getActiveDocument();
    const body = doc.getBody();

    const image = body.appendImage(blob);

    const originalWidth = image.getWidth();
    const originalHeight = image.getHeight();

    const widthRatio = maxWidth / originalWidth;
    const heightRatio = maxHeight / originalHeight;
    const ratio = Math.min(widthRatio, heightRatio, 1);

    const newWidth = originalWidth * ratio;
    const newHeight = originalHeight * ratio;

    image.setWidth(newWidth);
    image.setHeight(newHeight);

  } catch (e) {
    Logger.log("Erreur : " + e.message);
  }
}

