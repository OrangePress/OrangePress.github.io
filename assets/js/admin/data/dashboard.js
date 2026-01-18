async function loadDashboardStats() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch("https://orange-press-be.vercel.app/api/admin/statistics", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Gagal memuat statistik.");

    const stats = await res.json();

    // Update DOM
    document.getElementById("statAuthors").textContent = stats.authors.toLocaleString("id-ID");
    document.getElementById("statManuscripts").textContent = stats.manuscripts.toLocaleString("id-ID");
    document.getElementById("statPayments").textContent = stats.payments.toLocaleString("id-ID");
    document.getElementById("statPublished").textContent = stats.published.toLocaleString("id-ID");

  } catch (err) {
    console.error("Error loading stats:", err);
    // Opsional: tampilkan error di UI
    ["statAuthors", "statManuscripts", "statPayments", "statPublished"].forEach(id => {
      document.getElementById(id).textContent = "⚠️";
    });
  }
}

// Panggil saat halaman dimuat
document.addEventListener("DOMContentLoaded", () => {
  loadDashboardStats();
});