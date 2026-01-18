const API_BASE = "https://orange-press-be.vercel.app/api/author/agreement";
const buktiFileName = document.getElementById("buktiFileName");
const token = localStorage.getItem("token");

/* ===========================
      LABEL FILE DISPLAY HANDLER
  ============================ */
function attachFileDisplay(input, label, withDefaultText) {
  if (!input || !label) return;

  input.addEventListener("change", () => {
    if (input.files.length > 0) {
      const name =
        input.files.length === 1
          ? input.files[0].name
          : `${input.files.length} file dipilih`;
      label.textContent = `${name} — Berhasil dipilih`;
    } else {
      label.textContent = withDefaultText || "Tidak ada file yang dipilih";
    }
  });
}

attachFileDisplay(buktiFileName);

// Pastikan elemen ada sebelum menambahkan listener
document.addEventListener("DOMContentLoaded", () => {
  const agreementForm = document.getElementById("agreementForm");
  const fileInput = document.getElementById("pksFile");
  const fileNameDisplay = document.getElementById("pksFileName");

  // Update tampilan nama file saat dipilih
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
      fileNameDisplay.textContent = fileInput.files[0].name;
      fileNameDisplay.style.color = "#2ecc71"; // Beri warna hijau jika ada file
    } else {
      fileNameDisplay.textContent = "Tidak ada file yang dipilih";
      fileNameDisplay.style.color = "#666";
    }
  });

  // 🟢 Ambil paymentId & packageId dari API user, bukan localStorage

  agreementForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    async function fetchUser() {
      const res = await fetch("https://orange-press-be.vercel.app/api/author/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(res);

      if (!res.ok) throw new Error("Gagal memuat data user");
      return await res.json();
    }
    let userIdData;
    try {
      userIdData = await fetchUser();
      console.log(userIdData);
    } catch (err) {
      return Swal.fire({
        customClass: { container: "my-swal-highest" },
        icon: "error",
        title: "Gagal",
        text: "Tidak dapat memuat data akun. Silakan login ulang.",
      });
    }

    const paymentId = userIdData.paymentId || userIdData.data?.paymentId;

    // Validasi data penting
    if (!paymentId) {
      Swal.fire(
        "Gagal",
        "Belum Memilih Paket. Silakan pilih paket kembali.",
        "error",
      );
      return;
    }

    if (!fileInput.files.length) {
      Swal.fire(
        "Peringatan",
        "Silakan pilih file PDF terlebih dahulu",
        "warning",
      );
      return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    // Tampilkan Loading
    Swal.fire({
      title: "Mengunggah PKS...",
      text: "Mohon tunggu sebentar",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const res = await fetch(`${API_BASE}/${paymentId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Upload gagal");
      }

      Swal.fire({
        title: "Berhasil!",
        text: result.message || "PKS berhasil diupload",
        icon: "success",
        confirmButtonColor: "#3085d6",
      });

      // Reset Form
      agreementForm.reset();
      fileNameDisplay.textContent = "Tidak ada file yang dipilih";
    } catch (err) {
      console.error("Upload Error:", err);
      Swal.fire("Gagal", err.message, "error");
    }
  });
});
