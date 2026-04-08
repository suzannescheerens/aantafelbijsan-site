const fallbackContent = {
  businessName: "Aan Tafel Bij San",
  businessSubtitle: "Wekelijks vers huisgemaakt afhaalmenu",
  whatsappNumber: "31619912663",
  instagramUrl: "",
  instagramLabel: "Volg op Instagram",
  publishAt: "",
  vacationEnabled: "false",
  vacationTitle: "Ik ben even op vakantie",
  vacationMessage: "Vanwege vakantie is bestellen tijdelijk niet mogelijk. Daarna ben ik weer terug met een nieuw weekmenu.",
  vacationOrderText: "Tijdens mijn vakantie neem ik geen bestellingen aan. Via Instagram laat ik weten wanneer ik weer terug ben.",
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

function setVisibility(id, visible) {
  const element = document.getElementById(id);
  if (element) {
    element.hidden = !visible;
  }
}

function setPreviewVisibility(visible, label = "Preview") {
  const element = document.getElementById("previewNote");
  if (!element) {
    return;
  }

  element.textContent = visible ? label : "";
  element.classList.toggle("is-visible", visible);
}

function setLink(id, href, label) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }

  const hasHref = Boolean(href);
  element.hidden = !hasHref;

  if (!hasHref) {
    element.removeAttribute("href");
    return;
  }

  element.href = href;

  if (label) {
    element.setAttribute("aria-label", label);
    element.setAttribute("title", label);
  }
}

function parseWeekmenuText(text, baseContent = fallbackContent) {
  const result = { ...baseContent };
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

function isScheduledMenuLive(content) {
  if (!content.publishAt) {
    return false;
  }

  const publishTime = Date.parse(content.publishAt);
  return Number.isFinite(publishTime) && Date.now() >= publishTime;
}

function isTruthy(value) {
  return String(value).trim().toLowerCase() === "true";
}

function isWithinWindow(startAt, endAt) {
  const now = Date.now();
  const start = startAt ? Date.parse(startAt) : Number.NEGATIVE_INFINITY;
  const end = endAt ? Date.parse(endAt) : Number.POSITIVE_INFINITY;

  return Number.isFinite(start) && Number.isFinite(end) ? now >= start && now <= end : now >= start && now <= end;
}

function isVacationLive(content) {
  return isTruthy(content.enabled) && isWithinWindow(content.startAt, content.endAt);
}

function getPreviewMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get("preview");
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

function setUpContent(content, options = {}) {
  setText("businessName", content.businessName);
  setText("businessSubtitle", content.businessSubtitle);
  setPreviewVisibility(Boolean(options.isPreview), options.previewLabel || "Preview");
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
  setText("vacationTitle", content.vacationTitle);
  setText("vacationMessage", content.vacationMessage);
  setText("vacationOrderText", content.vacationOrderText);
  setVisibility("pickupAddressItem", Boolean(content.pickupAddress));
  setVisibility("socialBlock", Boolean(content.instagramUrl));
  setVisibility("vacationBlock", Boolean(options.isVacation));
  setVisibility("vacationOrderNote", Boolean(options.isVacation));
  setVisibility("menuContent", !options.isVacation);
  setVisibility("orderContent", !options.isVacation);
  setLink("instagramLink", content.instagramUrl, content.instagramLabel);

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

async function loadTextFile(path) {
  const response = await fetch(path, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`${path} kon niet worden geladen`);
  }

  return response.text();
}

async function loadContent() {
  const previewMode = getPreviewMode();
  let currentContent = fallbackContent;

  try {
    const currentText = await loadTextFile("weekmenu.txt");
    currentContent = parseWeekmenuText(currentText);
  } catch (error) {
    currentContent = fallbackContent;
  }

  try {
    const scheduledText = await loadTextFile("weekmenu-next.txt");
    const scheduledContent = parseWeekmenuText(scheduledText, currentContent);

    if (previewMode === "next") {
      return {
        content: scheduledContent,
        options: { isPreview: true, previewLabel: "Preview van het volgende menu" }
      };
    }

    if (isScheduledMenuLive(scheduledContent)) {
      return {
        content: scheduledContent,
        options: { isPreview: false }
      };
    }
  } catch (error) {
    // Geen gepland menu gevonden; gebruik gewoon het live menu.
  }

  try {
    const vacationText = await loadTextFile("vacation.txt");
    const vacationContent = parseWeekmenuText(vacationText, currentContent);

    if (previewMode === "vacation") {
      return {
        content: {
          ...currentContent,
          vacationTitle: vacationContent.title || fallbackContent.vacationTitle,
          vacationMessage: vacationContent.message || fallbackContent.vacationMessage,
          vacationOrderText: vacationContent.orderText || fallbackContent.vacationOrderText
        },
        options: { isPreview: true, isVacation: true, previewLabel: "Preview van vakantiebericht" }
      };
    }

    if (isVacationLive(vacationContent)) {
      return {
        content: {
          ...currentContent,
          vacationTitle: vacationContent.title || fallbackContent.vacationTitle,
          vacationMessage: vacationContent.message || fallbackContent.vacationMessage,
          vacationOrderText: vacationContent.orderText || fallbackContent.vacationOrderText
        },
        options: { isPreview: false, isVacation: true }
      };
    }
  } catch (error) {
    // Geen vakantiebericht gevonden; gebruik gewoon het normale menu.
  }

  return {
    content: currentContent,
    options: { isPreview: false }
  };
}

loadContent().then(({ content, options }) => setUpContent(content, options));
