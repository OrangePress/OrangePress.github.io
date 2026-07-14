// Helper: ambil token dari localStorage
function getAuthToken() {
  return localStorage.getItem("token");
}

// Helper: buat opsi fetch dengan auth
function authFetch(url, options = {}) {
  const token = getAuthToken();
  if (!token) {
    Swal.fire("Sesi Habis", "Silakan login ulang.", "warning").then(() => {
      window.location.href = "/auth/login.html"; // sesuaikan route login Anda
    });
    throw new Error("Token tidak ditemukan");
  }

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
}

// Muat daftar naskah
async function loadManuscripts() {
  try {
    const res = await authFetch(
      "https://orange-press-be.vercel.app/api/admin/manuscripts",
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const manuscripts = await res.json();
    console.log(manuscripts);

    renderManuscriptTable(manuscripts);
  } catch (err) {
    console.error("Gagal memuat naskah:", err);
    document.querySelector("#manuscriptTable tbody").innerHTML = `
        <tr><td colspan="4" class="text-center">Gagal memuat data. Coba refresh atau login ulang.</td></tr>
      `;
  }
}

// Muat detail naskah
function getEl(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const el = getEl(id);
  if (!el) return;

  if (value === null || value === undefined || value === "") {
    el.textContent = "-";
    return;
  }

  el.textContent = value;
}

function formatDateTime(dateString) {
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
  const statusMap = {
    tunggu: "Menunggu",
    proses: "Diproses",
    selesai: "Selesai",
    gagal: "Gagal",
    completed: "Selesai",
    failed: "Gagal",
  };

  return statusMap[status] || status || "-";
}

function setupDownload(btnId, url, spanId) {
  const btn = getEl(btnId);
  const span = getEl(spanId);

  if (!btn || !span) return;

  if (url) {
    span.textContent = "Tersedia";
    btn.disabled = false;
    btn.onclick = () => window.open(url, "_blank");
  } else {
    span.textContent = "-";
    btn.disabled = true;
    btn.onclick = null;
  }
}

function renderSimpleList(id, items, emptyText = "Tidak ada data") {
  const container = getEl(id);
  if (!container) return;

  container.innerHTML = "";

  if (!Array.isArray(items) || items.length === 0) {
    const li = document.createElement("li");
    li.textContent = emptyText;
    container.appendChild(li);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item || "-";
    container.appendChild(li);
  });
}

function renderFormattingInstruction(id, formattingInstruction) {
  const container = getEl(id);
  if (!container) return;

  container.innerHTML = "";

  if (
    !formattingInstruction ||
    Object.keys(formattingInstruction).length === 0
  ) {
    const li = document.createElement("li");
    li.textContent = "Tidak ada data format";
    container.appendChild(li);
    return;
  }

  const labelMap = {
    font: "Font",
    fontSize: "Ukuran Font",
    spacing: "Spasi",
    margin: "Margin",
    bookSize: "Ukuran Buku",
  };

  Object.entries(formattingInstruction).forEach(([key, value]) => {
    const li = document.createElement("li");

    const label = labelMap[key] || key;
    const expected = value?.expected || "-";
    const status = value?.foundInstruction
      ? "✔️ Terdeteksi"
      : "❌ Tidak terdeteksi";

    li.textContent = `${label}: ${expected} — ${status}`;
    container.appendChild(li);
  });
}

function renderChecklistEvaluation(id, checklistEvaluation) {
  const container = getEl(id);
  if (!container) return;

  container.innerHTML = "";

  if (!Array.isArray(checklistEvaluation) || checklistEvaluation.length === 0) {
    container.textContent = "-";
    return;
  }

  checklistEvaluation.forEach((section) => {
    const sectionBox = document.createElement("div");
    sectionBox.className = "ai-checklist-section";

    const title = document.createElement("h4");
    title.textContent = section.category || "Kategori Evaluasi";
    sectionBox.appendChild(title);

    const ul = document.createElement("ul");
    ul.className = "md-file-list";

    if (Array.isArray(section.items) && section.items.length > 0) {
      section.items.forEach((item) => {
        const li = document.createElement("li");

        let icon = "⚪";
        if (item.status === "pass") icon = "✔️";
        if (item.status === "partial") icon = "⚠️";
        if (item.status === "fail") icon = "❌";
        if (item.status === "unknown") icon = "❔";

        li.textContent = `${icon} ${item.item || "-"} — ${item.reason || "-"}`;
        ul.appendChild(li);
      });
    } else {
      const li = document.createElement("li");
      li.textContent = "Tidak ada item checklist";
      ul.appendChild(li);
    }

    sectionBox.appendChild(ul);
    container.appendChild(sectionBox);
  });
}

