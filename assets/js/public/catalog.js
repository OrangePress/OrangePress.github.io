const API_URL = "https://orange-press-be.vercel.app/api/public/catalog";

let books = [];

// Ambil data dari backend
async function fetchBooks() {
  try {
    const response = await fetch(API_URL);
    const result = await response.json();

    books = result.data || [];
    renderCatalog();
  } catch (error) {
    console.error("Gagal mengambil data buku:", error);
  }
}

// Render katalog buku
function renderCatalog() {
  const catalog = document.getElementById("catalog");
  catalog.innerHTML = "";

  if (books.length === 0) {
    catalog.innerHTML = "<p>Tidak ada buku tersedia</p>";
    return;
  }

  books.forEach((book, index) => {
    const cover =
      book.files?.coverFront?.[0]?.url || "./assets/img/default-cover.jpg";

    const card = document.createElement("div");
    card.className = "book-card";

    card.innerHTML = `
          <img src="${cover}" alt="${book.title}">
          <button class="btn-detail" onclick="showBookDetail(${index})">
            Detail Buku
          </button>
        `;

    catalog.appendChild(card);
  });
}

// Tampilkan detail buku
function showBookDetail(index) {
  const book = books[index];

  document.getElementById("bookDetail").style.display = "flex";
  document.getElementById("detail-cover").src =
    book.files?.coverFront?.[0]?.url || "";
  document.getElementById("detail-title").textContent = book.title;

  const list = document.getElementById("book-data");
  list.innerHTML = "";

  const detailData = {
    "Judul Buku": book.title,
    "Nama Penulis": book.author || "-",
    Penerbit: "Orange Press",
    "Tahun Terbit": book.publishYear,
    ISBN: book.isbn,
  };

  for (const key in detailData) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${key}:</strong> ${detailData[key]}`;
    list.appendChild(li);
  }

  document.getElementById("book-sinopsis").textContent =
    book.description || "-";
}

// Tutup modal
function closeDetail() {
  document.getElementById("bookDetail").style.display = "none";
}

// Load data saat halaman dibuka
fetchBooks();
