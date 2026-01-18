const token = localStorage.getItem("token");

// === Fungsi Utama ===
async function loadReviewAssignments() {
  try {
    const res = await fetch(
      "https://orange-press-be.vercel.app/api/admin/manuscripts/review",
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const result = await res.json();
    if (!result.success) throw new Error("Gagal memuat data");
    renderTable(result.data);
  } catch (err) {
    console.error(err);
    document.querySelector("#reviewerTable tbody").innerHTML = `
        <tr><td colspan="10" style="text-align:center;color:#e74c3c;">Gagal memuat data.</td></tr>
      `;
    Swal.fire({
      icon: "error",
      title: "Oops...",
      text: "Gagal memuat daftar naskah.",
      confirmButtonColor: "#ff6b00",
    });
  }
}

function renderTable(assignments) {
  const tbody = document.querySelector("#reviewerTable tbody");
  tbody.innerHTML = "";

  if (!assignments?.length) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;">Tidak ada data.</td></tr>`;
    return;
  }

  assignments.forEach((item) => {
    const m = item.manuscriptId;
    const author = m.userId || {};
    const payment = author.paymentId || {};

    const penulis =
      (m.contributors || [])
        .filter((c) => c.role === "Penulis")
        .map((c) => c.name)
        .join(", ") || "-";

    const reviewerName = item.reviewerId?.fullname || "-";
    const deadline = item.deadlineReview
      ? new Date(item.deadlineReview).toLocaleDateString("id-ID")
      : "-";
    const status = m.status || "-";

    const row = document.createElement("tr");
    row.innerHTML = `
        <td>${m.title || "-"}</td>
        <td>${penulis}</td>
        <td>${reviewerName}</td>
        <td>${author.phone}</td>
        <td>${payment.bankName || "-"}</td>
        <td>${payment.accountNumber || "-"}</td>
        <td>${payment.accountHolder || "-"}</td>
        <td>${deadline}</td>
        <td>${status}</td>
      `;
    tbody.appendChild(row);
  });

  // document.querySelectorAll(".btn-assign").forEach((btn) => {
  //   btn.addEventListener("click", (e) => {
  //     const manuscriptId = e.currentTarget.dataset.id;
  //     openAssignModal(manuscriptId);
  //   });
  // });
}

async function loadManuscriptsIntoBookSelect() {
  const selectReviewer = document.getElementById("book");
  const selectAuthor = document.getElementById("bookAuthor");

  if (selectReviewer)
    selectReviewer.innerHTML = '<option value="">-- Pilih Naskah --</option>';
  if (selectAuthor)
    selectAuthor.innerHTML =
      '<option value="">-- Pilih Naskah (Status Revisi) --</option>';

  try {
    const res = await fetch("https://orange-press-be.vercel.app/api/admin/manuscripts", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const manuscripts = await res.json();

    manuscripts.forEach((ms) => {
      const option = document.createElement("option");
      option.value = ms._id;
      option.textContent = `[${ms.status}] ${ms.title}`;
      option.dataset.description = ms.description || ms.synopsis || "";

      // PERUBAHAN DI SINI:
      // 1. Logika untuk Dropdown Reviewer: HANYA jika status adalah "Draft"
      if (ms.status === "Draft") {
        selectReviewer.appendChild(option.cloneNode(true));
      }

      // 2. Logika untuk Dropdown Penulis: HANYA jika status adalah "Revision"
      if (ms.status === "Revision") {
        if (selectAuthor) selectAuthor.appendChild(option.cloneNode(true));
      }
    });

    // Event listener untuk sinkronisasi deskripsi (Form Reviewer)
    selectReviewer?.addEventListener("change", () => {
      const selectedOption =
        selectReviewer.options[selectReviewer.selectedIndex];
      const desc = selectedOption.dataset.description || "";
      document.getElementById("catDesc").value = desc;
    });

    // ... (rest of the code)
  } catch (err) {
    console.error("Gagal memuat daftar naskah:", err);
  }
}

// === Fungsi Kirim ke Penulis (Send Revision) ===
async function sendToAuthor(manuscriptId) {
  Swal.fire({
    title: "Kirim ke Penulis?",
    text: "Naskah akan dikirim kembali ke penulis untuk direvisi.",
    icon: "info",
    showCancelButton: true,
    confirmButtonColor: "#ff6b00",
    cancelButtonColor: "#d33",
    confirmButtonText: "Ya, Kirim!",
    showLoaderOnConfirm: true,
    preConfirm: async () => {
      try {
        const res = await fetch(
          `https://orange-press-be.vercel.app/api/admin/manuscripts/${manuscriptId}/send-revision`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || "Gagal mengirim revisi");
        return result;
      } catch (error) {
        Swal.showValidationMessage(`Request failed: ${error}`);
      }
    },
    allowOutsideClick: () => !Swal.isLoading(),
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire("Berhasil!", "Naskah telah diteruskan ke penulis.", "success");
      loadReviewAssignments();
      loadManuscriptsIntoBookSelect(); // Refresh list
    }
  });
}

