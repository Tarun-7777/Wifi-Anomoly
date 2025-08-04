// Fetch live data from the Django backend API
async function fetchLiveData() {
  try {
    const response = await fetch("/api/live-data/");
    const data = await response.json();

    if (data.success) {
      updateStats(data.stats);
      updateTable(data.recent_data.slice(-10));  // Last 10 packets
    } else {
      console.error("API error:", data.error || "Unknown error");
    }
  } catch (error) {
    console.error("Network error fetching live data:", error);
  }
}

// Update the statistics section (total packets and anomaly percentage)
function updateStats(stats) {
  const totalElem = document.getElementById("totalPackets");
  const anomalyElem = document.getElementById("anomalyPercentage");

  totalElem.textContent = stats.total_packets || 0;
  anomalyElem.textContent = (stats.anomaly_percentage ?? 0).toFixed(1) + "%";

}

// Update the live data table
function updateTable(packets) {
  const tableBody = document.getElementById("liveDataTable");
  tableBody.innerHTML = "";

  packets.forEach(packet => {
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
    tableBody.appendChild(row);
  });
}

// Initial load
fetchLiveData();

// Refresh every 5 seconds
setInterval(fetchLiveData, 5000);
