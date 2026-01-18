// Format tanggal menjadi "Senin, 16 Januari 2026"
function formatDateLabel(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function mapStatusToLabel(status) {
  // Jika status kosong atau null
  if (!status) return "draft";

  // Penanganan status dinamis: Reuploaded (n)
  if (status.startsWith("Reuploaded")) {
    // Mengambil angka di dalam kurung menggunakan Regex
    const match = status.match(/\d+/);
    const version = match ? match[0] : "";
    return `Revisi ke-${version} (Menunggu Review)`;
  }

  // Penanganan status statis lainnya
  switch (status) {
    case "Approved":
      return "Diterima";
    case "Revision":
    case "Returned": // Tambahkan jika status dari database adalah 'Returned'
      return "Sedang dalam Perbaikan oleh Penulis";
    case "In Review":
      return "Sedang Ditinjau oleh Reviewer";
    case "Published":
      return "Naskah sudah Diterbitkan";
    case "Rejected":
      return "Ditolak";
    default:
      return status; // Mengembalikan status asli jika tidak cocok dengan daftar
  }
}

const token = localStorage.getItem("token");

let reviewHistory = [];

// === FETCH DATA RIWAYAT ===
async function loadReviewHistory() {
  try {
    const res = await fetch("https://orange-press-be.vercel.app/api/reviewer/review", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Gagal memuat riwayat review");

    reviewHistory = await res.json();
    renderReviewHistory();
  } catch (err) {
    console.error("Error loading review history:", err);
    document.getElementById("riwayatList").innerHTML =
      `<p class="section-sub" style="color:red;">Gagal memuat riwayat review.</p>`;
  }
}

/// === RENDER RIWAYAT ===
function renderReviewHistory() {
  const container = document.getElementById("riwayatList");
  if (!container) return;

  const statusFilter = document.getElementById("historyStatus")?.value || "all";
  const fromFilter = document.getElementById("historyFrom")?.value;
  const toFilter = document.getElementById("historyTo")?.value;

  // Filter Duplikat (Menampilkan review terbaru untuk setiap naskah)
  const uniqueMap = new Map();
  reviewHistory.forEach((item) => {
    const mId = item.manuscriptId?._id || item.manuscriptId;
    uniqueMap.set(mId, item);
  });

  let filtered = Array.from(uniqueMap.values());

  // Logika Filter Status & Tanggal (Tetap sama)
  // ... (kode filter Anda sebelumnya)

  container.innerHTML = filtered
    .map((item) => {
      const manuscript = item.manuscriptId;
      if (!manuscript) return "";

      const author =
        manuscript.contributors
          ?.filter((c) => c.role === "Penulis")
          .map((c) => c.name)
          .join(", ") || "-";

      const statusLabel = mapStatusToLabel(item.status || "Approved");

      // Mengambil Catatan Editor (noteForReviewer)
      const editorNote = item.noteForReviewer ? item.noteForReviewer : "-";

      return `
        <div class="item-card">
          <div class="item-main">
            <div class="item-title">${manuscript.title || "Tanpa Judul"}</div>
            <div class="item-meta">
              Penulis: ${author}<br>
              Keputusan: <strong>${statusLabel}</strong><br>
              Tanggal review: ${formatDateLabel(item.createdAt)}<br>
              Catatan editor: <span class="text-muted italic">${editorNote}</span>
            </div>
            <span class="badge-status badge-done">${manuscript.status || "-"}</span>
          </div>
          <div class="item-actions">
            <button class="btn-secondary btn-sm" onclick="openReviewDetail('${item._id}')">
              Lihat Review
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

// === EVENT LISTENERS FILTER ===
document
  .getElementById("historyStatus")
  ?.addEventListener("change", renderReviewHistory);
document
  .getElementById("historyFrom")
  ?.addEventListener("change", renderReviewHistory);
document
  .getElementById("historyTo")
  ?.addEventListener("change", renderReviewHistory);

document.getElementById("historyResetBtn")?.addEventListener("click", () => {
  document.getElementById("historyStatus").value = "all";
  document.getElementById("historyFrom").value = "";
  document.getElementById("historyTo").value = "";
  renderReviewHistory();
});

function openReviewDetail(reviewId) {
  const review = reviewHistory.find((r) => r._id === reviewId);
  if (!review) return;

  const manuscript = review.manuscriptId;
  const statusLabel = mapStatusToLabel(review.status);

  document.getElementById("rdJudul").textContent = manuscript.title || "-";
  document.getElementById("rdKeputusan").textContent = statusLabel;
  document.getElementById("rdTanggal").textContent = formatDateLabel(
    review.createdAt,
  );

  // --- Catatan Reviewer (revisionNote) ---
  const hasReviewerNote = review.revisionNote && review.revisionNote.trim();
  const noteSection = document.getElementById("rdCatatanSection");
  if (hasReviewerNote) {
    document.getElementById("rdCatatan").textContent = review.revisionNote;
    noteSection.style.display = "block";
  } else {
    noteSection.style.display = "none";
  }

  // --- Catatan Editor (noteForReviewer dari API) ---
  const hasEditorNote = review.noteForReviewer && review.noteForReviewer.trim();
  const editorSection = document.getElementById("rdEditorNoteSection");

  if (hasEditorNote) {
    document.getElementById("rdEditorNote").textContent =
      review.noteForReviewer;
    editorSection.style.display = "block";
  } else {
    // Tetap tampilkan strip atau sembunyikan jika tidak ada catatan
    document.getElementById("rdEditorNote").textContent = "-";
    editorSection.style.display = "none";
  }

  document.getElementById("reviewDetailModal").style.display = "flex";
}

function startReview(manuscriptId) {
  // Arahkan ke halaman naskah masuk dengan ID spesifik
  // Atau buka modal edit (jika diimplementasikan)
  alert("Edit review tidak diizinkan setelah dikirim.");
}

// Fungsi untuk menutup modal detail review
function closeReviewDetail() {
  const modal = document.getElementById("reviewDetailModal");
  if (modal) {
    modal.style.display = "none";
  }
}

// Inisialisasi Event Listener saat halaman dimuat
document.addEventListener("DOMContentLoaded", () => {
  loadReviewHistory(); // Fungsi yang sudah Anda miliki

  // Listener untuk tombol "Tutup" di dalam modal
  const closeBtn = document.getElementById("closeReviewDetailBtn");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeReviewDetail);
  }

  // Listener untuk menutup modal saat user mengklik area di luar modal-box
  const modal = document.getElementById("reviewDetailModal");
  window.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeReviewDetail();
    }
  });
});

// Expose fungsi ke window jika diperlukan (opsional karena sudah pakai event listener)
window.closeReviewDetail = closeReviewDetail;

// Expose ke global scope
window.openReviewDetail = openReviewDetail;
window.startReview = startReview;
