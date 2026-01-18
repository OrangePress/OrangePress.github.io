// Ambil token dari localStorage
const token = localStorage.getItem("token");

// Fetch dan tampilkan statistik
async function loadReviewerStats() {
  try {
    const res = await fetch("https://orange-press-be.vercel.app/api/reviewer/stats", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const stats = await res.json();

    // Update DOM
    document.getElementById("statBelum").textContent =
      stats.pendingOrRevised || 0;
    document.getElementById("statSelesai").textContent =
      stats.withFinalDecision || 0;
    document.getElementById("statTotal").textContent = stats.totalAssigned || 0;
  } catch (err) {
    console.error("Gagal memuat statistik:", err);

    // Tetap tampilkan 0 jika gagal (opsional)
    document.getElementById("statBelum").textContent = "–";
    document.getElementById("statSelesai").textContent = "–";
    document.getElementById("statTotal").textContent = "–";
  }
}

// Jalankan saat halaman dimuat
document.addEventListener("DOMContentLoaded", () => {
  loadReviewerStats();
});
