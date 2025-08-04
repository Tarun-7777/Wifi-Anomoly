// static/js/history.js (Connected to Django API)

// Fetch anomaly history from Django API
async function fetchAnomalyHistory() {
  try {
    const response = await fetch("/api/live-data/");
    const result = await response.json();

    if (result.success && result.recent_data) {
      const anomalies = result.recent_data.filter(item => item.Status === "Anomaly");
      updateHistoryTable(anomalies);
    } else {
      console.warn("No data or API error:", result.error);
      updateHistoryTable([]);
    }
  } catch (error) {
    console.error("Error fetching history data:", error);
  }
}

// Update HTML table
function updateHistoryTable(data) {
  const historyTable = document.getElementById("historyTable");
  historyTable.innerHTML = "";

  if (data.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="5" style="text-align:center;">No anomalies found</td>`;
    historyTable.appendChild(row);
    return;
  }

  data.forEach(packet => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${packet.Timestamp || ""}</td>
      <td>${packet.Source_IP || ""}</td>
      <td>${packet.Dest_IP || ""}</td>
      <td>${packet.Length || 0} bytes</td>
      <td class="${packet.Status === "Anomaly" ? "status-anomaly" : "status-normal"}">
        ${packet.Status}
      </td>
    `;
    historyTable.appendChild(row);
  });
}

// Filter table by keyword
function filterHistory() {
  const keyword = document.getElementById("searchInput").value.toLowerCase();
  const rows = document.querySelectorAll("#historyTable tr");

  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(keyword) ? "" : "none";
  });
}

// Initial load
fetchAnomalyHistory();

// Refresh every 10 seconds
setInterval(fetchAnomalyHistory, 10000);
