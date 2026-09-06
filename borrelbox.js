const supabaseUrl = "https://umfrqvnyflzmrfomqgqo.supabase.co";
const supabasePublishableKey = "sb_publishable_pUIjT7d0zEsvXZTca9uyiw__0BUJotI";
const confirmationFunctionUrl = `${supabaseUrl}/functions/v1/smooth-service`;

const reservationEmail = "aantafelbijsan@gmail.com";
const reservationEndpoint = `https://formsubmit.co/ajax/${reservationEmail}`;

const fallbackBorrelboxDates = [
  { date: "2026-09-05", status: "available", remainingBoxes: 4, maxBoxes: 4 },
  { date: "2026-09-12", status: "closed", remainingBoxes: 0, maxBoxes: 4 },
  { date: "2026-09-19", status: "full", remainingBoxes: 0, maxBoxes: 4 },
  { date: "2026-09-26", status: "available", remainingBoxes: 4, maxBoxes: 4 },
  { date: "2026-10-03", status: "available", remainingBoxes: 4, maxBoxes: 4 },
  { date: "2026-10-04", status: "available", remainingBoxes: 4, maxBoxes: 4 },
  { date: "2026-10-11", status: "available", remainingBoxes: 4, maxBoxes: 4 },
  { date: "2026-10-17", status: "available", remainingBoxes: 4, maxBoxes: 4 },
  { date: "2026-10-18", status: "available", remainingBoxes: 4, maxBoxes: 4 },
  { date: "2026-10-24", status: "available", remainingBoxes: 4, maxBoxes: 4 },
  { date: "2026-10-31", status: "available", remainingBoxes: 4, maxBoxes: 4 },
  { date: "2026-11-07", status: "available", remainingBoxes: 4, maxBoxes: 4 },
  { date: "2026-11-22", status: "available", remainingBoxes: 4, maxBoxes: 4 },
  { date: "2026-11-29", status: "available", remainingBoxes: 4, maxBoxes: 4 }
];

const manuallyClosedBorrelboxDates = new Set(["2026-09-12"]);
const manuallyFullBorrelboxDates = new Set(["2026-09-19"]);

const monthGroups = document.getElementById("monthGroups");
const reservationPlaceholder = document.getElementById("reservationPlaceholder");
const reservationInfo = document.getElementById("reservationInfo");
const reservationForm = document.getElementById("reservationForm");
const reservationConfirmation = document.getElementById("reservationConfirmation");
const reservationSubmit = document.getElementById("reservationSubmit");
const quantitySelect = document.getElementById("reservationQuantity");
const quantityHelp = document.getElementById("quantityHelp");

let selectedEntry = null;
let borrelboxDates = [];

function formatMonth(dateValue) {
  return new Intl.DateTimeFormat("nl-NL", {
    month: "long",
    year: "numeric"
  }).format(new Date(`${dateValue}T12:00:00`));
}

function formatDateLabel(dateValue) {
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date(`${dateValue}T12:00:00`));
}

