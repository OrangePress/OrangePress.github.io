// ==============
// UTILS
// ==============
function getAuthToken() {
  return localStorage.getItem("token");
}

// ==============
// DYNAMIC AUTHOR INPUT
// ==============
const addAuthorBtn = document.getElementById("addAuthor");
const authorContainer = document.getElementById("authorContainer");

if (addAuthorBtn && authorContainer) {
  addAuthorBtn.addEventListener("click", () => {
    const newEntry = document.createElement("div");
    newEntry.className = "author-entry";
    newEntry.innerHTML = `
      <select name="author_role[]" required>
        <option value="Penulis">Penulis</option>
        <option value="Komikus">Komikus</option>
        <option value="Penerjemah">Penerjemah</option>
        <option value="Ilustrator">Ilustrator</option>
        <option value="Editor">Editor</option>
        <option value="Muraja’ah">Muraja’ah</option>
        <option value="Reviewer">Reviewer</option>
        <option value="Fotografer">Fotografer</option>
      </select>
      <input type="text" name="author_name[]" placeholder="Nama" required />
      <button type="button" class="btn-remove-author">✕</button>
    `;
    authorContainer.appendChild(newEntry);

    // Tambahkan event listener untuk tombol hapus
    const removeBtn = newEntry.querySelector(".btn-remove-author");
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        if (authorContainer.children.length > 1) {
          newEntry.remove();
        } else {
          Swal.fire("Minimal satu penulis diperlukan.");
        }
      });
    }
  });

  // Hapus penulis (untuk entry pertama jika ada tombol)
  authorContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-remove-author")) {
      const entry = e.target.closest(".author-entry");
      if (authorContainer.children.length > 1) {
        entry.remove();
      } else {
        Swal.fire("Minimal satu penulis diperlukan.");
      }
    }
  });
}

// ==============
// FILE PREVIEW TEXT
// ==============
const fileInputs = [
  { id: "turnitinFile", textId: "turnitinFileText" },
  { id: "naskahFile", textId: "naskahFileText" },
  { id: "attachmentFile", textId: "attachmentFileText" },
  { id: "coverDepanFile", textId: "coverDepanFileText" },
  { id: "coverBelakangFile", textId: "coverBelakangFileText" },
];

fileInputs.forEach(({ id, textId }) => {
  const input = document.getElementById(id);
  const textEl = document.getElementById(textId);
  if (input && textEl) {
    input.addEventListener("change", () => {
      const files = Array.from(input.files);
      if (files.length === 0) {
        textEl.textContent = "📁 Pilih File";
      } else if (files.length === 1) {
        textEl.textContent = `📁 ${files[0].name}`;
      } else {
        textEl.textContent = `📁 ${files.length} file dipilih`;
      }
    });
  }
});

// ==============
// SUBMIT FORM
// ==============
const formNaskah = document.getElementById("formNaskah");

if (formNaskah) {
  formNaskah.addEventListener("submit", async (e) => {
    e.preventDefault();

    const token = getAuthToken();
    if (!token) {
      Swal.fire("Error", "Anda belum login. Silakan login ulang.", "error");
      return;
    }

    const formData = new FormData(formNaskah);

    async function fetchUser() {
      const res = await fetch("https://orange-press-be.vercel.app/api/author/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(res);

      if (!res.ok) throw new Error("Gagal memuat data user");
      return await res.json();
    }

    // 🟢 Ambil paymentId & packageId dari API user, bukan localStorage
    let userIdData;
    try {
      userIdData = await fetchUser();
    } catch (err) {
      return Swal.fire({
        customClass: { container: "my-swal-highest" },
        icon: "error",
        title: "Gagal",
        text: "Tidak dapat memuat data akun. Silakan login ulang.",
      });
    }

    const paymentId = userIdData.paymentId || userIdData.data?.paymentId;

    formData.append("paymentId", paymentId);

    // Konversi author inputs ke format contributors
    const authorRoles = formData.getAll("author_role[]");
    const authorNames = formData.getAll("author_name[]");
    const contributors = [];
    for (let i = 0; i < authorRoles.length; i++) {
      if (authorRoles[i] && authorNames[i]) {
        contributors.push({ name: authorNames[i], role: authorRoles[i] });
      }
    }
    if (contributors.length === 0) {
      Swal.fire("Error", "Minimal satu penulis harus diisi.", "error");
      return;
    }
    formData.set("contributors", JSON.stringify(contributors));

    // Hapus field array lama agar tidak duplikat
    formData.delete("author_role[]");
    formData.delete("author_name[]");

    // Tambahkan field boolean
    const ilustrasiValue = formData.get("ilustrasi");
    formData.set(
      "hasIllustration",
      ilustrasiValue === "Ya, ada ilustrasi" ? "true" : "false"
    );

    const kdtValue = formData.get("kdt");
    formData.set("needKdt", kdtValue.includes("Ya") ? "true" : "false");

    // Ganti nama field sesuai API
    // Mapping dari form name → API field
    const fieldMap = {
      judul_buku: "title",
      deskripsi: "synopsis",
      media_terbitan_isbn: "isbnType",
      kelompok_pembaca: "readerGroup",
      jenis_pustaka: "libraryType",
      kategori_jenis_pustaka: "categoryType",
      jumlah_halaman: "pageCount",
      tinggi_buku_cm: "bookHeightCm",
      seri_buku: "seriesName",
      turnitin_file: "plagiarism",
      naskah_file: "manuscripts",
      attachment_files: "attachments",
      cover_depan: "coverFront",
      cover_belakang: "coverBack",
    };

    // Rename keys sesuai API
    for (const [oldKey, newKey] of Object.entries(fieldMap)) {
      if (formData.has(oldKey)) {
        const value = formData.get(oldKey);
        formData.delete(oldKey);
        formData.append(newKey, value);
      }
    }

    // Validasi file
    const requiredFiles = [
      "plagiarism",
      "manuscripts",
      "coverFront",
      "coverBack",
    //   "attachments",
    ];
    for (const fileField of requiredFiles) {
      if (!formData.has(fileField) || !formData.get(fileField).name) {
        Swal.fire("Error", `File ${fileField} wajib diunggah.`, "error");
        return;
      }
    }

    try {
      const response = await fetch(
        "https://orange-press-be.vercel.app/api/author/manuscript",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      console.log(formData.get);
      

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal mengunggah naskah.");
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Naskah Anda telah berhasil diunggah.",
        confirmButtonText: "OK",
      }).then(() => {
        // Reset form atau redirect
        formNaskah.reset();
        // Opsional: redirect ke halaman status
        // window.location.href = "/dashboard/penulis/status_naskah.html";
      });
    } catch (err) {
      console.error("Upload error:", err);
      Swal.fire(
        "Error",
        err.message || "Terjadi kesalahan saat mengunggah.",
        "error"
      );
    }
  });
}
