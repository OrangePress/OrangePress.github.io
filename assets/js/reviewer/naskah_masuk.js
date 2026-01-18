// Format tanggal
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

const token = localStorage.getItem("token");

let manuscripts = [];
let currentManuscriptId = null;

// === FETCH & RENDER ===
async function loadManuscripts() {
  try {
    const res = await fetch("https://orange-press-be.vercel.app/api/reviewer/manuscripts", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Gagal memuat naskah");
    manuscripts = await res.json();
    renderInbox();
  } catch (err) {
    console.error(err);
    document.getElementById(
      "naskahList"
    ).innerHTML = `<p class="section-sub" style="color:red;">Gagal memuat daftar naskah.</p>`;
  }
}

function renderInbox() {
  const container = document.getElementById("naskahList");
  if (!container) return;

  const keyword =
    document.getElementById("searchInbox")?.value.toLowerCase().trim() || "";

  // Filter status awal
  let data = manuscripts.filter((m) => m.status !== "Selesai");

  // Filter Unik Judul
  const uniqueTitles = new Map();
  data = data.filter((m) => {
    const titleLower = m.title.toLowerCase().trim();
    if (!uniqueTitles.has(titleLower)) {
      uniqueTitles.set(titleLower, true);
      return true;
    }
    return false;
  });

  if (keyword) {
    data = data.filter(
      (m) =>
        m.title.toLowerCase().includes(keyword) ||
        m.contributors?.some(
          (c) => c.role === "Penulis" && c.name.toLowerCase().includes(keyword)
        )
    );
  }

  container.innerHTML = data.length
    ? data
        .map((m) => {
          const author =
            m.contributors
              ?.filter((c) => c.role === "Penulis")
              .map((c) => c.name)
              .join(", ") || "-";
          const field = m.libraryType || m.readerGroup || "-";

          // LOGIKA DISABLE TOMBOL:
          // Jika status adalah Approved atau Published
          const isReviewed =
            m.status === "Approved" ||
            m.status === "Published" ||
            m.isPublished === true;

          return `
        <div class="item-card ${isReviewed ? "item-disabled" : ""}">
          <div class="item-main">
            <div class="item-title">${m.title} ${
            isReviewed
              ? '<span style="font-size:10px; color:green;">(Selesai Diriview)</span>'
              : ""
          }</div>
            <div class="item-meta">
              Penulis: ${author} • Bidang: ${field}<br>
              Masuk: ${formatDateLabel(m.createdAt)} • <strong>Status: ${
            m.status
          }</strong>
            </div>
          </div>
          <div class="item-actions">
            <button class="btn-secondary btn-sm" onclick="previewManuscript('${
              m._id
            }')">Pratinjau</button>
            
            <button class="btn btn-sm" 
              onclick="startReview('${m._id}')" 
              ${
                isReviewed
                  ? "disabled style='background:#ccc; cursor:not-allowed;'"
                  : ""
              }>
              ${isReviewed ? "Review Selesai" : "Mulai Review"}
            </button>
            
            <button class="btn-outline btn-sm" onclick="downloadManuscript('${
              m._id
            }')">Unduh</button>
          </div>
        </div>
      `;
        })
        .join("")
    : `<p class="section-sub">Tidak ada naskah yang sesuai.</p>`;
}

// === AKSI ===
function previewManuscript(id) {
  currentManuscriptId = id;
  loadManuscriptDetail(id);
  document.getElementById("detailModal").style.display = "flex";
}

function startReview(id) {
  currentManuscriptId = id;
  openReviewModal();
}

function downloadManuscript(id) {
  const manuscript = manuscripts.find((m) => m._id === id);
  if (manuscript?.files?.manuscripts?.[0]?.url) {
    window.open(manuscript.files.manuscripts[0].url, "_blank");
  } else {
    alert("File naskah tidak tersedia.");
  }
}

async function loadManuscriptDetail(id) {
  try {
    const res = await fetch(
      `https://orange-press-be.vercel.app/api/reviewer/manuscripts/${id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await res.json();

    const isReviewed =
      data.status === "Approved" || data.status === "Published";
    const startReviewBtn = document.getElementById("startReviewBtn");

    // Sembunyikan tombol jika sudah di-review
    if (isReviewed) {
      startReviewBtn.style.display = "none";
    } else {
      startReviewBtn.style.display = "block";
      startReviewBtn.onclick = () => {
        document.getElementById("detailModal").style.display = "none";
        startReview(id);
      };
    }

    // ... sisa kode pengisian detailContent tetap sama ...
    document.getElementById("detailContent").innerHTML = `
        <div style="margin-bottom:1rem;"><strong>Status:</strong> <span class="badge">${data.status}</span></div>
        <div style="margin-bottom:1rem;"><strong>Judul:</strong> ${data.title}</div>
        `;
  } catch (err) {
    console.error(err);
  }
}

// === MODAL REVIEW ===
function openReviewModal() {
  document.getElementById("reviewModal").style.display = "flex";
  document.getElementById("status").value = "";
  document.getElementById("rvCatatan").value = "";
  document.getElementById("revisionNoteSection").style.display = "none";
  document.getElementById("submitReviewBtn").disabled = false;
  document.getElementById("submitReviewBtn").textContent = "Kirim Review";

  // Toggle catatan berdasarkan pilihan
  document
    .getElementById("status")
    .addEventListener("change", toggleRevisionNote, { once: false });
}

function toggleRevisionNote() {
  const section = document.getElementById("revisionNoteSection");
  section.style.display = this.value === "Revission" ? "block" : "none";
}

// Tambahkan event listener sekali saja
document
  .getElementById("status")
  ?.addEventListener("change", toggleRevisionNote);

async function submitReview() {
  const status = document.getElementById("status").value;
  if (!status) return alert("Pilih keputusan terlebih dahulu.");

  if (status === "Revission") {
    const note = document.getElementById("rvCatatan").value.trim();
    if (!note) return alert("Catatan revisi wajib diisi.");
  }

  try {
    const btn = document.getElementById("submitReviewBtn");
    btn.disabled = true;
    btn.textContent = "Mengirim...";

    let url,
      method = "POST",
      body = null;

    if (status === "Approved") {
      url = `https://orange-press-be.vercel.app/api/reviewer/manuscripts/${currentManuscriptId}/approve`;
    } else if (status === "Rejected") {
      url = `https://orange-press-be.vercel.app/api/reviewer/manuscripts/${currentManuscriptId}/reject`;
    } else if (status === "Revission") {
      url = `https://orange-press-be.vercel.app/api/reviewer/manuscripts/${currentManuscriptId}/revision`;
      body = JSON.stringify({
        revisionNote: document.getElementById("rvCatatan").value.trim(),
      });
    }

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body,
    });

    if (res.ok) {
      alert("Review berhasil dikirim!");
      document.getElementById("reviewModal").style.display = "none";
      loadManuscripts();
    } else {
      const err = await res.json();
      alert(`Gagal: ${err.message || "Coba lagi."}`);
    }
  } catch (err) {
    console.error(err);
    alert("Terjadi kesalahan saat mengirim review.");
  } finally {
    document.getElementById("submitReviewBtn").disabled = false;
    document.getElementById("submitReviewBtn").textContent = "Kirim Review";
  }
}

// === EVENT LISTENERS ===
document.getElementById("searchInbox")?.addEventListener("input", renderInbox);
document.getElementById("closeDetailBtn")?.addEventListener("click", () => {
  document.getElementById("detailModal").style.display = "none";
});
document.getElementById("closeReviewBtn")?.addEventListener("click", () => {
  document.getElementById("reviewModal").style.display = "none";
});
document
  .getElementById("submitReviewBtn")
  ?.addEventListener("click", submitReview);

// Tutup modal saat klik luar
["detailModal", "reviewModal"].forEach((id) => {
  const el = document.getElementById(id);
  el?.addEventListener("click", (e) => {
    if (e.target === el) el.style.display = "none";
  });
});

// Expose to global
window.previewManuscript = previewManuscript;
window.startReview = startReview;
window.downloadManuscript = downloadManuscript;

// Init
document.addEventListener("DOMContentLoaded", loadManuscripts);
