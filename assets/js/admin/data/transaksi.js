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
  }).format(date);
}

function formatRupiah(angka) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

// ==============
// FETCH & RENDER TRANSAKSI
// ==============
async function loadPayments() {
  const token = getAuthToken();
  if (!token) return;

  const container = document.getElementById("paymentsList");
  if (!container) return;

  try {
    const res = await fetch("https://orange-press-be.vercel.app/api/admin/payments", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Gagal memuat data transaksi.");

    const result = await res.json();
    const payments = result.data || [];

    if (payments.length === 0) {
      container.innerHTML = `<p class="text-center muted">Tidak ada transaksi ditemukan.</p>`;
      return;
    }

    container.innerHTML = payments
      .map(
        (p) => `
      <div class="payment-item">
        <div class="payment-left">
          <div class="payment-proof-wrap">
            ${renderProofPreview(p.paymentProofUrl)}
            <button 
              type="button" 
              class="btn-detail payment-detail-btn"
              onclick="openPaymentDetail('${p._id}')"
            >
              Detail Transaksi
            </button>
          </div>

          <div class="payment-info">
            <strong>${escapeHtml(p.userId?.email || "-")}</strong>
            <div class="pack">${getPackageName(p.packageId)}</div>
            <div class="muted">
              ${formatRupiah(getPackagePrice(p.packageId))} • ${formatDate(
                p.createdAt,
              )}
            </div>
          </div>
        </div>

        <div class="payment-status">
          <select 
            class="status-dropdown ${
              p.status === "Approved" ? "status-confirmed" : "status-pending"
            }"
            onchange="updatePaymentStatus('${p._id}', this.value)"
          >
            <option value="Pending" ${p.status === "Pending" ? "selected" : ""}>
              Belum dikonfirmasi
            </option>
            <option value="Approved" ${
              p.status === "Approved" ? "selected" : ""
            }>
              Terkonfirmasi
            </option>
          </select>
        </div>
      </div>
    `,
      )
      .join("");
  } catch (err) {
    console.error("Error loading payments:", err);
    container.innerHTML = `<p class="text-center error">Gagal memuat transaksi. Coba lagi nanti.</p>`;
  }
}

// Helper: escape HTML
function escapeHtml(text) {
  if (typeof text !== "string") return String(text);
  return text.replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[m],
  );
}

// Helper: render proof preview
function renderProofPreview(url) {
  if (!url) {
    return `<div class="payment-proof muted">Belum ada bukti</div>`;
  }

  const ext = url.split(".").pop().toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
    return `<img src="${url}" class="payment-proof" alt="Bukti Transfer">`;
  } else if (ext === "pdf") {
    return `
      <object
        data="${url}#page=1&zoom=page-width"
        type="application/pdf"
        class="payment-proof"
        style="width:100%;height:100%;border:0;border-radius:12px;overflow:hidden;pointer-events:none;"
      >
        <div class="payment-proof muted" style="display:flex;align-items:center;justify-content:center;text-align:center;padding:10px;">
          📄 Bukti PDF
        </div>
      </object>
    `;
  } else {
    return `
      <div class="payment-proof muted" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:10px;">
        📄 File ${ext.toUpperCase()}
        <small class="muted" style="margin-top:6px;">Klik Detail</small>
      </div>
    `;
  }
}

// Mapping sementara (ganti dengan fetch jika perlu)
function getPackageName(packageId) {
  const map = {
    "6965ab58ccbd837181cca885": "Paket 10 Eksemplar",
    "6965ab86ccbd837181cca887": "Paket 15 Eksemplar",
    "6965ab98ccbd837181cca889": "Paket 20 Eksemplar",
  };
  return map[packageId] || "Paket Tidak Diketahui";
}

function getPackagePrice(packageId) {
  const map = {
    "6965ab58ccbd837181cca885": 750000,
    "6965ab86ccbd837181cca887": 1000000,
    "6965ab98ccbd837181cca889": 1300000,
  };
  return map[packageId] || 0;
}

