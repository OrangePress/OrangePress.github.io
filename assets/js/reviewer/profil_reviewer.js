const token = localStorage.getItem("token");

// Daftar opsi minat topik
const INTEREST_OPTIONS = [
  "Artikel ilmiah",
  "Buku ajar",
  "Monograf",
  "Prosiding",
];

let profileData = null;

// === FETCH PROFIL ===
async function loadProfile() {
  try {
    const res = await fetch("https://orange-press-be.vercel.app/api/reviewer/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      profileData = await res.json();
      fillProfileSummary(profileData); // Hanya isi ringkasan
      disableForm(); // Nonaktifkan form karena profil sudah ada
    } else if (res.status === 404) {
      // Profil belum dibuat → tampilkan nama/email dari user, aktifkan form
      const userRes = await fetch("https://orange-press-be.vercel.app/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (userRes.ok) {
        const user = await userRes.json();
        document.getElementById("psName").textContent = user.fullname || "-";
        document.getElementById("psEmail").textContent = user.email || "-";
        document.getElementById("psPhone").textContent = user.phone || "-";
      }
      enableForm();
    } else {
      throw new Error("Gagal memuat profil");
    }
  } catch (err) {
    console.error("Error loading profile:", err);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Gagal memuat data profil.",
      confirmButtonColor: "#ff6b00",
    });
  }
}

// === ISI RINGKASAN PROFIL (termasuk nama & email dari userId) ===
function fillProfileSummary(data) {
  const user = data.userId || {};
  document.getElementById("psName").textContent = user.fullname || "-";
  document.getElementById("psEmail").textContent = user.email || "-";
  document.getElementById("psPhone").textContent = user.phone || "-";

  document.getElementById("psInstitution").textContent =
    data.institution || "-";
  document.getElementById("psField").textContent = data.specialization || "-";
  document.getElementById("psBankName").textContent = data.bankName || "-";
  document.getElementById("psBankAccount").textContent =
    data.accountNumber || "-";
  document.getElementById("psBankAccountName").textContent =
    data.accountHolder || "-";

  const interests = Array.isArray(data.topicInterests)
    ? data.topicInterests
    : [];
  document.getElementById("psInterests").textContent =
    interests.length > 0 ? interests.join(", ") : "-";
}

// === NONAKTIFKAN FORM ===
function disableForm() {
  const inputs = document.querySelectorAll(
    "#profileForm input, #profileForm select, #profileForm textarea"
  );
  inputs.forEach((input) => (input.disabled = true));

  const submitBtn = document.querySelector(
    "#profileForm button[type='submit']"
  );
  const resetBtn = document.getElementById("profileResetBtn");

  if (submitBtn) submitBtn.disabled = true;
  if (resetBtn) resetBtn.disabled = true;

  const actions = document.querySelector(".profile-actions");
  if (actions) {
    actions.innerHTML = `<p class="muted" style="color:green;">✅ Profil telah disimpan. Edit profil belum tersedia.</p>`;
  }
}

// === AKTIFKAN FORM ===
function enableForm() {
  const inputs = document.querySelectorAll(
    "#profileForm input, #profileForm select, #profileForm textarea"
  );
  inputs.forEach((input) => (input.disabled = false));

  const submitBtn = document.querySelector(
    "#profileForm button[type='submit']"
  );
  const resetBtn = document.getElementById("profileResetBtn");

  if (submitBtn) submitBtn.disabled = false;
  if (resetBtn) resetBtn.disabled = false;
}

// === AMBIL NILAI CHECKBOX YANG DIPILIH ===
function getSelectedInterests() {
  const checked = document.querySelectorAll(
    'input[name="pfInterests"]:checked'
  );
  return Array.from(checked).map((cb) => cb.value);
}

// === KIRIM PROFIL BARU ===
async function createProfile(formData) {
  try {
    const res = await fetch(
      "https://orange-press-be.vercel.app/api/reviewer/create/profile",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      }
    );

    if (res.ok) {
      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Profil reviewer berhasil disimpan.",
        confirmButtonColor: "#ff6b00",
        timer: 2000,
        showConfirmButton: false,
      }).then(() => {
        loadProfile(); // Reload untuk tampilkan data lengkap
      });
    } else {
      const err = await res.json();
      throw new Error(err.message || "Gagal menyimpan profil");
    }
  } catch (err) {
    console.error("Error creating profile:", err);
    Swal.fire({
      icon: "error",
      title: "Gagal",
      text: err.message || "Terjadi kesalahan saat menyimpan profil.",
      confirmButtonColor: "#ff6b00",
    });
  }
}

// === EVENT: SIMPAN PROFIL ===
document
  .getElementById("profileForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = {
      institution: document.getElementById("pfInstitution").value.trim(),
      specialization: document.getElementById("pfField").value.trim(),
      bankName: document.getElementById("pfBankName").value.trim(),
      accountNumber: document.getElementById("pfBankAccount").value.trim(),
      accountHolder: document.getElementById("pfBankAccountName").value.trim(),
      biografi: document.getElementById("pfBio").value.trim(),
      topicInterests: getSelectedInterests(),
    };

    if (!formData.institution || !formData.specialization) {
      Swal.fire({
        icon: "warning",
        title: "Lengkapi Data",
        text: "Institusi dan Bidang Kajian Utama wajib diisi.",
        confirmButtonColor: "#ff6b00",
      });
      return;
    }

    if (formData.topicInterests.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Pilih Minat Topik",
        text: "Pilih minimal satu minat topik review.",
        confirmButtonColor: "#ff6b00",
      });
      return;
    }

    await createProfile(formData);
  });

// === EVENT: RESET FORM ===
document.getElementById("profileResetBtn")?.addEventListener("click", () => {
  document.getElementById("profileForm").reset();
  document
    .querySelectorAll('input[name="pfInterests"]')
    .forEach((cb) => (cb.checked = false));
});

// === JALANKAN SAAT HALAMAN SIAP ===
document.addEventListener("DOMContentLoaded", () => {
  loadProfile();
});
