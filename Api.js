function fetchItems(type) {
  const baseUrl = "https://marvelab-api.onrender.com/";
  const response = UrlFetchApp.fetch(baseUrl + type, {muteHttpExceptions: true});
  return JSON.parse(response.getContentText());
}

function fetchItemById(type, id) {
  const baseUrl = "https://marvelab-api.onrender.com/";
  const response = UrlFetchApp.fetch(`${baseUrl}${type}/${id}`, {muteHttpExceptions: true});
  return JSON.parse(response.getContentText());
}