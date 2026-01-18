// Konfigurasi API
const API_URL_PACKAGES = "https://orange-press-be.vercel.app/api/packages";
const API_URL_PAYMENT = "https://orange-press-be.vercel.app/api/author/payment";

// Inisialisasi Modal
const paymentModal = new bootstrap.Modal(
  document.getElementById("paymentModal")
);

// Helper Escape HTML
const escapeHtml = (text) => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

// 1. Ambil Data Paket dari API
async function fetchPackages() {
  const container = document.getElementById("packages-container");
  const loading = document.getElementById("packages-loading");
  const errorDiv = document.getElementById("packages-error");

  try {
    const response = await fetch(API_URL_PACKAGES);
    if (!response.ok) throw new Error("Gagal mengambil data paket");

    const packages = await response.json();

    loading.style.display = "none";
    container.style.display = "flex"; // atau 'grid' sesuai CSS Anda
    container.innerHTML = "";

    packages.forEach((pkg) => {
      const card = document.createElement("div");
      card.className = "card-lg";
      card.innerHTML = `
                <h3>${escapeHtml(pkg.title)}</h3>
                <p class="price">Rp ${pkg.price.toLocaleString("id-ID")}</p>
                <ul class="paket-list">
                    ${pkg.benefits
                      .map((benefit) => `<li>${escapeHtml(benefit)}</li>`)
                      .join("")}
                </ul>
                <div class="card-actions">
                    <button class="btn btn-primary" onclick="pilihPaket('${
                      pkg._id
                    }', '${pkg.title}')">
                        Pilih Paket →
                    </button>
                </div>
            `;
      container.appendChild(card);
    });
  } catch (err) {
    loading.style.display = "none";
    errorDiv.style.display = "block";
    errorDiv.textContent = err.message;
  }
}

// 2. Fungsi saat tombol Pilih Paket diklik
window.pilihPaket = (id, title) => {
  document.getElementById("packageId").value = id;
  document.getElementById("displayPackageTitle").innerText = title;
  paymentModal.show();
};

// 3. Handle Submit Form (Mengirim data sesuai format CURL Anda)
document.getElementById("paymentForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const btnSubmit = document.getElementById("btnSubmitPayment");
  const formData = new FormData(e.target);
  const token = localStorage.getItem("token");
  

  btnSubmit.disabled = true;
  btnSubmit.innerText = "Mengirim...";

  try {
    const response = await fetch(API_URL_PAYMENT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`, // Sesuaikan format header auth Anda
      },
      body: formData, // Menggunakan FormData karena ada upload file
    });

    const result = await response.json();
    console.log(result);
    
    localStorage.setItem("paymentId", result.payment._id);

    

    if (response.ok) {
      alert(result.message || "Pembayaran berhasil dikirim!");
      paymentModal.hide();
      e.target.reset();
    } else {
      throw new Error(
        result.message || "Terjadi kesalahan saat mengirim pembayaran"
      );
    }
  } catch (err) {
    alert(err.message);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerText = "Kirim Pembayaran";
  }
});

// Jalankan fungsi saat halaman dimuat
document.addEventListener("DOMContentLoaded", fetchPackages);
