const fallbackContent = {
  businessName: "Aan Tafel Bij San",
  businessSubtitle: "Wekelijks vers huisgemaakt afhaalmenu",
  whatsappNumber: "31619912663",
  orderDeadline: "uiterlijk maandag voor 20:00",
  pickupMoment: "woensdag tussen 17:30 - 18:00",
  pickupAddress: "Bloesemgeel 13, Rosmalen",
  paymentMethod: "Betaling vooraf via Tikkie",
  weekLabel: "Weekmenu 15",
  servingDate: "woensdag 8 april",
  tagline: "Even niet koken, wel genieten",
  dishTitle: "Kippendij in romige champignonsaus",
  dishDescription: "met oregano-krieltjes en boontjes met knoflook",
  invitation: "Eet je mee?",
  priceText: "€ 12,00 per persoon",
  maxPortionsText: "Maximaal 5 porties, op is op"
};

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function parseWeekmenuText(text) {
  const result = { ...fallbackContent };
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (key) {
      result[key] = value;
    }
  }

  return result;
}

function buildWhatsAppMessage(content) {
  return [
    `Hallo San, ik wil graag bestellen voor ${content.weekLabel}.`,
    "",
    `Menu: ${content.dishTitle}`,
    `Datum: ${content.servingDate}`,
    "",
    "Naam:",
    "Aantal porties:"
  ].join("\n");
}

function setUpContent(content) {
  setText("businessName", content.businessName);
  setText("businessSubtitle", content.businessSubtitle);
  setText("menuWeekLabel", content.weekLabel);
  setText("menuServingDate", content.servingDate);
  setText("menuTagline", content.tagline);
  setText("menuDishTitle", content.dishTitle);
  setText("menuDishDescription", content.dishDescription);
  setText("menuInvitation", content.invitation);
  setText("menuPrice", content.priceText);
  setText("paymentMethod", content.paymentMethod);
  setText("orderDeadline", `Bestellen: ${content.orderDeadline}`);
  setText("pickupMoment", `Afhalen: ${content.pickupMoment}`);
  setText("pickupAddress", content.pickupAddress);
  setText("maxPortionsText", content.maxPortionsText);

  document.title = `${content.businessName} | ${content.weekLabel}`;

  const whatsAppLink = document.getElementById("whatsAppLink");
  const buildFreshWhatsAppUrl = () => {
    const message = encodeURIComponent(buildWhatsAppMessage(content));
    return `https://wa.me/${content.whatsappNumber}?text=${message}`;
  };

  whatsAppLink.href = buildFreshWhatsAppUrl();
  whatsAppLink.addEventListener("click", () => {
    whatsAppLink.href = buildFreshWhatsAppUrl();
  });
}

async function loadContent() {
  try {
    const response = await fetch("weekmenu.txt", { cache: "no-store" });

    if (!response.ok) {
      throw new Error("weekmenu.txt kon niet worden geladen");
    }

    const text = await response.text();
    return parseWeekmenuText(text);
  } catch (error) {
    return fallbackContent;
  }
}

loadContent().then(setUpContent);
