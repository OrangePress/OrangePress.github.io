// ==============
// UTILS
// ==============
function getAuthToken() {
  return localStorage.getItem("token");
}

function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// ==============
// FETCH & RENDER DATA AKUN
// ==============
async function loadAuthors() {
  const token = getAuthToken();
  if (!token) {
    Swal.fire("Error", "Anda belum login.", "error");
    return;
  }

  const tableBody = document.querySelector("#authorsTable tbody");
  const searchInput = document.getElementById("searchAuthor");

  try {
    const res = await fetch("https://orange-press-be.vercel.app/api/admin/user", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Gagal memuat data akun.");

    const result = await res.json();
    let authors = result.data || [];

    // Fungsi render
    const renderTable = (data) => {
      if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center">Tidak ada data ditemukan.</td></tr>`;
        return;
      }

      tableBody.innerHTML = data
        .map(
          (user) => `
        <tr>
          <td>${escapeHtml(user.fullname)}</td>
          <td>${user.phone || "-"}</td>
          <td>${escapeHtml(user.email)}</td>
          <td>
            <span class="role-badge role-${user.role}">${user.role}</span>
          </td>
          <td>
            <button 
              class="btn-detail" 
              onclick="openAuthorDetail('${user._id}')"
            >
              Detail
            </button>
          </td>
        </tr>
      `
        )
        .join("");
    };

    // Render awal
    renderTable(authors);

    // Search handler
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase().trim();
        if (!term) {
          renderTable(authors);
          return;
        }

        const filtered = authors.filter(
          (user) =>
            user.fullname.toLowerCase().includes(term) ||
            user.email.toLowerCase().includes(term) ||
            (user.phone && user.phone.includes(term))
        );
        renderTable(filtered);
      });
    }
  } catch (err) {
    console.error("Error loading authors:", err);
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center error">Gagal memuat data. Coba lagi nanti.</td></tr>`;
  }
}

// Helper escape HTML
function escapeHtml(text) {
  if (typeof text !== "string") return String(text);
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// ==============
// MODAL DETAIL PENULIS
// ==============
const authorDetailModal = document.getElementById("authorDetailModal");
const authorDetailBody = document.getElementById("authorDetailBody");
const authorDetailName = document.getElementById("authorDetailName");
const authorDetailSubtitle = document.getElementById("authorDetailSubtitle");

window.openAuthorDetail = async (userId) => {
  const token = getAuthToken();
  if (!token || !authorDetailModal) return;

  try {
    const res = await fetch(`https://orange-press-be.vercel.app/api/admin/user/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Gagal memuat detail akun.");

    const result = await res.json();
    const user = result.data;

    // Update header
    authorDetailName.textContent = user.fullname;
    authorDetailSubtitle.textContent = `${user.role} • ${user.email}`;

    // Format status
    const statusBadge =
      user.status === "aktif"
        ? '<span class="status-badge status-active">Aktif</span>'
        : '<span class="status-badge status-inactive">Nonaktif</span>';

    // Render body
    authorDetailBody.innerHTML = `
      <div class="detail-row">
        <div class="detail-label">ID Pengguna</div>
        <div class="detail-value">${user._id}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Username</div>
        <div class="detail-value">${escapeHtml(user.username)}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Nomor Telepon</div>
        <div class="detail-value">${user.phone || "-"}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Status Akun</div>
        <div class="detail-value">${statusBadge}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Dibuat pada</div>
        <div class="detail-value">${formatDate(user.createdAt)}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Terakhir diubah</div>
        <div class="detail-value">${formatDate(user.updatedAt)}</div>
      </div>
    `;

    // Tampilkan modal
    authorDetailModal.style.display = "flex";
  } catch (err) {
    console.error("Error loading author detail:", err);
    authorDetailBody.innerHTML = `<p class="error">Gagal memuat detail akun.</p>`;
    authorDetailModal.style.display = "flex";
  }
};

// Tutup modal
function closeAuthorDetail() {
  if (authorDetailModal) {
    authorDetailModal.style.display = "none";
  }
}

// Pasang event listener untuk tombol tutup
["closeAuthorDetailBtn", "closeAuthorDetailBtn2"].forEach((id) => {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener("click", closeAuthorDetail);
  }
});

// Tutup modal saat klik di luar konten
if (authorDetailModal) {
  authorDetailModal.addEventListener("click", (e) => {
    if (e.target === authorDetailModal) closeAuthorDetail();
  });
}

// ==============
// INISIALISASI
// ==============
document.addEventListener("DOMContentLoaded", () => {
  loadAuthors();
});
