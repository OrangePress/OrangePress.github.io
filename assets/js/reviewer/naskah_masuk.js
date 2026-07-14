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
    const res = await fetch(
      "https://orange-press-be.vercel.app/api/reviewer/manuscripts",
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!res.ok) throw new Error("Gagal memuat naskah");
    manuscripts = await res.json();
    renderInbox();
  } catch (err) {
    console.error(err);
    document.getElementById("naskahList").innerHTML =
      `<p class="section-sub" style="color:red;">Gagal memuat daftar naskah.</p>`;
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
          (c) => c.role === "Penulis" && c.name.toLowerCase().includes(keyword),
        ),
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

function safeText(value) {
  if (value === null || value === undefined || value === "") return "-";

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateLabel(dateString) {
  if (!dateString) return "-";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAiStatus(status) {
  const map = {
    tunggu: "Menunggu",
    proses: "Diproses",
    selesai: "Selesai",
    gagal: "Gagal",
    completed: "Selesai",
    failed: "Gagal",
  };

  return map[status] || status || "-";
}

function renderList(items, emptyText = "Tidak ada data", type = "normal") {
  if (!Array.isArray(items) || items.length === 0) {
    return `<ul class="review-clean-list"><li>${safeText(emptyText)}</li></ul>`;
  }

  return `
    <ul class="review-clean-list ${type}">
      ${items.map((item) => `<li>${safeText(item)}</li>`).join("")}
    </ul>
  `;
}

function renderFormattingInstruction(formattingInstruction) {
  if (!formattingInstruction || Object.keys(formattingInstruction).length === 0) {
    return `<ul class="review-clean-list"><li>Tidak ada data format</li></ul>`;
  }

  const labelMap = {
    font: "Font",
    fontSize: "Ukuran Font",
    spacing: "Spasi",
    margin: "Margin",
    bookSize: "Ukuran Buku",
  };

  return `
    <ul class="review-clean-list">
      ${Object.entries(formattingInstruction)
        .map(([key, value]) => {
          const label = labelMap[key] || key;
          const expected = value?.expected || "-";
          const status = value?.foundInstruction
            ? "✔️ Terdeteksi"
            : "❌ Tidak terdeteksi";

          return `
            <li>
              <strong>${safeText(label)}:</strong>
              ${safeText(expected)}
              <span class="format-status">${safeText(status)}</span>
            </li>
          `;
        })
        .join("")}
    </ul>
  `;
}


function renderFileCard(label, fileUrl) {
  return `
    <div class="review-file-row">
      <span>${safeText(label)}</span>
      ${
        fileUrl
          ? `<a href="${safeText(fileUrl)}" target="_blank" class="btn-small">Download</a>`
          : `<span class="file-empty">Tidak tersedia</span>`
      }
    </div>
  `;
}

function renderAttachmentList(attachments = []) {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return `<div class="review-file-row"><span>Lampiran</span><span class="file-empty">Tidak ada lampiran</span></div>`;
  }

  return attachments
    .map(
      (att, index) => `
        <div class="review-file-row">
          <span>Lampiran ${index + 1}</span>
          ${
            att.url
              ? `<a href="${safeText(att.url)}" target="_blank" class="btn-small">Download</a>`
              : `<span class="file-empty">Tidak tersedia</span>`
          }
        </div>
      `,
    )
    .join("");
}

async function loadManuscriptDetail(id) {
  try {
    const res = await fetch(
      `https://orange-press-be.vercel.app/api/reviewer/manuscripts/${id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.message || "Gagal memuat detail naskah");
    }

    const data = result.data || result;

    const isReviewed =
      data.status === "Approved" ||
      data.status === "Published" ||
      data.status === "Rejected" ||
      data.status === "Revission";

    const startReviewBtn = document.getElementById("startReviewBtn");

    if (startReviewBtn) {
      if (isReviewed) {
        startReviewBtn.style.display = "none";
      } else {
        startReviewBtn.style.display = "block";
        startReviewBtn.onclick = () => {
          document.getElementById("detailModal").style.display = "none";
          startReview(id);
        };
      }
    }

    const penulis =
      data.contributors
        ?.filter((c) => c.role === "Penulis")
        .map((c) => c.name)
        .join(", ") || "-";

    const allContributors =
      data.contributors
        ?.map((c) => `${c.role}: ${c.name}`)
        .join("; ") || "-";

    const files = data.files || {};
    const ai = data.aiEditorialRecommendation || {};
    const template = ai.templateCompatibility || {};
    const isbn = ai.isbnDetection || {};
    const fieldReviewer = ai.fieldAndReviewer || {};
    const finalRec = ai.finalRecommendation || {};

    document.getElementById("detailContent").innerHTML = `
      <div class="review-detail-box">

        <!-- FORMULIR NASKAH -->
        <section class="review-section">
          <div class="section-heading">
            <h4>📝 Formulir Naskah</h4>
          </div>

          <div class="review-grid">
            <div class="review-item">
              <div class="review-label">Status</div>
              <div class="review-value">
                <span class="status-badge">${safeText(data.statusLabel || data.status || "-")}</span>
              </div>
            </div>

            <div class="review-item">
              <div class="review-label">Judul Buku</div>
              <div class="review-value">${safeText(data.title)}</div>
            </div>

            <div class="review-item review-full">
              <div class="review-label">Penulis</div>
              <div class="review-value">${safeText(penulis)}</div>
            </div>

            <div class="review-item review-full">
              <div class="review-label">Kepengarangan</div>
              <div class="review-value">${safeText(allContributors)}</div>
            </div>

            <div class="review-item">
              <div class="review-label">Kelompok Pembaca</div>
              <div class="review-value">${safeText(data.readerGroup)}</div>
            </div>

            <div class="review-item">
              <div class="review-label">Jenis Pustaka</div>
              <div class="review-value">${safeText(data.libraryType)}</div>
            </div>

            <div class="review-item">
              <div class="review-label">Kategori Pustaka</div>
              <div class="review-value">${safeText(data.categoryType)}</div>
            </div>

            <div class="review-item">
              <div class="review-label">Media Terbitan ISBN</div>
              <div class="review-value">${safeText(data.isbnType)}</div>
            </div>

            <div class="review-item">
              <div class="review-label">Jenis Permohonan ISBN</div>
              <div class="review-value">${safeText(data.hopeIsbnType)}</div>
            </div>

            <div class="review-item">
              <div class="review-label">Jumlah Halaman</div>
              <div class="review-value">${safeText(data.pageCount)}</div>
            </div>

            <div class="review-item">
              <div class="review-label">Tinggi Buku</div>
              <div class="review-value">
                ${data.bookHeightCm ? `${safeText(data.bookHeightCm)} cm` : "-"}
              </div>
            </div>

            <div class="review-item">
              <div class="review-label">Seri Buku</div>
              <div class="review-value">${safeText(data.seriesName)}</div>
            </div>

            <div class="review-item">
              <div class="review-label">Memerlukan KDT</div>
              <div class="review-value">${data.needKdt ? "Ya" : "Tidak"}</div>
            </div>

            <div class="review-item">
              <div class="review-label">Ilustrasi</div>
              <div class="review-value">${data.hasIllustration ? "Ya" : "Tidak"}</div>
            </div>

            <div class="review-item review-full">
              <div class="review-label">Sinopsis</div>
              <div class="review-value">${safeText(data.synopsis || data.description || "-")}</div>
            </div>
          </div>
        </section>

        <!-- FILE -->
        <section class="review-section">
          <div class="section-heading">
            <h4>📎 File & Lampiran</h4>
          </div>

          <div class="review-file-box">
            ${renderFileCard("Naskah / Dummy Buku", files.manuscripts?.[0]?.url)}
            ${renderFileCard("Cover Depan", files.coverFront?.[0]?.url)}
            ${renderFileCard("Cover Belakang", files.coverBack?.[0]?.url)}
            ${renderFileCard("Hasil Cek Plagiarisme", files.plagiarismReport?.[0]?.url)}
            ${renderAttachmentList(files.attachments)}
          </div>
        </section>

        <!-- AI SUMMARY CARD -->
        <section class="review-section ai-highlight-section">
          <div class="section-heading">
            <h4>🤖 AI Co-Reviewer Recommendation</h4>
          </div>

          <div class="ai-summary-grid">
            <div class="ai-score-card">
              <div class="ai-score-label">Kesesuaian Template</div>
              <div class="ai-score-number">${safeText(template.label || `${template.score || 0}%`)}</div>
              <div class="ai-score-desc">${safeText(template.description)}</div>
            </div>

            <div class="ai-decision-card">
              <div class="ai-score-label">Label Akhir</div>
              <div class="ai-decision-text">
                ${safeText(finalRec.label || ai.temporaryRecommendation || "-")}
              </div>
              <div class="ai-score-desc">${safeText(finalRec.reason)}</div>
            </div>
          </div>

          <div class="review-grid">
            <div class="review-item">
              <div class="review-label">Status AI</div>
              <div class="review-value">${safeText(formatAiStatus(ai.status))}</div>
            </div>

            <div class="review-item">
              <div class="review-label">Model</div>
              <div class="review-value">${safeText(ai.model)}</div>
            </div>

            <div class="review-item">
              <div class="review-label">Generated At</div>
              <div class="review-value">${safeText(formatDateLabel(ai.generatedAt))}</div>
            </div>

            <div class="review-item">
              <div class="review-label">Keputusan</div>
              <div class="review-value">${safeText(finalRec.decision)}</div>
            </div>
          </div>
        </section>

        <!-- TEMPLATE DETAIL -->
        <section class="review-section">
          <div class="section-heading">
            <h4>📌 Detail Kesesuaian Template</h4>
          </div>

          <div class="review-grid">
            <div class="review-item review-full">
              <div class="review-label">Aspek yang Dinilai</div>
              <div class="review-value">${safeText(template.assessedAspects)}</div>
            </div>

            <div class="review-item review-full">
              <div class="review-label">Bagian yang Sesuai</div>
              <div class="review-value">
                ${renderList(template.matchedSections, "Belum ada bagian yang terdeteksi sesuai", "matched")}
              </div>
            </div>

            <div class="review-item review-full">
              <div class="review-label">Bagian yang Belum Sesuai / Tidak Terdeteksi</div>
              <div class="review-value">
                ${renderList(template.missingSections, "Tidak ada bagian yang kurang", "missing")}
              </div>
            </div>

            <div class="review-item review-full">
              <div class="review-label">Instruksi Format Template</div>
              <div class="review-value">
                ${renderFormattingInstruction(template.formattingInstruction)}
              </div>
            </div>
          </div>
        </section>

        <!-- ISBN & REVIEWER -->
        <section class="review-section">
          <div class="section-heading">
            <h4>🔎 ISBN, Bidang Ilmu & Reviewer</h4>
          </div>

          <div class="review-grid">
            <div class="review-item">
              <div class="review-label">Deteksi ISBN</div>
              <div class="review-value">${safeText(isbn.label)}</div>
            </div>

            <div class="review-item">
              <div class="review-label">Nomor ISBN</div>
              <div class="review-value">
                ${
                  Array.isArray(isbn.numbers) && isbn.numbers.length > 0
                    ? safeText(isbn.numbers.join(", "))
                    : "-"
                }
              </div>
            </div>

            <div class="review-item">
              <div class="review-label">Bidang Ilmu</div>
              <div class="review-value">${safeText(fieldReviewer.field)}</div>
            </div>

            <div class="review-item">
              <div class="review-label">Reviewer Simulasi</div>
              <div class="review-value">${safeText(fieldReviewer.reviewer)}</div>
            </div>

            <div class="review-item">
              <div class="review-label">Keahlian Reviewer</div>
              <div class="review-value">${safeText(fieldReviewer.expertise)}</div>
            </div>

            <div class="review-item review-full">
              <div class="review-label">Catatan Reviewer</div>
              <div class="review-value">${safeText(fieldReviewer.note)}</div>
            </div>
          </div>
        </section>

        <!-- CATATAN AI -->
        <section class="review-section">
          <div class="section-heading">
            <h4>🧾 Catatan AI untuk Reviewer</h4>
          </div>

          <div class="review-grid">
            <div class="review-item review-full">
              <div class="review-label">Ringkasan Naskah</div>
              <div class="review-value">${safeText(ai.summary)}</div>
            </div>

            <div class="review-item review-full">
              <div class="review-label">Catatan Kualitas Awal</div>
              <div class="review-value">${safeText(ai.initialQualityNotes)}</div>
            </div>

            <div class="review-item review-full">
              <div class="review-label">Fokus Reviewer</div>
              <div class="review-value">${safeText(ai.reviewerFocus)}</div>
            </div>

            <div class="review-item review-full">
              <div class="review-label">Masalah Awal</div>
              <div class="review-value">${safeText(ai.initialIssues)}</div>
            </div>

            <div class="review-item review-full">
              <div class="review-label">Rekomendasi Sementara</div>
              <div class="review-value">${safeText(ai.temporaryRecommendation)}</div>
            </div>
          </div>
        </section>

        ${
          ai.error
            ? `
              <section class="review-section error-section">
                <div class="section-heading">
                  <h4>⚠️ Error AI</h4>
                </div>
                <div class="review-value">${safeText(ai.error)}</div>
              </section>
            `
            : ""
        }
      </div>
    `;

    document.getElementById("detailModal").style.display = "flex";
  } catch (err) {
    console.error(err);
    Swal.fire("Error", err.message || "Gagal memuat detail naskah.", "error");
  }
}

// === MODAL REVIEW ===
function openReviewModal() {
  document.getElementById("reviewModal").style.display = "flex";
  document.getElementById("status").value = "";
  document.getElementById("rvCatatan").value = "";

  // Reset input file
  const fileInput = document.getElementById("fileReview");
  if (fileInput) fileInput.value = "";

  document.getElementById("revisionNoteSection").style.display = "none";
  document.getElementById("submitReviewBtn").disabled = false;
  document.getElementById("submitReviewBtn").textContent = "Kirim Review";
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
  const fileInput = document.getElementById("fileReview");
  const noteInput = document.getElementById("rvCatatan");

  if (!status) return alert("Pilih keputusan terlebih dahulu.");

  // Validasi khusus untuk status revisi
  if (status === "Revission") {
    if (!noteInput.value.trim()) return alert("Catatan revisi wajib diisi.");
  }

  try {
    const btn = document.getElementById("submitReviewBtn");
    btn.disabled = true;
    btn.textContent = "Mengirim...";

    // Gunakan FormData agar bisa mengirim file
    const formData = new FormData();
    let url = "";

    if (status === "Approved") {
      url = `https://orange-press-be.vercel.app/api/reviewer/manuscripts/${currentManuscriptId}/approve`;
    } else if (status === "Rejected") {
      url = `https://orange-press-be.vercel.app/api/reviewer/manuscripts/${currentManuscriptId}/reject`;
    } else if (status === "Revission") {
      url = `https://orange-press-be.vercel.app/api/reviewer/manuscripts/${currentManuscriptId}/revision`;

      // Masukkan catatan ke formData
      formData.append("revisionNote", noteInput.value.trim());

      // Masukkan file ke formData (jika ada)
      if (fileInput.files.length > 0) {
        formData.append("file", fileInput.files[0]);
      }
    }

    // Konfigurasi fetch
    const fetchOptions = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // JANGAN set 'Content-Type' secara manual saat menggunakan FormData
      },
    };

    // Jika status adalah revisi, tambahkan body berupa formData
    if (status === "Revission") {
      fetchOptions.body = formData;
    }

    const res = await fetch(url, fetchOptions);

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
    const btn = document.getElementById("submitReviewBtn");
    btn.disabled = false;
    btn.textContent = "Kirim Review";
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
