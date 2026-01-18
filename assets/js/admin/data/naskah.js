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
    const res = await authFetch("https://orange-press-be.vercel.app/api/admin/manuscripts");
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
async function loadManuscriptDetail(id) {
  try {
    const res = await authFetch(
      `https://orange-press-be.vercel.app/api/admin/detail/manuscripts/${id}`,
    );
    const result = await res.json();

    if (!result.success)
      throw new Error(result.message || "Gagal memuat detail");

    const data = result.data;

    // --- Isi field seperti sebelumnya ---
    document.getElementById("detailJudul").textContent =
      data.title || "Tanpa Judul";

    if (data.contributors?.length > 0) {
      const kepengarangan = data.contributors
        .map((contrib) => `${contrib.role}: ${contrib.name}`)
        .join("; ");
      document.getElementById("mdKepengarangan").textContent = kepengarangan;
    } else {
      document.getElementById("mdKepengarangan").textContent = "-";
    }

    // ... (isi semua field lain seperti di jawaban sebelumnya)

    // Contoh lanjutan:
    document.getElementById("mdJenisIsbn").textContent = data.isbnType || "-";
    document.getElementById("mdMediaTerbit").textContent = data.isbnType || "-";
    document.getElementById("mdKelompokPembaca").textContent =
      data.readerGroup || "-";
    document.getElementById("mdJenisPustaka").textContent =
      data.libraryType || "-";
    document.getElementById("mdKategoriPustaka").textContent =
      data.categoryType || "-";
    document.getElementById("mdKdt").textContent = data.needKdt
      ? "Ya"
      : "Tidak";
    document.getElementById("mdIlustrasi").textContent = data.hasIllustration
      ? "Ya"
      : "Tidak";
    document.getElementById("mdJumlahHalaman").textContent =
      data.pageCount || "-";
    document.getElementById("mdTinggiBuku").textContent = data.bookHeightCm
      ? `${data.bookHeightCm} cm`
      : "-";
    document.getElementById("mdSeriBuku").textContent = data.seriesName || "-";
    document.getElementById("mdDeskripsi").textContent =
      data.synopsis || data.description || "-";
    document.getElementById("mdStatus").textContent = data.statusLabel || "-";

    // --- File ---
    const files = data.files || {};
    const setupDownload = (btnId, url, spanId) => {
      const btn = document.getElementById(btnId);
      const span = document.getElementById(spanId);
      if (url) {
        span.textContent = "Tersedia";
        btn.disabled = false;
        btn.onclick = () => window.open(url, "_blank");
      } else {
        span.textContent = "-";
        btn.disabled = true;
      }
    };

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

    // Attachment list
    const attList = document.getElementById("mdAttachmentList");
    attList.innerHTML = "";
    if (files.attachments?.length > 0) {
      files.attachments.forEach((att) => {
        const li = document.createElement("li");
        li.innerHTML = `
            📄 File tersedia
            <button type="button" class="btn-small" onclick="window.open('${att.url}', '_blank')">Download</button>
          `;
        attList.appendChild(li);
      });
    } else {
      attList.innerHTML = "<li>Tidak ada lampiran</li>";
    }

    // Tampilkan modal
    document.getElementById("manuscriptDetailModal").style.display = "flex";
  } catch (err) {
    console.error("Error loading detail:", err);
    Swal.fire("Error", "Gagal memuat detail naskah.", "error");
  }
}

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
