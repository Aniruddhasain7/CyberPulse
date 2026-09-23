import React, { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Traffic from "./pages/Traffic";
import Alerts from "./pages/Alerts";
import Settings from "./pages/Settings";
import {
  checkBackendHealth,
  fetchDashboardStats,
  fetchTraffic,
  clearTraffic,
  clearAllAlerts,
  clearAllLogs,
  fetchAlerts,
  resolveAlert,
  resolveAllAlerts,
  updateAlertStatus,
  deleteAlert,
  clearResolvedAlerts,
  simulateAttackApi,
  fetchBlockedIps,
  apiBlockIp,
  apiUnblockIp,
  apiClearBlockedIps,
  fetchWhitelistIps,
  apiAddWhitelistIp,
  apiRemoveWhitelistIp,
  apiClearWhitelist,
  fetchSettings,
  apiSaveSettings,
  apiResetSettings,
  startMonitoring,
  stopMonitoring,
  fetchMonitoringStatus,
} from "./services/api";

export default function App() {

  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isTogglingMonitoring, setIsTogglingMonitoring] = useState(false);
  const [toggleAction, setToggleAction] = useState("");
  const [packetCount, setPacketCount] = useState(0);
  const [sessionPackets, setSessionPackets] = useState(0);
  const [totalPackets, setTotalPackets] = useState(0);

  const [captureInterface, setCaptureInterface] = useState("default");
  const [promiscuousMode, setPromiscuousMode] = useState(true);
  const [detectionMode, setDetectionMode] = useState("IDS");
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.80);
  const [autoBlockThreats, setAutoBlockThreats] = useState(false);
  const [flowIdleTimeout, setFlowIdleTimeout] = useState(5);

  const [backendStatus, setBackendStatus] = useState("standby");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  const [stats, setStats] = useState(null);
  const [attackBreakdown, setAttackBreakdown] = useState([]);
  const [trafficFlows, setTrafficFlows] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [blockedIps, setBlockedIps] = useState([]);
  const [whitelistIps, setWhitelistIps] = useState([]);

  const isTogglingRef = useRef(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const health = await checkBackendHealth();
      if (!health.online) {
        setBackendStatus("offline");
        if (!silent) setIsRefreshing(false);
        return;
      }

      const [
        statsRes,
        trafficRes,
        alertRes,
        blockedRes,
        whitelistRes,
        settingsRes,
        monStatusRes,
      ] = await Promise.allSettled([
        fetchDashboardStats(),
        fetchTraffic(50),
        fetchAlerts("", 50),
        fetchBlockedIps(),
        fetchWhitelistIps(),
        fetchSettings(),
        fetchMonitoringStatus(),
      ]);

      if (statsRes.status === "fulfilled" && statsRes.value) {
        setStats(statsRes.value);
        if (statsRes.value.total_packets !== undefined) setTotalPackets(statsRes.value.total_packets);
        if (statsRes.value.attack_breakdown) setAttackBreakdown(statsRes.value.attack_breakdown);
      }
      if (trafficRes.status === "fulfilled" && Array.isArray(trafficRes.value)) {
        setTrafficFlows(trafficRes.value);
      }
      if (alertRes.status === "fulfilled" && Array.isArray(alertRes.value)) {
        setAlerts(alertRes.value);
      }
      if (blockedRes.status === "fulfilled" && Array.isArray(blockedRes.value)) {
        setBlockedIps(blockedRes.value);
      }
      if (whitelistRes.status === "fulfilled" && Array.isArray(whitelistRes.value)) {
        setWhitelistIps(whitelistRes.value);
      }
      if (settingsRes.status === "fulfilled" && settingsRes.value) {
        const s = settingsRes.value;
        if (s.detectionMode) setDetectionMode(s.detectionMode);
        if (s.confidenceThreshold !== undefined)
          setConfidenceThreshold(s.confidenceThreshold);
        if (s.autoBlockThreats !== undefined)
          setAutoBlockThreats(s.autoBlockThreats);
        if (s.captureInterface) setCaptureInterface(s.captureInterface);
        if (s.promiscuousMode !== undefined)
          setPromiscuousMode(s.promiscuousMode);
        if (s.flowIdleTimeout !== undefined)
          setFlowIdleTimeout(s.flowIdleTimeout);
      }

      if (monStatusRes.status === "fulfilled" && monStatusRes.value?.running !== undefined && !isTogglingRef.current) {
        const monStatus = monStatusRes.value;
        setIsMonitoring(monStatus.running);
        if (monStatus.packets_captured !== undefined) setPacketCount(monStatus.packets_captured);
        if (monStatus.session_packets !== undefined) setSessionPackets(monStatus.session_packets);
        if (monStatus.total_packets !== undefined) setTotalPackets(monStatus.total_packets);
      }

      setBackendStatus("connected");
    } catch (err) {
      console.warn("Backend sync warning:", err.message);
      // Double check health before falsely declaring backend offline
      checkBackendHealth().then((h) => {
        if (!h.online) setBackendStatus("offline");
      }).catch(() => setBackendStatus("offline"));
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    checkBackendHealth().then((res) => {
      if (active) setBackendStatus(res.online ? "connected" : "offline");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!isMonitoring) return;
    const interval = setInterval(() => {
      if (isTogglingRef.current) return;
      fetchMonitoringStatus().then((status) => {
        if (isTogglingRef.current) return;
        if (status && status.running !== undefined) {
          setIsMonitoring(status.running);
          if (status.packets_captured !== undefined) setPacketCount(status.packets_captured);
          if (status.session_packets !== undefined) setSessionPackets(status.session_packets);
          if (status.total_packets !== undefined) setTotalPackets(status.total_packets);
        }
      }).catch(() => {});
    }, 1500);
    return () => clearInterval(interval);
  }, [isMonitoring]);

  useEffect(() => {
    if (!isMonitoring) return;
    const interval = setInterval(() => {
      if (!isTogglingRef.current) loadData(true);
    }, 4500);
    return () => clearInterval(interval);
  }, [isMonitoring, loadData]);

  const handleToggleMonitoring = async () => {
    if (isTogglingRef.current) return;
    isTogglingRef.current = true;
    setIsTogglingMonitoring(true);

    const action = isMonitoring ? "stopping" : "starting";
    setToggleAction(action);

    try {
      if (action === "stopping") {
        await stopMonitoring();
        setIsMonitoring(false);
      } else {
        await startMonitoring(captureInterface || "default");
        setIsMonitoring(true);
      }

      const status = await fetchMonitoringStatus();
      if (status && status.running !== undefined) {
        setIsMonitoring(status.running);
        if (status.packets_captured !== undefined) setPacketCount(status.packets_captured);
        if (status.session_packets !== undefined) setSessionPackets(status.session_packets);
        if (status.total_packets !== undefined) setTotalPackets(status.total_packets);
      }
    } catch (err) {
      console.error("Monitoring toggle error:", err);
    } finally {
      setIsTogglingMonitoring(false);
      setToggleAction("");
      isTogglingRef.current = false;
      loadData(true);
    }
  };

  const handleBlockIp = async (ipOrObj, reasonInput) => {
    const ip = typeof ipOrObj === "object" ? ipOrObj.ip : ipOrObj;
    const reason =
      typeof ipOrObj === "object"
        ? ipOrObj.reason
        : reasonInput || "Manual Operator Quarantine";
    if (!ip) return;

    if (whitelistIps.some((w) => w.ip === ip)) {
      alert(`Cannot block ${ip}: IP is on the Trusted Whitelist. Remove it first.`);
      return;
    }

    const optimistic = { id: Date.now(), ip, reason, blockedAt: new Date().toISOString(), packetsDropped: 0 };
    setBlockedIps((prev) => [optimistic, ...prev.filter((b) => b.ip !== ip)]);
    setTrafficFlows((prev) =>
      prev.map((f) => (f.source_ip === ip ? { ...f, status: "Blocked" } : f))
    );

    try {
      const res = await apiBlockIp({ ip, reason });
      if (res.entry) setBlockedIps((prev) => prev.map((b) => (b.ip === ip ? res.entry : b)));
    } catch (err) {
      console.error("Failed to block IP:", err);
      loadData();
    }
  };

  const handleUnblockIp = async (ip) => {
    setBlockedIps((prev) => prev.filter((b) => b.ip !== ip));
    setTrafficFlows((prev) =>
      prev.map((f) => (f.source_ip === ip ? { ...f, status: "Normal" } : f))
    );
    try {
      await apiUnblockIp(ip);
    } catch (err) {
      console.error("Failed to unblock IP:", err);
      loadData();
    }
  };

  const handleClearBlockedIps = async () => {
    setBlockedIps([]);
    try { await apiClearBlockedIps(); } catch (err) { console.error(err); loadData(); }
  };

  const handleAddWhitelistIp = async (ipOrObj, labelInput) => {
    const ip = typeof ipOrObj === "object" ? ipOrObj.ip : ipOrObj;
    const label = typeof ipOrObj === "object" ? ipOrObj.label : labelInput || "Trusted Host";
    if (!ip) return;

    const optimistic = { id: Date.now(), ip, label, addedAt: new Date().toISOString() };
    setWhitelistIps((prev) => [optimistic, ...prev.filter((w) => w.ip !== ip)]);
    setBlockedIps((prev) => prev.filter((b) => b.ip !== ip));
    setTrafficFlows((prev) =>
      prev.map((f) => (f.source_ip === ip ? { ...f, status: "Whitelisted" } : f))
    );

    try {
      const res = await apiAddWhitelistIp({ ip, label });
      if (res.entry) setWhitelistIps((prev) => prev.map((w) => (w.ip === ip ? res.entry : w)));
    } catch (err) {
      console.error("Failed to add whitelist IP:", err);
      loadData();
    }
  };

  const handleRemoveWhitelistIp = async (ip) => {
    setWhitelistIps((prev) => prev.filter((w) => w.ip !== ip));
    try { await apiRemoveWhitelistIp(ip); } catch (err) { console.error(err); loadData(); }
  };

  const handleClearWhitelist = async () => {
    setWhitelistIps([]);
    try { await apiClearWhitelist(); } catch (err) { console.error(err); loadData(); }
  };

  const handleClearTraffic = async () => {
    setIsMonitoring(false);
    setTrafficFlows([]);
    setAlerts([]);
    setAttackBreakdown([]);
    setPacketCount(0);
    setSessionPackets(0);
    setTotalPackets(0);
    try {
      await clearTraffic();
      await loadData();
    } catch (err) {
      console.error("Failed to clear traffic:", err);
    }
  };

  const handleClearAllAlerts = async () => {
    setAlerts([]);
    setAttackBreakdown([]);
    try {
      await clearAllAlerts();
      await loadData();
    } catch (err) {
      console.error("Failed to clear all alerts:", err);
    }
  };

  const handleResolveAlert = async (id) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: "Resolved" } : a)));
    try { await resolveAlert(id); loadData(); } catch (err) { console.error(err); }
  };

  const handleUpdateAlertStatus = async (id, status) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    try { await updateAlertStatus(id, status); } catch (err) { console.error(err); loadData(); }
  };

  const handleResolveAll = async () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, status: "Resolved" })));
    try { await resolveAllAlerts(); loadData(); } catch (err) { console.error(err); }
  };

  const handleDeleteAlert = async (id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    try { await deleteAlert(id); loadData(); } catch (err) { console.error(err); }
  };

  const handleClearResolvedAlerts = async () => {
    setAlerts((prev) => prev.filter((a) => a.status !== "Resolved" && a.status !== "Mitigated"));
    try { await clearResolvedAlerts(); loadData(); } catch (err) { console.error(err); }
  };

  const handleSimulateAttack = async (type = "SYN_FLOOD") => {
    try {
      const res = await simulateAttackApi(type);
      if (res.alert) {
        setAlerts((prev) => [res.alert, ...prev]);
        if (autoBlockThreats && (res.alert.severity === "Critical" || detectionMode === "IPS")) {
          handleBlockIp(res.alert.source_ip, `Auto-quarantined: ${res.alert.attack_type}`);
        }
      }
      loadData();
    } catch (err) { console.error("Simulate attack error:", err); }
  };

  const handleSaveSettings = async (partial = {}) => {
    const payload = {
      detectionMode,
      confidenceThreshold,
      autoBlockThreats,
      captureInterface,
      promiscuousMode,
      flowIdleTimeout,
      ...partial,
    };
    try {
      const res = await apiSaveSettings(payload);
      if (res?.settings) {
        const s = res.settings;
        if (s.detectionMode) setDetectionMode(s.detectionMode);
        if (s.confidenceThreshold !== undefined) setConfidenceThreshold(s.confidenceThreshold);
        if (s.autoBlockThreats !== undefined) setAutoBlockThreats(s.autoBlockThreats);
        if (s.captureInterface) setCaptureInterface(s.captureInterface);
        if (s.promiscuousMode !== undefined) setPromiscuousMode(s.promiscuousMode);
        if (s.flowIdleTimeout !== undefined) setFlowIdleTimeout(s.flowIdleTimeout);
      }
    } catch (err) { console.error("Failed to save settings:", err); }
  };

  const handleFactoryReset = async () => {
    try {
      await apiResetSettings();
      await apiClearBlockedIps();
      await apiClearWhitelist();
      await clearResolvedAlerts();
      await clearTraffic();
      loadData();
    } catch (err) { console.error("Factory reset error:", err); loadData(); }
  };

  const handleToggleDetectionMode = async () => {
    const next = detectionMode === "IPS" ? "IDS" : "IPS";
    setDetectionMode(next);
    try { await apiSaveSettings({ detectionMode: next }); }
    catch (err) { console.warn("Failed to persist detection mode:", err); }
  };

  const unresolvedAlertCount = alerts.filter((a) => a.status === "Unresolved").length;
  const titles = {
    dashboard: "Dashboard",
    traffic: "Live Traffic Flows",
    alerts: "Threat Alerts & Response",
    settings: "NIDS Settings",
  };

  return (
    <div className="min-h-screen bg-[#030508] text-slate-100 flex flex-col antialiased selection:bg-cyan-500/30 selection:text-cyan-200">

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMonitoring={isMonitoring}
        onToggleMonitoring={handleToggleMonitoring}
        isTogglingMonitoring={isTogglingMonitoring}
        toggleAction={toggleAction}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        packetCount={packetCount}
        sessionPackets={sessionPackets}
        totalPackets={totalPackets}
        alertCount={unresolvedAlertCount}
        blockedIpCount={blockedIps.length}
      />

      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Navbar
          pageTitle={titles[activeTab] || "CyberPulse NIDS"}
          onMenuClick={() => setIsSidebarOpen(true)}
          backendStatus={backendStatus}
          onRefresh={loadData}
          isRefreshing={isRefreshing}
          alertCount={unresolvedAlertCount}
          alerts={alerts}
          onResolveAlert={handleResolveAlert}
          onResolveAll={handleResolveAll}
          onSimulateAttack={handleSimulateAttack}
          onNavigateTab={setActiveTab}
          isMonitoring={isMonitoring}
          onToggleMonitoring={handleToggleMonitoring}
          isTogglingMonitoring={isTogglingMonitoring}
          toggleAction={toggleAction}
        />

        {toast && (
          <div
            className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl border text-xs font-mono font-bold shadow-2xl flex items-center gap-2.5 backdrop-blur-md transition-all animate-bounce ${
              toast.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                : toast.type === "error"
                ? "bg-rose-950/90 border-rose-500/50 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                : "bg-[#070c18]/95 border-cyan-500/50 text-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.3)]"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                toast.type === "success"
                  ? "bg-emerald-400"
                  : toast.type === "error"
                  ? "bg-rose-400"
                  : "bg-cyan-400"
              }`}
            />
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-slate-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {backendStatus === "offline" && (
          <div className="bg-gradient-to-r from-rose-950/95 via-red-900/90 to-rose-950/95 border-b border-rose-500/50 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-rose-200 shadow-[0_4px_25px_rgba(244,63,94,0.25)] z-20 sticky top-16">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              <span className="font-bold text-rose-300 font-orbitron tracking-wider">BACKEND DISCONNECTED</span>
              <span className="text-slate-300 hidden md:inline font-mono">
                Flask API offline — run <code className="text-emerald-400 bg-black/50 px-1.5 py-0.5 rounded font-mono">python app.py</code> in the backend directory.
              </span>
            </div>
            <button
              onClick={loadData}
              disabled={isRefreshing}
              className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded-lg text-rose-200 text-xs font-semibold font-orbitron tracking-wider transition-all active:scale-95 cursor-pointer"
            >
              {isRefreshing ? "PINGING..." : "RETRY"}
            </button>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">

          {activeTab === "dashboard" && (
            <Dashboard
              stats={stats}
              trafficFlows={trafficFlows}
              alerts={alerts}
              attackBreakdown={attackBreakdown}
              isMonitoring={isMonitoring}
              sessionPackets={sessionPackets}
              isTogglingMonitoring={isTogglingMonitoring}
              toggleAction={toggleAction}
              onToggleMonitoring={handleToggleMonitoring}
              onResolveAlert={handleResolveAlert}
              onResolveAll={handleResolveAll}
              onNavigateTab={setActiveTab}
              onSimulateAttack={handleSimulateAttack}
              onBlockIp={handleBlockIp}
              onWhitelistIp={handleAddWhitelistIp}
              detectionMode={detectionMode}
              onToggleDetectionMode={handleToggleDetectionMode}
              captureInterface={captureInterface}
              onChangeInterface={setCaptureInterface}
              blockedCount={blockedIps.length}
              whitelistCount={whitelistIps.length}
            />
          )}

          {activeTab === "traffic" && (
            <Traffic
              trafficFlows={trafficFlows}
              onRefresh={loadData}
              isRefreshing={isRefreshing}
              isMonitoring={isMonitoring}
              sessionPackets={sessionPackets}
              isTogglingMonitoring={isTogglingMonitoring}
              toggleAction={toggleAction}
              onToggleMonitoring={handleToggleMonitoring}
              onBlockIp={handleBlockIp}
              onWhitelistIp={handleAddWhitelistIp}
              onClearTraffic={handleClearTraffic}
              captureInterface={captureInterface}
              onChangeInterface={setCaptureInterface}
              promiscuousMode={promiscuousMode}
              onTogglePromiscuous={() => setPromiscuousMode(!promiscuousMode)}
            />
          )}

          {activeTab === "alerts" && (
            <Alerts
              alerts={alerts}
              attackBreakdown={attackBreakdown}
              blockedIps={blockedIps}
              whitelistIps={whitelistIps}
              onResolveAlert={handleResolveAlert}
              onResolveAll={handleResolveAll}
              onUpdateAlertStatus={handleUpdateAlertStatus}
              onDeleteAlert={handleDeleteAlert}
              onClearResolved={handleClearResolvedAlerts}
              onClearAll={handleClearAllAlerts}
              onBlockIp={handleBlockIp}
              onUnblockIp={handleUnblockIp}
              onWhitelistIp={handleAddWhitelistIp}
              onRemoveWhitelistIp={handleRemoveWhitelistIp}
              onClearBlockedIps={handleClearBlockedIps}
              onClearWhitelist={handleClearWhitelist}
              onRefresh={loadData}
              isRefreshing={isRefreshing}
              onSimulateAttack={handleSimulateAttack}
            />
          )}

          {activeTab === "settings" && (
            <Settings
              backendStatus={backendStatus}
              captureInterface={captureInterface}
              onChangeInterface={setCaptureInterface}
              promiscuousMode={promiscuousMode}
              onTogglePromiscuous={() => setPromiscuousMode(!promiscuousMode)}
              detectionMode={detectionMode}
              onChangeDetectionMode={setDetectionMode}
              confidenceThreshold={confidenceThreshold}
              onChangeConfidenceThreshold={setConfidenceThreshold}
              autoBlockThreats={autoBlockThreats}
              onToggleAutoBlock={() => setAutoBlockThreats(!autoBlockThreats)}
              flowIdleTimeout={flowIdleTimeout}
              onChangeFlowIdleTimeout={setFlowIdleTimeout}
              onSaveSettings={handleSaveSettings}
              onFactoryReset={handleFactoryReset}
            />
          )}
        </main>
      </div>
    </div>
  );
}