// Event Listener untuk Submit Form Penulis
document.getElementById("author-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const manuscriptId = document.getElementById("bookAuthor").value;

  if (!manuscriptId) {
    Swal.fire(
      "Pilih Naskah",
      "Silakan pilih naskah berstatus revisi.",
      "warning",
    );
    return;
  }

  sendToAuthor(manuscriptId);
});

// === Modal & Form ===
async function loadReviewersIntoDropdown() {
  const select = document.getElementById("reviewerSelect");
  select.innerHTML = '<option value="">-- Pilih Reviewer --</option>';

  try {
    const res = await fetch("https://orange-press-be.vercel.app/api/admin/reviewer", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await res.json();
    console.log(result.data);

    if (result.success && Array.isArray(result.data)) {
      result.data.forEach((reviewer) => {
        const option = document.createElement("option");
        option.value = reviewer.userId._id;
        option.textContent = `${reviewer.userId.fullname} (${reviewer.userId.email})`;
        select.appendChild(option);
      });
    }
  } catch (err) {
    console.error("Gagal memuat daftar reviewer:", err);
    Swal.fire({
      icon: "error",
      title: "Gagal Memuat Reviewer",
      text: "Tidak dapat memuat daftar reviewer. Coba lagi nanti.",
      confirmButtonColor: "#ff6b00",
    });
  }
}

function openAssignModal(manuscriptId) {
  document.getElementById("manuscriptIdInput").value = manuscriptId;
  document.getElementById("assignForm").reset();

  // Muat reviewer setiap kali modal dibuka (agar selalu update)
  loadReviewersIntoDropdown();

  document.getElementById("assignModal").style.display = "flex";
}

document.getElementById("closeAssignModal").onclick = () => {
  document.getElementById("assignModal").style.display = "none";
};
document.getElementById("cancelAssign").onclick = () => {
  document.getElementById("assignModal").style.display = "none";
};

document.getElementById("assignForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const manuscriptId = document.getElementById("manuscriptIdInput").value;
  const reviewerId = document.getElementById("reviewerSelect").value;
  const deadline = document.getElementById("deadlineReview").value;
  const note = document.getElementById("noteForReviewer").value.trim();

  if (!reviewerId) {
    Swal.fire({
      icon: "warning",
      title: "Pilih Reviewer",
      text: "Silakan pilih reviewer dari daftar.",
      confirmButtonColor: "#ff6b00",
    });
    return;
  }
  if (!deadline) {
    Swal.fire({
      icon: "warning",
      title: "Deadline Wajib Diisi",
      text: "Silakan pilih tanggal deadline review.",
      confirmButtonColor: "#ff6b00",
    });
    return;
  }

  try {
    const res = await fetch(
      `https://orange-press-be.vercel.app/api/admin/manuscripts/${manuscriptId}/assign-reviewer`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviewerId,
          deadlineReview: deadline,
          noteForReviewer: note,
        }),
      },
    );

    if (res.ok) {
      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Naskah berhasil di-assign ke reviewer.",
        confirmButtonColor: "#ff6b00",
        timer: 2000,
        showConfirmButton: false,
      }).then(() => {
        document.getElementById("assignModal").style.display = "none";
        loadReviewAssignments();
      });
    } else {
      const err = await res.json();
      Swal.fire({
        icon: "error",
        title: "Gagal Mengirim",
        text: err.message || "Terjadi kesalahan. Coba lagi.",
        confirmButtonColor: "#ff6b00",
      });
    }
  } catch (err) {
    console.error(err);
    Swal.fire({
      icon: "error",
      title: "Kesalahan Jaringan",
      text: "Tidak dapat terhubung ke server.",
      confirmButtonColor: "#ff6b00",
    });
  }
});

// Tangani submit form pilih buku
document.getElementById("catalog-form")?.addEventListener("submit", (e) => {
  e.preventDefault();

  const bookSelect = document.getElementById("book");
  const manuscriptId = bookSelect.value;

  if (!manuscriptId) {
    Swal.fire({
      icon: "warning",
      title: "Pilih Naskah",
      text: "Silakan pilih naskah terlebih dahulu.",
      confirmButtonColor: "#ff6b00",
    });
    return;
  }

  // Buka modal assign dengan manuscriptId ini
  openAssignModal(manuscriptId);
});

// === Jalankan Saat Halaman Siap ===
document.addEventListener("DOMContentLoaded", () => {
  loadReviewAssignments(); // tetap muat tabel status
  loadManuscriptsIntoBookSelect(); // tambahkan ini
});
