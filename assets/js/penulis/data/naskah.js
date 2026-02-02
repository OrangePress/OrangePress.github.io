const token = localStorage.getItem("token");

// === FUNGSI BANTU ===
function safeValue(val) {
  return val != null
    ? String(val).replace(/</g, "&lt;").replace(/>/g, "&gt;")
    : "-";
}

function statusBadge(status, label) {
  let cls = "badge rounded-pill ";
  if (status === "Draft" || label === "Draft") cls += "bg-secondary";
  else if (status === "Review" || label === "Review") cls += "bg-warning";
  else if (status === "Approved" || label === "Disetujui") cls += "bg-success";
  else cls += "bg-secondary";

  return `<span class="${cls}">${label || status || "Draft"}</span>`;
}

// === LOAD DAFTAR NASKAH PENULIS ===
async function loadAuthorManuscripts() {
  const loading = document.getElementById("loading");
  const tableSection = document.getElementById("manuscriptTableSection");
  const detailSection = document.getElementById("manuscriptDetailSection");
  const formSection = document.getElementById("uploadFormSection");
  const tbody = document.getElementById("manuscriptTableBody");

  try {
    loading.style.display = "block";

    const res = await fetch(
      "https://orange-press-be.vercel.app/api/author/manuscripts/my",
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) throw new Error("Gagal memuat naskah");

    const result = await res.json();
    const manuscripts = result.data || [];

    if (manuscripts.length === 0) {
      formSection.style.display = "block";
      tableSection.style.display = "none";
      detailSection.style.display = "none";
      return;
    }

    // tampilkan tabel
    formSection.style.display = "none";
    tableSection.style.display = "block";
    detailSection.style.display = "none";

    tbody.innerHTML = manuscripts
      .map(
        (m) => `
      <tr>
        <td>
          <strong>${safeValue(m.title)}</strong><br>
          <small class="text-muted">${safeValue(m.seriesName || "-")}</small>
        </td>
        <td>${statusBadge(m.status, m.statusLabel)}</td>
        <td>${m.revisionCount || 0}</td>
        <td>${new Date(m.createdAt).toLocaleDateString("id-ID")}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary"
            onclick="openManuscriptDetail('${m._id}')">
            Detail
          </button>
        </td>
      </tr>
    `,
      )
      .join("");
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "Gagal memuat daftar naskah", "error");
  } finally {
    loading.style.display = "none";
  }
}

async function uploadRevision(manuscriptId, fileInput) {
  const file = fileInput.files[0];
  if (!file) {
    Swal.fire({
      icon: "warning",
      title: "Peringatan",
      text: "Harap pilih file revisi terlebih dahulu.",
      customClass: { container: "my-swal-highest" },
    });
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  Swal.fire({
    title: "Mengunggah revisi...",
    didOpen: () => Swal.showLoading(),
    allowOutsideClick: false,
    customClass: { container: "my-swal-highest" },
  });

  try {
    const res = await fetch(
      `https://orange-press-be.vercel.app/api/author/manuscripts/${manuscriptId}/reupload`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      },
    );

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "Gagal mengunggah revisi");

    Swal.fire({
      icon: "success",
      title: "Berhasil!",
      text: "Revisi berhasil diunggah. Menunggu review dari reviewer.",
      customClass: { container: "my-swal-highest" },
    });

    // Refresh halaman
    location.reload();
  } catch (err) {
    console.error(err);
    Swal.fire({
      icon: "error",
      title: "Gagal",
      text: err.message || "Terjadi kesalahan saat mengunggah revisi",
      customClass: { container: "my-swal-highest" },
    });
  }
}

