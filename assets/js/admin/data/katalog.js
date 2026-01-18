const token = localStorage.getItem("token");

let manuscripts = [];

// === FETCH DAFTAR NASKAH ===
async function loadManuscripts() {
  try {
    const res = await fetch("https://orange-press-be.vercel.app/api/admin/manuscripts", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Gagal memuat daftar naskah");

    manuscripts = await res.json();
    populateBookDropdown();
  } catch (err) {
    console.error("Error loading manuscripts:", err);
    Swal.fire({
      icon: "error",
      title: "Gagal",
      text: "Tidak dapat memuat daftar naskah.",
      confirmButtonColor: "#ff6b00",
    });
  }
}

// === ISI DROPDOWN BUKU ===
function populateBookDropdown() {
  const select = document.getElementById("book");
  select.innerHTML = '<option value="">-- Pilih Naskah --</option>';

  manuscripts.forEach((m) => {
    const author =
      m.contributors
        ?.filter((c) => c.role === "Penulis")
        .map((c) => c.name)
        .join(", ") || "-";

    const option = document.createElement("option");
    option.value = m._id;
    option.textContent = `${m.title} - ${author}`;
    select.appendChild(option);
  });
}

// === ISI FORM SAAT BUKU DIPILIH ===
function fillFormByManuscriptId(id) {
  const manuscript = manuscripts.find((m) => m._id === id);
  if (!manuscript) return;

  // Isi dan nonaktifkan field
  document.getElementById("catTitle").value = manuscript.title || "";
  document.getElementById("catTitle").disabled = true;

  const author =
    manuscript.contributors
      ?.filter((c) => c.role === "Penulis")
      .map((c) => c.name)
      .join(", ") || "-";
  document.getElementById("catAuthor").value = author;
  document.getElementById("catAuthor").disabled = true;

  document.getElementById("catDesc").value =
    manuscript.synopsis || manuscript.description || "";
  document.getElementById("catDesc").disabled = true;

  // ISBN: kosongkan & aktifkan
  document.getElementById("catISBN").value = "";
  document.getElementById("catISBN").disabled = false;
}

// === KIRIM PUBLISH ===
async function publishManuscript(manuscriptId, isbn) {
  try {
    const res = await fetch(
      `https://orange-press-be.vercel.app/api/admin/manuscripts/${manuscriptId}/publish`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isbn }),
      }
    );

    if (res.ok) {
      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Naskah berhasil dipublikasikan ke katalog.",
        confirmButtonColor: "#ff6b00",
        timer: 2000,
        showConfirmButton: false,
      }).then(() => {
        // Reset form
        document.getElementById("catalogForm").reset();
        document
          .querySelectorAll("#catalogForm input, #catalogForm textarea")
          .forEach((el) => (el.disabled = false));
      });
    } else {
      const err = await res.json();
      throw new Error(err.message || "Gagal mempublikasikan");
    }
  } catch (err) {
    console.error("Error publishing:", err);
    Swal.fire({
      icon: "error",
      title: "Gagal",
      text: err.message || "Terjadi kesalahan saat mempublikasikan.",
      confirmButtonColor: "#ff6b00",
    });
  }
}

// === EVENT LISTENERS ===
document.getElementById("book")?.addEventListener("change", (e) => {
  const id = e.target.value;
  if (id) {
    fillFormByManuscriptId(id);
  } else {
    // Reset form jika tidak ada pilihan
    document.getElementById("catalogForm").reset();
    document
      .querySelectorAll("#catalogForm input, #catalogForm textarea")
      .forEach((el) => (el.disabled = false));
  }
});

document.getElementById("catalogForm")?.addEventListener("submit", (e) => {
  e.preventDefault();

  const manuscriptId = document.getElementById("book").value;
  const isbn = document.getElementById("catISBN").value.trim();

  if (!manuscriptId) {
    Swal.fire({
      icon: "warning",
      title: "Pilih Naskah",
      text: "Silakan pilih naskah terlebih dahulu.",
      confirmButtonColor: "#ff6b00",
    });
    return;
  }

  if (!isbn) {
    Swal.fire({
      icon: "warning",
      title: "Isi ISBN",
      text: "Nomor ISBN wajib diisi.",
      confirmButtonColor: "#ff6b00",
    });
    return;
  }

  publishManuscript(manuscriptId, isbn);
});

document.getElementById("catalogResetBtn")?.addEventListener("click", () => {
  document.getElementById("catalogForm").reset();
  document
    .querySelectorAll("#catalogForm input, #catalogForm textarea")
    .forEach((el) => (el.disabled = false));
});

// === JALANKAN SAAT HALAMAN SIAP ===
document.addEventListener("DOMContentLoaded", () => {
  loadManuscripts();
});
