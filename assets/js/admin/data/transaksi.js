// ======================
// GLOBAL STATE
// ======================
let packageMap = {};

// ======================
// UTILS
// ======================
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
  }).format(angka || 0);
}

function escapeHtml(text) {
  if (typeof text !== "string") return String(text || "");
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

// ======================
// FETCH PACKAGES
// ======================
async function loadPackages() {
  const token = getAuthToken();
  if (!token) return;

  try {
    const res = await fetch("https://orange-press-be.vercel.app/api/packages", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Gagal memuat package");

    const packages = await res.json();
    packageMap = {};

    packages.forEach((pkg) => {
      packageMap[pkg._id] = pkg;
    });
  } catch (err) {
    console.error("Load package error:", err);
  }
}

// ======================
// SAFE PACKAGE RESOLVER
// ======================
function getPackage(packageData) {
  // CASE 1: populate lengkap
  if (
    typeof packageData === "object" &&
    packageData !== null &&
    packageData.title
  ) {
    return {
      title: packageData.title,
      price: packageData.price || 0,
    };
  }

  // CASE 2: object tapi cuma {_id}
  if (
    typeof packageData === "object" &&
    packageData !== null &&
    packageData._id
  ) {
    const pkg = packageMap[packageData._id];
    if (pkg) return pkg;
  }

  // CASE 3: string ID
  if (typeof packageData === "string") {
    const pkg = packageMap[packageData];
    if (pkg) return pkg;
  }

  // fallback terakhir
  return {
    title: "Paket Tidak Diketahui",
    price: 0,
  };
}

// ======================
// PROOF PREVIEW
// ======================
function renderProofPreview(url) {
  if (!url) {
    return `<div class="payment-proof muted">Belum ada bukti</div>`;
  }

  const ext = url.split(".").pop().toLowerCase();

  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
    return `<img src="${url}" class="payment-proof" alt="Bukti Transfer">`;
  }

  if (ext === "pdf") {
    return `
      <object
        data="${url}#page=1&zoom=page-width"
        type="application/pdf"
        class="payment-proof"
        style="width:100%;height:100%;border:0;border-radius:12px;pointer-events:none;"
      ></object>
    `;
  }

  return `<div class="payment-proof muted">📄 File</div>`;
}

// ======================
// LOAD & RENDER PAYMENTS
// ======================
async function loadPayments() {
  const token = getAuthToken();
  if (!token) return;

  const container = document.getElementById("paymentsList");
  if (!container) return;

  try {
    const res = await fetch(
      "https://orange-press-be.vercel.app/api/admin/payments",
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!res.ok) throw new Error("Gagal memuat transaksi");

    const result = await res.json();
    const payments = result.data || [];

    if (payments.length === 0) {
      container.innerHTML = `<p class="text-center muted">Tidak ada transaksi.</p>`;
      return;
    }

    container.innerHTML = payments
      .map((p) => {
        const pkg = getPackage(p.packageId);

        return `
          <div class="payment-item">
            <div class="payment-left">
              <div class="payment-proof-wrap">
                ${renderProofPreview(p.paymentProofUrl)}
                <button class="btn-detail payment-detail-btn"
                  onclick="openPaymentDetail('${p._id}')">
                  Detail Transaksi
                </button>
              </div>

              <div class="payment-info">
                <strong>${escapeHtml(p.userId?.email || "-")}</strong>
                <div class="pack">${pkg.title}</div>
                <div class="muted">
                  ${formatRupiah(pkg.price)} • ${formatDate(p.createdAt)}
                </div>
              </div>
            </div>

            <div class="payment-status">
              <select
                class="status-dropdown ${
                  p.status === "Approved"
                    ? "status-confirmed"
                    : "status-pending"
                }"
                onchange="updatePaymentStatus('${p._id}', this.value)">
                <option value="Pending" ${
                  p.status === "Pending" ? "selected" : ""
                }>Belum dikonfirmasi</option>
                <option value="Approved" ${
                  p.status === "Approved" ? "selected" : ""
                }>Terkonfirmasi</option>
              </select>
            </div>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="text-center error">Gagal memuat transaksi.</p>`;
  }
}

// ======================
// UPDATE STATUS
// ======================
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
      throw new Error(err.message || "Gagal update status");
    }

    loadPayments();
    Swal.fire({
      icon: "success",
      title: "Berhasil",
      timer: 1200,
      showConfirmButton: false,
    });
  } catch (err) {
    Swal.fire("Error", err.message, "error");
    loadPayments();
  }
};

// ======================
// MODAL DETAIL
// ======================
window.openPaymentDetail = async (paymentId) => {
  const token = getAuthToken();
  if (!token) return;

  try {
    const res = await fetch(
      `https://orange-press-be.vercel.app/api/admin/payment/${paymentId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!res.ok) throw new Error("Gagal memuat detail");

    const p = (await res.json()).data;
    const pkg = getPackage(p.packageId);

    document.getElementById("paymentDetailAuthor").textContent =
      p.userId?.fullname || "-";
    document.getElementById("paymentDetailPackage").textContent = pkg.title;
    document.getElementById("paymentDetailAmount").textContent = formatRupiah(
      pkg.price,
    );
    document.getElementById("paymentDetailDate").textContent = formatDate(
      p.createdAt,
    );
    document.getElementById("paymentDetailBank").textContent =
      p.bankName || "-";

    renderProofInModal(p.paymentProofUrl);
    document.getElementById("paymentDetailModal").classList.add("show");
  } catch (err) {
    Swal.fire("Error", err.message, "error");
  }
};

// ======================
// PROOF IN MODAL
// ======================
function renderProofInModal(url) {
  const img = document.getElementById("paymentDetailImg");
  const parent = img.parentElement;

  const oldPdf = document.getElementById("paymentDetailPdfObject");
  if (oldPdf) oldPdf.remove();

  if (!url) {
    img.src = "";
    return;
  }

  const ext = url.split(".").pop().toLowerCase();

  if (["jpg", "jpeg", "png", "webp"].includes(ext)) {
    img.style.display = "block";
    img.src = url;
  } else if (ext === "pdf") {
    img.style.display = "none";
    const obj = document.createElement("object");
    obj.id = "paymentDetailPdfObject";
    obj.type = "application/pdf";
    obj.data = url;
    obj.style.width = "100%";
    obj.style.height = "300px";
    parent.appendChild(obj);
  }
}

// ======================
// INIT
// ======================
window.closePaymentDetail = () => {
  document.getElementById("paymentDetailModal").classList.remove("show");
};

document.addEventListener("DOMContentLoaded", async () => {
  const closeBtn = document.getElementById("closePaymentDetailBtn");
  if (closeBtn) {
    closeBtn.addEventListener("click", closePaymentDetail);
  }

  await loadPackages();
  loadPayments();
});