function formatLocalDateKey(dateValue) {
  if (!dateValue) {
    return "";
  }

  if (typeof dateValue === "string") {
    return dateValue.slice(0, 10);
  }

  if (dateValue instanceof Date && !Number.isNaN(dateValue.getTime())) {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, "0");
    const day = String(dateValue.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return String(dateValue).slice(0, 10);
}

function getTodayKey() {
  return formatLocalDateKey(new Date());
}

function getBorrelboxCloseMoment(dateValue) {
  const dateKey = formatLocalDateKey(dateValue);
  if (!dateKey) return null;

  const [year, month, day] = dateKey.split("-").map(Number);
  const closeMoment = new Date(year, month - 1, day, 17, 0, 0, 0);
  closeMoment.setDate(closeMoment.getDate() - 2);

  return closeMoment;
}

function isBorrelboxDateClosed(dateValue, now = new Date()) {
  const dateKey = formatLocalDateKey(dateValue);
  if (manuallyClosedBorrelboxDates.has(dateKey)) {
    return true;
  }

  const closeMoment = getBorrelboxCloseMoment(dateValue);
  return Boolean(closeMoment) && now >= closeMoment;
}

function isBorrelboxDateFull(dateValue) {
  return manuallyFullBorrelboxDates.has(formatLocalDateKey(dateValue));
}

function shouldShowPromoFromDate(showFromDate) {
  if (!showFromDate) {
    return true;
  }

  const params = new URLSearchParams(window.location.search);
  const isPreview =
    params.get("preview") === "kennismakingskorting" ||
    params.get("promo") === "kennismakingskorting" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.protocol === "file:";

  return isPreview || getTodayKey() >= showFromDate;
}

function setupBorrelPromo() {
  const promo = document.getElementById("borrelPromo");

  if (!promo) {
    return;
  }

  promo.hidden = !shouldShowPromoFromDate(promo.dataset.showFrom);
}

function getStatusLabel(status) {
  if (status === "available") {
    return "Beschikbaar";
  }

  if (status === "full") {
    return "Vol";
  }

  return "Gesloten";
}

function getStatusClass(status) {
  if (status === "available") {
    return "status-available";
  }

  if (status === "full") {
    return "status-full";
  }

  return "status-closed";
}

function buildMonthMap(entries) {
  return entries.reduce((groups, entry) => {
    const monthKey = entry.monthLabel || formatMonth(entry.date);

    if (!groups.has(monthKey)) {
      groups.set(monthKey, []);
    }

    groups.get(monthKey).push(entry);
    return groups;
  }, new Map());
}

function updateQuantityOptions(entry) {
  quantitySelect.innerHTML = "";
  const maxSelectable = Math.min(entry.remainingBoxes || entry.maxBoxes || 0, entry.maxBoxes || 4);

  for (let quantity = 1; quantity <= maxSelectable; quantity += 1) {
    const option = document.createElement("option");
    option.value = String(quantity);
    option.textContent = String(quantity);
    quantitySelect.append(option);
  }

  quantityHelp.textContent =
    maxSelectable > 0
      ? `Je kunt voor deze datum maximaal ${maxSelectable} box${maxSelectable === 1 ? "" : "en"} reserveren.`
      : "Voor deze datum zijn geen boxen meer beschikbaar.";
}

function updateReservationPanel(entry) {
  reservationConfirmation.hidden = true;

  if (entry.status !== "available" || (entry.remainingBoxes || 0) <= 0) {
    reservationPlaceholder.hidden = true;
    reservationForm.hidden = true;
    reservationInfo.hidden = false;
    reservationInfo.textContent =
      entry.status === "full"
        ? "Deze datum is helaas al vol. Kies gerust een andere beschikbare datum."
        : "Voor deze datum neem ik geen borrelbox-reserveringen aan.";
    return;
  }

  reservationPlaceholder.hidden = true;
  reservationInfo.hidden = false;
  reservationInfo.innerHTML = `
    <strong>${formatDateLabel(entry.date)}</strong><br />
    Afhalen in Rosmalen tussen 13.00 en 14.00 uur
  `;
  reservationForm.hidden = false;
  updateQuantityOptions(entry);
}

function clearSelectedState() {
  document.querySelectorAll(".date-button").forEach((button) => {
    button.classList.remove("is-selected");
  });
}

function handleDateSelection(entry, button) {
  selectedEntry = entry;
  clearSelectedState();
  button.classList.add("is-selected");
  updateReservationPanel(entry);
}

function renderDateButtons(entries, preferredDate = null) {
  const groupedEntries = buildMonthMap(entries);
  monthGroups.innerHTML = "";
  let preferredSelection = null;
  let firstAvailableSelection = null;

  groupedEntries.forEach((groupEntries, monthLabel) => {
    const group = document.createElement("section");
    group.className = "month-group";

    const title = document.createElement("h4");
    title.className = "month-label";
    title.textContent = monthLabel;
    group.append(title);

    const grid = document.createElement("div");
    grid.className = "date-grid";

    groupEntries.forEach((entry) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "date-button";
      button.dataset.date = entry.date;

      button.innerHTML = `
        <div class="date-topline">
          <span class="date-label">${formatDateLabel(entry.date)}</span>
          <span class="status-chip ${getStatusClass(entry.status)}">${getStatusLabel(entry.status)}</span>
        </div>
      `;

      button.addEventListener("click", () => handleDateSelection(entry, button));

      if (preferredDate && entry.date === preferredDate && entry.status === "available") {
        preferredSelection = { entry, button };
      }

      if (!firstAvailableSelection && entry.status === "available") {
        firstAvailableSelection = { entry, button };
      }

      grid.append(button);
    });

    group.append(grid);
    monthGroups.append(group);
  });

  const selectionToUse = preferredSelection || firstAvailableSelection;

  if (selectionToUse) {
    handleDateSelection(selectionToUse.entry, selectionToUse.button);
    return;
  }

  selectedEntry = null;
  reservationPlaceholder.hidden = false;
  reservationPlaceholder.textContent = "Er zijn op dit moment geen beschikbare data om te reserveren.";
  reservationForm.hidden = true;
  reservationInfo.hidden = true;
}

function setSubmitState(isSubmitting) {
  reservationSubmit.disabled = isSubmitting;
  reservationSubmit.textContent = isSubmitting
    ? "Reservering wordt verstuurd..."
    : "Reservering versturen";
}

async function postSupabaseRpc(functionName, payload = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${supabasePublishableKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let message = "Er ging iets mis met Supabase.";

    try {
      const errorData = await response.json();
      message = errorData.message || errorData.error_description || errorData.error || message;
    } catch (_error) {
      // Use the fallback message when the response is not valid JSON.
    }

    throw new Error(message);
  }

  return response.json();
}

