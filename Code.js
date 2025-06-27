function onHomepage(e) {
  return showSidebarCard();
}

function showSidebarCard() {
  const card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Marvelab Assistant"))
    .addSection(
      CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText("Bienvenue dans le module Marvelab."))
        .addWidget(
          CardService.newTextButton()
            .setText("📂 Ouvrir l'interface")
            .setOnClickAction(CardService.newAction().setFunctionName("showSidebarFromCard"))
        )
    )
    .build();
  return card;
}

function showSidebarFromCard() {
  const template = HtmlService.createTemplateFromFile("Sidebar");
  const html = template.evaluate()
    .setTitle("Marvelab Add-on")
    .setWidth(300);
  DocumentApp.getUi().showSidebar(html);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}


function generateConclusion() {
  const baseUrl = "https://marvelab-api.onrender.com/";
  const types = ["notes", "interpretations"];
  const allData = [];

  try {
    types.forEach(type => {
      const response = UrlFetchApp.fetch(baseUrl + type);
      const json = JSON.parse(response.getContentText());
      allData.push({ type, data: json });
    });

    let prompt = "Voici des données provenant de différentes catégories. Fais une synthèse claire, concise, et pertinente de l’ensemble :\n\n";

    allData.forEach(section => {
      prompt += `📁 ${section.type.toUpperCase()}:\n`;
      section.data.forEach((item, index) => {
        prompt += ` - ${JSON.stringify(item, null, 2)}\n`;
      });
      prompt += "\n";
    });

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
    };

    const geminiResponse = UrlFetchApp.fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY"),
      {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
      }
    );

    const result = JSON.parse(geminiResponse.getContentText());

    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ Aucune réponse générée.";

    DocumentApp.getActiveDocument().getBody().appendParagraph(text);

  } catch (err) {
    DocumentApp.getActiveDocument().getBody().appendParagraph("❌ Erreur lors de la génération de la synthèse : " + err.message);
    Logger.log("Erreur generateConclusion: " + err);
  }
}

function fetchAllItems() {
  const types = ["notes", "interpretations"];
  const baseUrl = "https://marvelab-api.onrender.com/";
  const result = [];

  types.forEach(type => {
    try {
      const response = UrlFetchApp.fetch(baseUrl + type);
      const data = JSON.parse(response.getContentText());

      data.forEach(item => result.push({ type, content: item }));
    } catch (e) {
      Logger.log(`Erreur lors du fetch de ${type} : ${e}`);
      
    }
  });

  return result;
}

function generateSynthesisFromSelection(selectedItems) {
  let prompt = "Voici une sélection de données issues de différentes catégories. Fais une synthèse cohérente et pertinente :\n\n";

  selectedItems.forEach(item => {
    prompt += `📁 ${item.type.toUpperCase()} :\n${typeof item.content === "string" ? item.content : JSON.stringify(item.content, null, 2)}\n\n`;
  });

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: promptText || "Prompt vide (fallback)" }
        ]
      }
    ]
  };

  const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");

  const response = UrlFetchApp.fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
  });

  const result = JSON.parse(response.getContentText());
  const output = result?.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ Erreur lors de la génération de la synthèse.";

  DocumentApp.getActiveDocument().getBody().appendParagraph(output);
}

function generateConclusionFromPrompt(promptText) {
  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: promptText || "Prompt vide (fallback)" }
        ]
      }
    ]
  };

  const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");

  const response = UrlFetchApp.fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const result = JSON.parse(response.getContentText());

  Logger.log("📨 Résultat Gemini brut : " + JSON.stringify(result));

  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ Aucune réponse générée.";

  DocumentApp.getActiveDocument().getBody().appendParagraph(text);
}

function getSelectedText() {
  const selection = DocumentApp.getActiveDocument().getSelection();
  if (!selection) throw new Error("Aucune sélection détectée.");

  let selectedText = "";

  selection.getRangeElements().forEach(function (rangeElement) {
    if (rangeElement.getElement().editAsText && rangeElement.isPartial()) {
      const textElement = rangeElement.getElement().editAsText();
      selectedText += textElement.getText().substring(rangeElement.getStartOffset(), rangeElement.getEndOffsetInclusive() + 1) + " ";
    }
  });

  return selectedText.trim();
}

function replaceSelectedText(newText) {
  const selection = DocumentApp.getActiveDocument().getSelection();
  if (!selection) throw new Error("Aucune sélection détectée.");

  selection.getRangeElements().forEach(function (rangeElement) {
    if (rangeElement.getElement().editAsText && rangeElement.isPartial()) {
      const textElement = rangeElement.getElement().editAsText();
      textElement.deleteText(rangeElement.getStartOffset(), rangeElement.getEndOffsetInclusive());
      textElement.insertText(rangeElement.getStartOffset(), newText);
    }
  });
}

function correctSelectedTextWithAI() {
  const text = getSelectedText();
  const prompt = `Corrige l'orthographe, la grammaire et la ponctuation de ce texte : "${text}. Si il n'y a rien à corriger recopie simplement le texte d'origine."`;

  return sendGeminiPrompt(prompt, replaceSelectedText);
}

function reformulateSelectedTextWithAI() {
  const text = getSelectedText();
  const prompt = `Reformule ce texte de manière plus claire et fluide : "${text}. Ne propose pas plusieurs options choisis simplement la meilleure reformulation."`;

  return sendGeminiPrompt(prompt, replaceSelectedText);
}

function sendGeminiPrompt(prompt, callback) {
  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }]
  };

  const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");

  const response = UrlFetchApp.fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const result = JSON.parse(response.getContentText());
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (text) {
    callback(text);
  } else {
    throw new Error("Aucune réponse générée.");
  }
}

function generateFromSelectedText(promptText) {
  const selected = getSelectedText();
  const prompt = `${promptText}\n\n"${selected}"`;

  sendGeminiPrompt(prompt, replaceSelectedText);
}

function generateConstructiveCriticism() {
  const text = getSelectedText();
  if (!text) throw new Error("Aucune sélection détectée.");

  const prompt = `Voici un extrait de texte :\n\n"${text}"\n\nDonne une critique constructive en français, sous forme de paragraphe court. Mets en avant les points forts, mais aussi ce qui pourrait être amélioré. Ne réécris pas le texte.`;

  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }]
  };

  const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");

  const response = UrlFetchApp.fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    }
  );

  const result = JSON.parse(response.getContentText());
  const textResult = result?.candidates?.[0]?.content?.parts?.[0]?.text || "❌ Aucune critique générée.";

  return textResult;
}

function getSelectedTextForPrompt(predefPrompt, customPrompt) {
  const selection = DocumentApp.getActiveDocument().getSelection();
  if (!selection) throw new Error("Aucune sélection dans le document.");

  const rangeElements = selection.getRangeElements();
  const textParts = rangeElements.map(re => {
    const el = re.getElement();
    if (el.editAsText) return el.asText().getText();
    return "";
  });

  const selectedText = textParts.join("\n").trim();
  if (!selectedText) throw new Error("Aucun texte sélectionné.");

  const finalPrompt = `${predefPrompt}${customPrompt ? ", " + customPrompt : ""}\n\n${selectedText}`;

  return sendGeminiPrompt(finalPrompt, insertTextToDoc);
}