// ==============
// UPDATE STATUS (APPROVE/REJECT)
// ==============
window.updatePaymentStatus = async (paymentId, newStatus) => {
  const token = getAuthToken();
  if (!token) return;

  const endpoint =
    newStatus === "Approved"
      ? `/api/admin/payments/${paymentId}/verify`
      : `/api/admin/payments/${paymentId}/reject`;

  try {
    const res = await fetch(`https://orange-press-be.vercel.app${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Gagal memperbarui status.");
    }

    // Reload daftar
    loadPayments();

    // Opsional: notifikasi
    Swal.fire({
      icon: "success",
      title: "Berhasil!",
      text: `Transaksi ${newStatus === "Approved" ? "disetujui" : "ditolak"}.`,
      timer: 1500,
      showConfirmButton: false,
    });
  } catch (err) {
    console.error("Error updating payment status:", err);
    Swal.fire("Error", err.message || "Gagal memperbarui status.", "error");

    // Reset select ke status sebelumnya
    document.querySelectorAll(`.payment-item`).forEach((item) => {
      const select = item.querySelector("select");
      if (select && select.onchange.toString().includes(paymentId)) {
        select.value = select.value === "Approved" ? "Pending" : "Approved";
      }
    });
  }
};

// ==============
// MODAL DETAIL (opsional - bisa diimplementasi terpisah)
// ==============
window.openPaymentDetail = (paymentId) => {
  // Untuk saat ini, redirect ke halaman detail atau buka modal
  // Anda bisa implementasikan modal seperti di contoh sebelumnya
  alert(`Detail transaksi ID: ${paymentId}`);
};

// Fungsi untuk menutup modal
function closePaymentModal() {
  const modal = document.getElementById("paymentDetailModal");
  if (modal) {
    modal.classList.remove("show");
    // Opsional: Jika Anda menggunakan style display manual
    modal.style.display = "none";
  }
}

// Inisialisasi Event Listener saat DOM dimuat
document.addEventListener("DOMContentLoaded", () => {
  loadPayments(); // Fungsi yang sudah Anda punya

  const closeBtn = document.getElementById("closePaymentDetailBtn");
  const modal = document.getElementById("paymentDetailModal");

  // Klik tombol (X)
  if (closeBtn) {
    closeBtn.addEventListener("click", closePaymentModal);
  }

  // Klik di luar area modal (pada background abu-abu)
  window.addEventListener("click", (event) => {
    if (event.target === modal) {
      closePaymentModal();
    }
  });
});

// =============================
// RENDER PROOF DI MODAL DETAIL
// =============================
function renderProofInModal(url) {
  const imgEl = document.getElementById("paymentDetailImg");
  const imgParent = imgEl ? imgEl.parentElement : null;

  if (!imgEl || !imgParent) return;

  // Bersihkan PDF object lama jika ada
  const oldPdf = document.getElementById("paymentDetailPdfObject");
  if (oldPdf) oldPdf.remove();

  if (!url) {
    imgEl.style.display = "block";
    imgEl.src = "";
    imgEl.alt = "Belum ada bukti";
    return;
  }

  const ext = url.split(".").pop().toLowerCase();

  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
    imgEl.style.display = "block";
    imgEl.src = url;
    imgEl.alt = "Bukti Transfer";
  } else if (ext === "pdf") {
    imgEl.style.display = "none"; // hide image
    const obj = document.createElement("object");
    obj.id = "paymentDetailPdfObject";
    obj.type = "application/pdf";
    obj.data = `${url}#page=1&zoom=page-width`;
    obj.style.width = "100%";
    obj.style.height = "300px";
    obj.style.border = "0";
    obj.style.borderRadius = "8px";
    obj.style.overflow = "hidden";
    imgParent.appendChild(obj);
  } else {
    imgEl.style.display = "block";
    imgEl.src = "";
    imgEl.alt = "File tidak didukung";
  }
}

window.openPaymentDetail = async (paymentId) => {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(
      `https://orange-press-be.vercel.app/api/admin/payment/${paymentId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!res.ok) throw new Error("Gagal memuat detail.");

    const result = await res.json();
    const p = result.data;

    // Isi modal
    document.getElementById("paymentDetailAuthor").textContent =
      p.userId?.fullname || "-";
    document.getElementById("paymentDetailPackage").textContent =
      p.packageId?.title || "-";
    document.getElementById("paymentDetailAmount").textContent =
      "Rp " + Number(p.packageId?.price || 0).toLocaleString("id-ID");
    document.getElementById("paymentDetailDate").textContent = formatDate(
      p.createdAt,
    );
    document.getElementById("paymentDetailBank").textContent =
      p.bankName || "-";
    document.getElementById("paymentDetailRek").textContent =
      p.accountNumber || "-";
    document.getElementById("paymentDetailAtasNama").textContent =
      p.accountHolder || "-";

    // Tampilkan bukti bayar
    renderProofInModal(p.paymentProofUrl);

    // Aktifkan tombol PKS jika ada
    const pksBtn = document.getElementById("downloadPaymentPksBtn");
    if (pksBtn) {
      pksBtn.disabled = !p.pksFileUrl;
      pksBtn.onclick = () => window.open(p.pksFileUrl, "_blank");
    }

    // Tampilkan modal
    document.getElementById("paymentDetailModal").classList.add("show");
  } catch (err) {
    Swal.fire("Error", err.message, "error");
  }
};