async function loadBorrelboxDates(preferredDate = null) {
  try {
    const data = await postSupabaseRpc("get_borrelbox_dates");
    borrelboxDates = data.map((entry) => ({
      date: entry.service_date,
      status: isBorrelboxDateClosed(entry.service_date)
        ? "closed"
        : isBorrelboxDateFull(entry.service_date)
          ? "full"
          : entry.status,
      remainingBoxes: isBorrelboxDateClosed(entry.service_date) || isBorrelboxDateFull(entry.service_date)
        ? 0
        : entry.remaining_boxes,
      maxBoxes: entry.max_boxes,
      monthLabel: formatMonth(entry.service_date)
    }));
  } catch (error) {
    borrelboxDates = fallbackBorrelboxDates.map((entry) => ({
      ...entry,
      status: isBorrelboxDateClosed(entry.date)
        ? "closed"
        : isBorrelboxDateFull(entry.date)
          ? "full"
          : entry.status,
      remainingBoxes: isBorrelboxDateClosed(entry.date) || isBorrelboxDateFull(entry.date)
        ? 0
        : entry.remainingBoxes,
      monthLabel: formatMonth(entry.date)
    }));
    reservationInfo.hidden = false;
    reservationInfo.textContent =
      "De live voorraad kon niet worden opgehaald. Daarom laat ik tijdelijk de previewdata zien.";
  }

  renderDateButtons(borrelboxDates, preferredDate);
}

async function sendReservationNotification(formData, entry) {
  const payload = new FormData();
  payload.append("_subject", `Nieuwe reservering borrelbox | ${formatDateLabel(entry.date)}`);
  payload.append("_captcha", "false");
  payload.append("_template", "table");
  payload.append("_replyto", formData.get("email"));
  payload.append("Gekozen datum", formatDateLabel(entry.date));
  payload.append("Status", getStatusLabel(entry.status));
  payload.append("Aantal boxen", formData.get("quantity"));
  payload.append("Naam", formData.get("name"));
  payload.append("E-mailadres", formData.get("email"));
  payload.append("Telefoonnummer", formData.get("phone"));

  const response = await fetch(reservationEndpoint, {
    method: "POST",
    body: payload,
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("De reservering is opgeslagen, maar de e-mailmelding kon niet worden verstuurd.");
  }
}

async function sendCustomerConfirmationEmail(formData, entry) {
  const response = await fetch(confirmationFunctionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${supabasePublishableKey}`
    },
    body: JSON.stringify({
      customerName: formData.get("name"),
      customerEmail: formData.get("email"),
      serviceDate: entry.date,
      quantity: Number(formData.get("quantity"))
    })
  });

  if (!response.ok) {
    let message = "De bevestigingsmail naar de klant kon niet worden verstuurd.";

    try {
      const errorData = await response.json();
      message = errorData.error || errorData.message || message;
    } catch (_error) {
      // Keep the fallback message when the response is not valid JSON.
    }

    throw new Error(message);
  }
}

function getFriendlyReservationError(message) {
  if (!message) {
    return "Er ging iets mis met het versturen. Probeer het gerust nog een keer.";
  }

  if (message.includes("Deze datum is net vol geraakt")) {
    return "Deze datum is net vol geraakt. Kies gerust een andere beschikbare datum.";
  }

  if (message.includes("Deze datum is vol")) {
    return "Deze datum is helaas al vol. Kies gerust een andere beschikbare datum.";
  }

  if (message.includes("Deze datum is gesloten")) {
    return "Deze datum is gesloten. Kies gerust een andere beschikbare datum.";
  }

  if (message.includes("Er zijn nog maar")) {
    return message;
  }

  return "Er ging iets mis met het versturen. Probeer het gerust nog een keer.";
}

reservationForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!selectedEntry || selectedEntry.status !== "available") {
    return;
  }

  const formData = new FormData(reservationForm);
  const selectedDate = selectedEntry.date;
  reservationConfirmation.hidden = true;
  reservationInfo.hidden = false;
  let customerConfirmationSent = false;

  try {
    setSubmitState(true);

    const reservationResult = await postSupabaseRpc("create_borrelbox_reservation", {
      p_service_date: selectedDate,
      p_customer_name: formData.get("name"),
      p_customer_email: formData.get("email"),
      p_customer_phone: formData.get("phone"),
      p_quantity: Number(formData.get("quantity"))
    });

    try {
      await sendReservationNotification(formData, selectedEntry);
    } catch (notificationError) {
      console.warn(notificationError);
    }

    try {
      await sendCustomerConfirmationEmail(formData, selectedEntry);
      customerConfirmationSent = true;
    } catch (confirmationError) {
      console.warn(confirmationError);
    }

    const successMessage = `
      <strong>${formatDateLabel(selectedDate)}</strong><br />
      ${customerConfirmationSent
        ? "Je reservering is opgeslagen. Je ontvangt nu ook een bevestigingsmail in je mailbox."
        : "Je reservering is opgeslagen. Ik neem contact met je op voor de bevestiging en het betaalverzoek."}
    `;
    reservationForm.reset();

    const refreshedPreferredDate = reservationResult.status === "available" ? selectedDate : null;
    await loadBorrelboxDates(refreshedPreferredDate);
    reservationConfirmation.hidden = false;
    reservationInfo.hidden = false;
    reservationInfo.innerHTML = successMessage;
  } catch (error) {
    reservationInfo.textContent = getFriendlyReservationError(error.message);
    await loadBorrelboxDates(selectedDate);
  } finally {
    setSubmitState(false);
  }
});

setupBorrelPromo();
loadBorrelboxDates();
