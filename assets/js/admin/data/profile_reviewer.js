const token = localStorage.getItem("token");

// Muat daftar reviewer ke dropdown
async function loadReviewersToDropdown() {
  try {
    const res = await fetch("https://orange-press-be.vercel.app/api/admin/reviewer", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();

    if (!result.success) throw new Error("Gagal memuat daftar reviewer");

    const select = document.getElementById("profileReviewerSelect");
    select.innerHTML = '<option value="">-- Pilih Reviewer --</option>';

    result.data.forEach((profile) => {
      const user = profile.userId;
      const option = document.createElement("option");
      option.value = profile._id; // ID profil reviewer (bukan userId)
      option.textContent = user?.fullname || "Tanpa Nama";
      select.appendChild(option);
    });

    // Jika ada reviewer, pilih yang pertama secara otomatis
    if (result.data.length > 0) {
      select.value = result.data[0]._id;
      loadReviewerDetail(result.data[0]._id);
    }
  } catch (err) {
    console.error("Error loading reviewers:", err);
    document.getElementById("reviewerProfileContent").innerHTML =
      '<p class="muted" style="color:red;">Gagal memuat daftar reviewer.</p>';
  }
}

// Muat detail reviewer berdasarkan ID profil
async function loadReviewerDetail(profileId) {
  if (!profileId) {
    document.getElementById("reviewerProfileContent").innerHTML =
      '<p class="muted">Pilih reviewer untuk melihat profil.</p>';
    return;
  }

  try {
    const res = await fetch(
      `https://orange-press-be.vercel.app/api/admin/reviewer/${profileId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const result = await res.json();

    if (!result.success) throw new Error("Gagal memuat detail reviewer");

    const data = result.data;
    const user = data.userId || {};

    // Siapkan chip untuk topicInterests (jika berupa string, tampilkan apa adanya)
    // Jika nanti jadi array, ganti logika ini
    const topicDisplay = data.topicInterests
      ? `<span class="reviewer-chip">${data.topicInterests}</span>`
      : '<span class="muted">Belum diisi</span>';

    document.getElementById("reviewerProfileContent").innerHTML = `
        <div>
          <div class="reviewer-field-label">Nama Lengkap</div>
          <div class="reviewer-field-value">${user.fullname || "-"}</div>
        </div>
        <div>
          <div class="reviewer-field-label">Email</div>
          <div class="reviewer-field-value">${user.email || "-"}</div>
        </div>
        <div>
          <div class="reviewer-field-label">Institusi</div>
          <div class="reviewer-field-value">${data.institution || "-"}</div>
        </div>
        <div>
          <div class="reviewer-field-label">Bidang Kajian Utama</div>
          <div class="reviewer-field-value">${data.specialization || "-"}</div>
        </div>
        <div>
          <div class="reviewer-field-label">Nomor Telepon</div>
          <div class="reviewer-field-value">${user.phone || "-"}</div>
        </div>
        <div>
          <div class="reviewer-field-label">Nama Bank</div>
          <div class="reviewer-field-value">${data.bankName || "-"}</div>
        </div>
        <div>
          <div class="reviewer-field-label">Nomor Rekening</div>
          <div class="reviewer-field-value">${data.accountNumber || "-"}</div>
        </div>
        <div>
          <div class="reviewer-field-label">Atas Nama Rekening</div>
          <div class="reviewer-field-value">${data.accountHolder || "-"}</div>
        </div>
        <div>
          <div class="reviewer-field-label">Minat Topik Review</div>
          <div class="reviewer-chip-group">
            ${topicDisplay}
          </div>
        </div>
        <div class="reviewer-bio">
          <div class="reviewer-field-label">Bio Singkat</div>
          <p>${data.biografi || "-"}</p>
        </div>
      `;
  } catch (err) {
    console.error("Error loading reviewer detail:", err);
    document.getElementById("reviewerProfileContent").innerHTML =
      '<p class="muted" style="color:red;">Gagal memuat detail reviewer.</p>';
  }
}

// Event saat dropdown berubah
document
  .getElementById("profileReviewerSelect")
  .addEventListener("change", (e) => {
    loadReviewerDetail(e.target.value);
  });

// Jalankan saat halaman siap
document.addEventListener("DOMContentLoaded", () => {
  loadReviewersToDropdown();
});

// Buka modal tambah reviewer
document.querySelector(".btn-reviewer").addEventListener("click", () => {
  document.getElementById("addReviewerModal").style.display = "flex";
  console.log("modal dibuka");
  
  document.getElementById("addReviewerForm").reset();
});

// Tutup modal
document.getElementById("closeAddReviewerModal").onclick = () => {
  document.getElementById("addReviewerModal").style.display = "none";
};
document.getElementById("cancelAddReviewer").onclick = () => {
  document.getElementById("addReviewerModal").style.display = "none";
};

// Kirim form tambah reviewer
document
  .getElementById("addReviewerForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullname = document.getElementById("fullname").value.trim();
    const username = document.getElementById("username").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!fullname || !username || !phone || !email || !password) {
      Swal.fire({
        icon: "warning",
        title: "Lengkapi Semua Field",
        text: "Semua field bertanda * wajib diisi.",
        confirmButtonColor: "#ff6b00",
      });
      return;
    }

    if (password.length < 6) {
      Swal.fire({
        icon: "warning",
        title: "Password Terlalu Pendek",
        text: "Password minimal 6 karakter.",
        confirmButtonColor: "#ff6b00",
      });
      return;
    }

    try {
      const res = await fetch("https://orange-press-be.vercel.app/api/admin/reviewer", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullname,
          username,
          phone,
          email,
          password,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: result.message || "Reviewer berhasil ditambahkan.",
          confirmButtonColor: "#ff6b00",
          timer: 2000,
          showConfirmButton: false,
        }).then(() => {
          document.getElementById("addReviewerModal").style.display = "none";
          // Refresh daftar reviewer di dropdown
          loadReviewersToDropdown();
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Gagal Menambahkan",
          text: result.message || "Terjadi kesalahan. Coba lagi.",
          confirmButtonColor: "#ff6b00",
        });
      }
    } catch (err) {
      console.error("Error:", err);
      Swal.fire({
        icon: "error",
        title: "Kesalahan Jaringan",
        text: "Tidak dapat terhubung ke server.",
        confirmButtonColor: "#ff6b00",
      });
    }
  });