window.openManuscriptDetail = async (manuscriptId) => {
  const loading = document.getElementById("loading");
  const tableSection = document.getElementById("manuscriptTableSection");
  const detailSection = document.getElementById("manuscriptDetailSection");

  try {
    loading.style.display = "block";

    const res = await fetch(
      `https://orange-press-be.vercel.app/api/author/manuscripts/${manuscriptId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!res.ok) throw new Error("Gagal memuat detail naskah");

    const result = await res.json();
    const manuscript = result.data;

    renderManuscriptDetail(manuscript);

    tableSection.style.display = "none";
    detailSection.style.display = "block";
  } catch (err) {
    console.error(err);
    Swal.fire("Error", err.message, "error");
  } finally {
    loading.style.display = "none";
  }
};

// === RENDER DETAIL NASKAH ===
function renderManuscriptDetail(m) {
  // Ambil file
  const mId = m._id;
  const manuscripts = m.files?.manuscripts || [];
  const coverFront = m.files?.coverFront?.[0]?.url || "";
  const coverBack = m.files?.coverBack?.[0]?.url || "";

  // Format tanggal
  const createdAt = new Date(m.createdAt).toLocaleDateString("id-ID");
  const updatedAt = new Date(m.updatedAt).toLocaleDateString("id-ID");

  // Informasi Penulis
  const authorInfo = m.userId
    ? `${m.userId.fullname} (${m.userId.email})`
    : "Tidak tersedia";

  const isReturned = m.status === "Returned" || m.statusLabel === "Returned";
  const revisionNoteContent =
    isReturned && m.revisionNote
      ? `<div class="revision-note-box mb-3">
        <small class="fw-bold text-warning d-block mb-1">Catatan Revisi:</small>
        <p class="small mb-0 text-dark">${safeValue(m.revisionNote)}</p>
      </div>`
      : "";

  const revisionFileUrl = m.revisionFileUrl;
  const revisionFileBlock = revisionFileUrl
    ? `
    <h6 class="fw-bold mb-2 small text-uppercase">File Revisi dari Reviewer</h6>
    <div class="border rounded p-2 bg-light mb-3">
      <a href="${revisionFileUrl}" target="_blank"
        class="badge bg-warning text-decoration-none">
        Download File Revisi
      </a>
    </div>
  `
    : `
    <h6 class="fw-bold mb-2 small text-uppercase">File Revisi dari Reviewer</h6>
    <p class="text-muted small mb-3">Belum ada file revisi dari reviewer</p>
  `;

  // Tampilkan tombol revisi hanya jika status = "Revision"
  const revisionButton =
    m.status === "Returned"
      ? `
            <div class="mt-3">
              <label for="revisionFile-${mId}" class="form-label fw-bold">Upload Revisi</label>
              <div class="input-group">
                <input type="file" class="form-control" id="revisionFile-${mId}" accept=".docx">
                <button class="btn btn-warning" type="button" onclick="uploadRevision('${mId}', document.getElementById('revisionFile-${mId}'))">
                  Kirim Revisi
                </button>
              </div>
              <small class="text-muted">Format: Docx</small>
            </div>
          `
      : "";

  const html = `
    <div class="manuscript-card">
      <div class="banner-header">
        ${
          coverFront
            ? `<img src="${coverFront}" class="banner-bg" alt="Cover Depan">`
            : ""
        }
        <div class="status-floating">${statusBadge(
          m.status,
          m.statusLabel,
        )}</div>
        <div class="position-relative">
          <h2 class="text-white fw-bold mb-0">${safeValue(m.title)}</h2>
          <p class="text-white-50 mb-0 small">Dibuat: ${createdAt}</p>
        </div>
      </div>

      <div class="p-4">
        <div class="row g-4">
          <div class="col-lg-4">
            <h6 class="fw-bold mb-3">Informasi Naskah</h6>
            <div class="info-grid mb-3">
              <div class="info-item"><label>ISBN</label><span>${safeValue(
                m.isbn,
              )}</span></div>
              <div class="info-item"><label>Tahun</label><span>${safeValue(
                m.publishYear,
              )}</span></div>
              <div class="info-item"><label>Revisi</label><span>${safeValue(
                m.revisionCount,
              )}</span></div>
              <div class="info-item"><label>Status Step</label><span>${safeValue(
                m.statusStep,
              )}</span></div>
              <div class="info-item"><label>Perpusnas</label><span>${
                m.isUploadedToPerpusnas ? "Ya" : "Tidak"
              }</span></div>
              <div class="info-item"><label>Published</label><span>${
                m.isPublished ? "Ya" : "Tidak"
              }</span></div>
              <div class="info-item"><label>Ilustrasi</label><span>${
                m.hasIllustration ? "Ya" : "Tidak"
              }</span></div>
              <div class="info-item"><label>ID Naskah</label><span>${
                m._id
              }</span></div>
            </div>

            
            <h6 class="fw-bold mb-1">Deskripsi</h6>
            <p class="text-muted small mb-3 description-text">${safeValue(m.description)}</p>

            ${revisionNoteContent}

  <h6 class="fw-bold mb-2 small text-uppercase">Penulis</h6>
  <p class="text-muted small mb-3">${authorInfo}</p>

  ${revisionFileBlock}


  <h6 class="fw-bold mb-2 small text-uppercase">Riwayat Upload Naskah</h6>
            <div class="history-list border rounded p-2 bg-light">
              ${
                manuscripts.length > 0
                  ? manuscripts
                      .map(
                        (file, index) => `
                  <div class="d-flex justify-content-between align-items-center mb-1 pb-1 border-bottom">
                    <span class="small text-truncate me-2">Versi ${
                      index + 1
                    } (${new Date(file.uploadedAt).toLocaleDateString(
                      "id-ID",
                    )})</span>
                    <a href="${
                      file.url
                    }" target="_blank" class="badge bg-primary text-decoration-none">Buka</a>
                  </div>
                `,
                      )
                      .join("")
                  : "<p class='small text-muted mb-0'>Belum ada riwayat upload</p>"
              }
            </div>
            <!-- Tombol Revisi -->
                  ${revisionButton}
          </div>

          <div class="col-lg-8">
            <ul class="nav nav-tabs nav-tabs-custom mb-3" role="tablist">
              <li class="nav-item" role="presentation">
                <button class="nav-link" data-bs-toggle="tab" data-bs-target="#cover-${
                  m._id
                }" type="button" role="tab">Cover Belakang</button>
              </li>
            </ul>

            <div class="tab-content">
              <div class="tab-pane fade" id="cover-${m._id}">
                <div class="preview-container">
                  ${
                    coverBack
                      ? `<img src="${coverBack}" alt="Cover Belakang">`
                      : "<p class='text-muted'>Cover belakang belum diupload</p>"
                  }
                </div>
              </div>
            </div>

            <div class="mt-4">
              <h6 class="section-title">Metadata Sistem</h6>
              <div class="row">
                <div class="col-md-6">
                  <p><strong>Dibuat:</strong> ${createdAt}</p>
                  <p><strong>Diupdate:</strong> ${updatedAt}</p>
                </div>
                <div class="col-md-6">
                  <p><strong>ID Author:</strong> ${m.userId?._id || "-"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("manuscriptDetail").innerHTML = html;
}

// === JALANKAN SAAT HALAMAN SIAP ===
document.addEventListener("DOMContentLoaded", () => {
  loadAuthorManuscripts();
});