function renderAttachments(files) {
  const attList = getEl("mdAttachmentList");
  if (!attList) return;

  attList.innerHTML = "";

  if (files?.attachments?.length > 0) {
    files.attachments.forEach((att, index) => {
      const li = document.createElement("li");

      const label = document.createElement("span");
      label.textContent = `📄 Lampiran ${index + 1} `;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-small";
      btn.textContent = "Download";
      btn.onclick = () => window.open(att.url, "_blank");

      li.appendChild(label);
      li.appendChild(btn);
      attList.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = "Tidak ada lampiran";
    attList.appendChild(li);
  }
}

function resetManuscriptDetailModal() {
  const textIds = [
    "detailJudul",
    "detailSubJudul",
    "mdJenisIsbn",
    "mdJudul",
    "mdKepengarangan",
    "mdMediaTerbit",
    "mdKelompokPembaca",
    "mdJenisPustaka",
    "mdKategoriPustaka",
    "mdKdt",
    "mdIlustrasi",
    "mdJumlahHalaman",
    "mdTinggiBuku",
    "mdSeriBuku",
    "mdDeskripsi",
    "mdStatus",
    "mdTurnitinFile",
    "mdNaskahFile",
    "mdCoverDepan",
    "mdCoverBelakang",
    "mdAiStatus",
    "mdAiModel",
    "mdAiGeneratedAt",
    "mdFinalRecommendationLabel",
    "mdFinalDecision",
    "mdFinalReason",
    "mdTemplateScore",
    "mdTemplateDescription",
    "mdTemplateAssessedAspects",
    "mdIsbnDetectionLabel",
    "mdIsbnNumbers",
    "mdField",
    "mdReviewerName",
    "mdReviewerExpertise",
    "mdReviewerNote",
    "mdSummary",
    "mdInitialQualityNotes",
    "mdReviewerFocus",
    "mdInitialIssues",
    "mdTemporaryRecommendation",
    "mdAiError",
  ];

  textIds.forEach((id) => setText(id, "-"));

  const listIds = [
    "mdAttachmentList",
    "mdMatchedSections",
    "mdMissingSections",
    "mdFormattingInstruction",
  ];

  listIds.forEach((id) => {
    const el = getEl(id);
    if (el) el.innerHTML = "";
  });

  const checklist = getEl("mdChecklistEvaluation");
  if (checklist) checklist.textContent = "-";

  const downloadButtons = [
    "btnDownloadTurnitin",
    "btnDownloadNaskah",
    "btnDownloadCoverDepan",
    "btnDownloadCoverBelakang",
  ];

  downloadButtons.forEach((id) => {
    const btn = getEl(id);
    if (btn) {
      btn.disabled = true;
      btn.onclick = null;
    }
  });
}

async function loadManuscriptDetail(id) {
  try {
    resetManuscriptDetailModal();

    const res = await authFetch(
      `https://orange-press-be.vercel.app/api/admin/detail/manuscripts/${id}`,
    );

    const result = await res.json();

    if (!result.success) {
      throw new Error(result.message || "Gagal memuat detail");
    }

    const data = result.data || {};

    // ===============================
    // DETAIL DASAR NASKAH
    // ===============================
    setText("detailJudul", data.title || "Tanpa Judul");
    setText("mdJudul", data.title || "-");

    if (Array.isArray(data.contributors) && data.contributors.length > 0) {
      const kepengarangan = data.contributors
        .map((contrib) => `${contrib.role || "-"}: ${contrib.name || "-"}`)
        .join("; ");

      setText("mdKepengarangan", kepengarangan);
      setText("detailSubJudul", kepengarangan);
    } else {
      setText("mdKepengarangan", "-");
      setText("detailSubJudul", "-");
    }

    // Jenis Permohonan ISBN seharusnya dari hopeIsbnType
    setText("mdJenisIsbn", data.hopeIsbnType || "-");

    // Media Terbitan ISBN dari isbnType
    setText("mdMediaTerbit", data.isbnType || "-");

    setText("mdKelompokPembaca", data.readerGroup || "-");
    setText("mdJenisPustaka", data.libraryType || "-");
    setText("mdKategoriPustaka", data.categoryType || "-");
    setText("mdKdt", data.needKdt ? "Ya" : "Tidak");
    setText("mdIlustrasi", data.hasIllustration ? "Ya" : "Tidak");
    setText("mdJumlahHalaman", data.pageCount || "-");
    setText(
      "mdTinggiBuku",
      data.bookHeightCm ? `${data.bookHeightCm} cm` : "-",
    );
    setText("mdSeriBuku", data.seriesName || "-");
    setText("mdDeskripsi", data.synopsis || data.description || "-");
    setText("mdStatus", data.statusLabel || data.status || "-");

    // ===============================
    // FILE & LAMPIRAN
    // ===============================
    const files = data.files || {};

    setupDownload(
      "btnDownloadTurnitin",
      files.plagiarismReport?.[0]?.url,
      "mdTurnitinFile",
    );

    setupDownload(
      "btnDownloadNaskah",
      files.manuscripts?.[0]?.url,
      "mdNaskahFile",
    );

    setupDownload(
      "btnDownloadCoverDepan",
      files.coverFront?.[0]?.url,
      "mdCoverDepan",
    );

    setupDownload(
      "btnDownloadCoverBelakang",
      files.coverBack?.[0]?.url,
      "mdCoverBelakang",
    );

    renderAttachments(files);

    // ===============================
    // AI EDITORIAL / AI CO-REVIEWER
    // ===============================
    const ai = data.aiEditorialRecommendation || {};
    const template = ai.templateCompatibility || {};
    const isbn = ai.isbnDetection || {};
    const fieldReviewer = ai.fieldAndReviewer || {};
    const finalRec = ai.finalRecommendation || {};

    setText("mdAiStatus", formatAiStatus(ai.status));
    setText("mdAiModel", ai.model || "-");
    setText("mdAiGeneratedAt", formatDateTime(ai.generatedAt));

    // Final Recommendation
    setText(
      "mdFinalRecommendationLabel",
      finalRec.label || ai.temporaryRecommendation || "-",
    );
    setText("mdFinalDecision", finalRec.decision || "-");
    setText("mdFinalReason", finalRec.reason || "-");

    // Template Compatibility
    setText("mdTemplateScore", template.label || `${template.score || 0}%`);
    setText("mdTemplateDescription", template.description || "-");
    setText("mdTemplateAssessedAspects", template.assessedAspects || "-");

    renderSimpleList(
      "mdMatchedSections",
      template.matchedSections,
      "Belum ada bagian yang terdeteksi sesuai",
    );

    renderSimpleList(
      "mdMissingSections",
      template.missingSections,
      "Tidak ada bagian yang kurang",
    );

    renderFormattingInstruction(
      "mdFormattingInstruction",
      template.formattingInstruction,
    );

    // ISBN Detection
    setText("mdIsbnDetectionLabel", isbn.label || "-");
    setText(
      "mdIsbnNumbers",
      Array.isArray(isbn.numbers) && isbn.numbers.length > 0
        ? isbn.numbers.join(", ")
        : "-",
    );

    // Field & Reviewer
    setText("mdField", fieldReviewer.field || "-");
    setText("mdReviewerName", fieldReviewer.reviewer || "-");
    setText("mdReviewerExpertise", fieldReviewer.expertise || "-");
    setText("mdReviewerNote", fieldReviewer.note || "-");

    // AI Notes
    setText("mdSummary", ai.summary || "-");
    setText("mdInitialQualityNotes", ai.initialQualityNotes || "-");
    setText("mdReviewerFocus", ai.reviewerFocus || "-");
    setText("mdInitialIssues", ai.initialIssues || "-");
    setText("mdTemporaryRecommendation", ai.temporaryRecommendation || "-");
    setText("mdAiError", ai.error || "-");

    // Checklist
    renderChecklistEvaluation(
      "mdChecklistEvaluation",
      ai.checklistEvaluation || [],
    );

    // Tampilkan modal
    const modal = getEl("manuscriptDetailModal");
    if (modal) {
      modal.style.display = "flex";
    }
  } catch (err) {
    console.error("Error loading detail:", err);

    Swal.fire("Error", err.message || "Gagal memuat detail naskah.", "error");
  }
}

function closeManuscriptDetailModal() {
  const modal = getEl("manuscriptDetailModal");
  if (modal) {
    modal.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const closeBtn = getEl("closeDetailBtn");
  const closeBtn2 = getEl("closeDetailBtn2");
  const modal = getEl("manuscriptDetailModal");

  if (closeBtn) {
    closeBtn.addEventListener("click", closeManuscriptDetailModal);
  }

  if (closeBtn2) {
    closeBtn2.addEventListener("click", closeManuscriptDetailModal);
  }

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeManuscriptDetailModal();
      }
    });
  }
});

