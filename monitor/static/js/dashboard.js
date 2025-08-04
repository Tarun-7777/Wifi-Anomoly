// Dashboard JavaScript for Real-time Network Monitoring
class NetworkDashboard {
    constructor() {
        this.charts = {};
        this.updateInterval = 5000; // 5 seconds
        this.maxDataPoints = 50; // Keep last 50 data points
        this.recentPackets = [];
        this.isUpdating = false;
        
        this.init();
    }

    init() {
        this.initializeCharts();
        this.startRealTimeUpdates();
        this.bindEventListeners();
        this.loadInitialData();
    }

    initializeCharts() {
        // Initialize Chart.js charts
        this.initStatsChart();
        this.initHourlyChart();
        this.initPacketFlowChart();
        this.initProtocolChart();
    }

    initStatsChart() {
        const ctx = document.getElementById('statsChart');
        if (!ctx) return;

        this.charts.stats = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Normal Packets', 'Anomaly Packets'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#10B981', '#EF4444'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#374151',
                            font: {
                                size: 12
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Packet Status Distribution',
                        color: '#1F2937',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                },
                animation: {
                    animateScale: true,
                    animateRotate: true
                }
            }
        });
    }

    initHourlyChart() {
        const ctx = document.getElementById('hourlyChart');
        if (!ctx) return;

        this.charts.hourly = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                datasets: [
                    {
                        label: 'Normal Packets',
                        data: new Array(24).fill(0),
                        borderColor: '#10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Anomaly Packets',
                        data: new Array(24).fill(0),
                        borderColor: '#EF4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '24-Hour Packet Analysis',
                        color: '#1F2937',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#E5E7EB'
                        }
                    },
                    x: {
                        grid: {
                            color: '#E5E7EB'
                        }
                    }
                }
            }
        });
    }

    initPacketFlowChart() {
        const ctx = document.getElementById('packetFlowChart');
        if (!ctx) return;

        this.charts.packetFlow = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Packets per Minute',
                    data: [],
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Real-time Packet Flow',
                        color: '#1F2937',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#E5E7EB'
                        }
                    },
                    x: {
                        grid: {
                            color: '#E5E7EB'
                        }
                    }
                },
                animation: {
                    duration: 1000
                }
            }
        });
    }

    initProtocolChart() {
        const ctx = document.getElementById('protocolChart');
        if (!ctx) return;

        this.charts.protocol = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Packet Count',
                    data: [],
                    backgroundColor: [
                        '#3B82F6', '#10B981', '#F59E0B', 
                        '#EF4444', '#8B5CF6', '#06B6D4'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Protocol Distribution',
                        color: '#1F2937',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#E5E7EB'
                        }
                    }
                }
            }
        });
    }

    async loadInitialData() {
        try {
            const response = await fetch('/api/live-data/');
            const data = await response.json();
            
            if (data.success) {
                this.updateDashboard(data);
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load initial data');
        }
    }

    startRealTimeUpdates() {
        this.updateTimer = setInterval(() => {
            this.fetchLiveData();
        }, this.updateInterval);

        // Also update stats more frequently
        this.statsTimer = setInterval(() => {
            this.fetchCurrentStats();
        }, 2000);
    }

    async fetchLiveData() {
        if (this.isUpdating) return;
        
        this.isUpdating = true;
        
        try {
            const response = await fetch('/api/live-data/');
            const data = await response.json();
            
            if (data.success) {
                this.updateDashboard(data);
                this.updateLastUpdatedTime();
            } else {
                this.showError(data.error || 'Failed to fetch live data');
            }
        } catch (error) {
            console.error('Error fetching live data:', error);
            this.showError('Network error occurred');
        } finally {
            this.isUpdating = false;
        }
    }

    async fetchCurrentStats() {
        try {
            const response = await fetch('/api/current-stats/');
            const data = await response.json();
            
            if (data.success) {
                this.updateStatsOnly(data.stats);
                this.updateQueueInfo(data.queue_size);
            }
        } catch (error) {
            console.error('Error fetching current stats:', error);
        }
    }

    updateDashboard(data) {
        // Update statistics
        this.updateStatsDisplay(data.stats);
        this.updateStatsChart(data.stats);
        
        // Update recent packets (only show last 10)
        this.updateRecentPackets(data.recent_data);
        
        // Update charts with new data
        this.updatePacketFlowChart(data.recent_data);
        this.updateProtocolChart(data.recent_data);
        
        // Update hourly chart if hourly data is available
        if (data.hourly_stats) {
            this.updateHourlyChart(data.hourly_stats);
        }
    }

    updateStatsOnly(stats) {
        this.updateStatsDisplay(stats);
        this.updateStatsChart(stats);
    }

    updateStatsDisplay(stats) {
        // Update stat cards
        document.getElementById('totalPackets').textContent = stats.total_packets || 0;
        document.getElementById('normalPackets').textContent = stats.normal_packets || 0;
        document.getElementById('anomalyPackets').textContent = stats.anomaly_packets || 0;
        
        const anomalyRate = document.getElementById('anomalyRate');
        if (anomalyRate) {
            const rate = (stats.anomaly_percentage || 0).toFixed(2);
            anomalyRate.textContent = `${rate}%`;
            
            // Color code the anomaly rate
            if (rate > 10) {
                anomalyRate.className = 'text-red-600 font-bold';
            } else if (rate > 5) {
                anomalyRate.className = 'text-yellow-600 font-bold';
            } else {
                anomalyRate.className = 'text-green-600 font-bold';
            }
        }
    }

    updateStatsChart(stats) {
        if (!this.charts.stats) return;
        
        const normalCount = stats.normal_packets || 0;
        const anomalyCount = stats.anomaly_packets || 0;
        
        this.charts.stats.data.datasets[0].data = [normalCount, anomalyCount];
        this.charts.stats.update('active');
    }

    updateRecentPackets(packets) {
        const container = document.getElementById('recentPackets');
        if (!container || !packets) return;

        // Keep only the last 10 packets
        const recentTen = packets.slice(-10).reverse();
        
        container.innerHTML = '';
        
        recentTen.forEach((packet, index) => {
            const row = document.createElement('tr');
            row.className = index % 2 === 0 ? 'bg-gray-50' : 'bg-white';
            
            const statusClass = packet.Status === 'Anomaly' ? 
                'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
            
            row.innerHTML = `
                <td class="px-4 py-2 text-sm">${packet.Timestamp || 'N/A'}</td>
                <td class="px-4 py-2 text-sm font-mono">${packet.Source_IP || 'N/A'}</td>
                <td class="px-4 py-2 text-sm font-mono">${packet.Dest_IP || 'N/A'}</td>
                <td class="px-4 py-2 text-sm">${this.getProtocolName(packet.Protocol)}</td>
                <td class="px-4 py-2 text-sm">${packet.Length || 'N/A'}</td>
                <td class="px-4 py-2">
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${statusClass}">
                        ${packet.Status || 'Unknown'}
                    </span>
                </td>
            `;
            
            container.appendChild(row);
        });
    }

    updatePacketFlowChart(packets) {
        if (!this.charts.packetFlow || !packets) return;
        
        // Group packets by minute
        const now = new Date();
        const timeLabels = [];
        const packetCounts = [];
        
        // Create time labels for last 10 minutes
        for (let i = 9; i >= 0; i--) {
            const timePoint = new Date(now.getTime() - i * 60000);
            timeLabels.push(timePoint.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
            packetCounts.push(0);
        }
        
        // Count packets for each minute
        packets.forEach(packet => {
            if (packet.Timestamp) {
                const packetTime = new Date(packet.Timestamp);
                const minutesDiff = Math.floor((now - packetTime) / 60000);
                if (minutesDiff >= 0 && minutesDiff < 10) {
                    packetCounts[9 - minutesDiff]++;
                }
            }
        });
        
        this.charts.packetFlow.data.labels = timeLabels;
        this.charts.packetFlow.data.datasets[0].data = packetCounts;
        this.charts.packetFlow.update('active');
    }

    updateProtocolChart(packets) {
        if (!this.charts.protocol || !packets) return;
        
        // Count protocols
        const protocolCounts = {};
        packets.forEach(packet => {
            const protocol = this.getProtocolName(packet.Protocol);
            protocolCounts[protocol] = (protocolCounts[protocol] || 0) + 1;
        });
        
        const protocols = Object.keys(protocolCounts);
        const counts = Object.values(protocolCounts);
        
        this.charts.protocol.data.labels = protocols;
        this.charts.protocol.data.datasets[0].data = counts;
        this.charts.protocol.update('active');
    }

    updateHourlyChart(hourlyData) {
        if (!this.charts.hourly || !hourlyData) return;
        
        const normalData = new Array(24).fill(0);
        const anomalyData = new Array(24).fill(0);
        
        hourlyData.forEach(item => {
            if (item.hour >= 0 && item.hour < 24) {
                normalData[item.hour] = item.normal || 0;
                anomalyData[item.hour] = item.anomaly || 0;
            }
        });
        
        this.charts.hourly.data.datasets[0].data = normalData;
        this.charts.hourly.data.datasets[1].data = anomalyData;
        this.charts.hourly.update('active');
    }

    updateQueueInfo(queueSize) {
        const queueInfo = document.getElementById('queueSize');
        if (queueInfo) {
            queueInfo.textContent = queueSize || 0;
        }
    }

    updateLastUpdatedTime() {
        const lastUpdated = document.getElementById('lastUpdated');
        if (lastUpdated) {
            lastUpdated.textContent = new Date().toLocaleTimeString();
        }
    }

    getProtocolName(protocolNumber) {
        const protocols = {
            1: 'ICMP',
            6: 'TCP',
            17: 'UDP',
            2: 'IGMP',
            47: 'GRE',
            50: 'ESP',
            51: 'AH'
        };
        return protocols[protocolNumber] || `Protocol ${protocolNumber}`;
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4';
            errorDiv.style.display = 'block';
            
            // Hide error after 5 seconds
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
    }

    bindEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.fetchLiveData();
            });
        }

        // Retrain model button
        const retrainBtn = document.getElementById('retrainBtn');
        if (retrainBtn) {
            retrainBtn.addEventListener('click', () => {
                this.retrainModel();
            });
        }

        // Auto-refresh toggle
        const autoRefreshToggle = document.getElementById('autoRefresh');
        if (autoRefreshToggle) {
            autoRefreshToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.startRealTimeUpdates();
                } else {
                    this.stopRealTimeUpdates();
                }
            });
        }
    }

    async retrainModel() {
        const retrainBtn = document.getElementById('retrainBtn');
        const originalText = retrainBtn ? retrainBtn.textContent : '';
        
        try {
            if (retrainBtn) {
                retrainBtn.textContent = 'Training...';
                retrainBtn.disabled = true;
            }
            
            const response = await fetch('/api/retrain-model/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('Model retrained successfully!');
                this.fetchLiveData(); // Refresh data
            } else {
                this.showError(data.error || 'Failed to retrain model');
            }
        } catch (error) {
            console.error('Error retraining model:', error);
            this.showError('Network error occurred');
        } finally {
            if (retrainBtn) {
                retrainBtn.textContent = originalText;
                retrainBtn.disabled = false;
            }
        }
    }

    showSuccess(message) {
        const successDiv = document.getElementById('successMessage');
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.className = 'bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4';
            successDiv.style.display = 'block';
            
            setTimeout(() => {
                successDiv.style.display = 'none';
            }, 5000);
        }
    }

    stopRealTimeUpdates() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }
        if (this.statsTimer) {
            clearInterval(this.statsTimer);
        }
    }

    destroy() {
        this.stopRealTimeUpdates();
        
        // Destroy charts
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded. Please include Chart.js library.');
        return;
    }
    
    // Initialize the dashboard
    window.networkDashboard = new NetworkDashboard();
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (window.networkDashboard) {
        window.networkDashboard.destroy();
    }
});