// Render tabel (sama seperti sebelumnya)
function renderManuscriptTable(manuscripts) {
  const tbody = document.querySelector("#manuscriptTable tbody");
  if (!manuscripts || manuscripts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center">Tidak ada naskah.</td></tr>`;
    return;
  }

  tbody.innerHTML = manuscripts
    .map((m) => {
      const penulis =
        m.contributors
          .filter((c) => c.role === "Penulis")
          .map((c) => c.name)
          .join(", ") || "-";

      return `
        <tr data-id="${m._id}">
          <td class="col-judul">${m.title || "-"}</td>
          <td class="col-penulis">${penulis}</td>
          <td class="col-status"><span class="status-badge">${m.statusLabel || "-"}</span></td>
          <td class="col-aksi">
            <button class="btn-detail" onclick="openManuscriptDetail('${m._id}')">Detail</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function openManuscriptDetail(id) {
  loadManuscriptDetail(id);
}

// Pencarian
document.getElementById("searchNaskah").addEventListener("input", async (e) => {
  const query = e.target.value.toLowerCase().trim();
  if (query === "") {
    loadManuscripts();
    return;
  }

  try {
    const res = await authFetch("/api/admin/manuscripts");
    const manuscripts = await res.json();
    const filtered = manuscripts.filter(
      (m) =>
        m.title.toLowerCase().includes(query) ||
        m.contributors.some((c) => c.name.toLowerCase().includes(query)),
    );
    renderManuscriptTable(filtered);
  } catch (err) {
    console.error("Search error:", err);
  }
});

// Fungsi untuk menyembunyikan modal
function hideManuscriptModal() {
  const modal = document.getElementById("manuscriptDetailModal");
  if (modal) {
    modal.style.display = "none";
  }
}

// Inisialisasi Event Listener setelah DOM siap
document.addEventListener("DOMContentLoaded", () => {
  // Panggil fungsi muat data yang sudah ada
  loadManuscripts();

  // Ambil elemen-elemen tombol close
  const closeBtn1 = document.getElementById("closeDetailBtn");
  const closeBtn2 = document.getElementById("closeDetailBtn2");
  const modal = document.getElementById("manuscriptDetailModal");

  // Klik tombol silang (✕)
  if (closeBtn1) {
    closeBtn1.addEventListener("click", hideManuscriptModal);
  }

  // Klik tombol "Tutup" di footer modal
  if (closeBtn2) {
    closeBtn2.addEventListener("click", hideManuscriptModal);
  }

  // Klik di luar kotak modal (pada area background gelap) untuk menutup
  window.addEventListener("click", (event) => {
    if (event.target === modal) {
      hideManuscriptModal();
    }
  });
});
