// carrito.js
// Funcionalidad de carrito lateral, persistencia y checkout (frontend)

document.addEventListener("DOMContentLoaded", () => {
  const PROMO_SELECTOR = ".promociones .caja";
  const CART_ICON = document.querySelector(".cart-link");
  const CART_COUNT = document.querySelector(".cart-count");

  // Cargar carrito desde localStorage o iniciar vacío
  let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

  // --- Construir sidebar del carrito (DOM) ---
  const sidebar = document.createElement("aside");
  sidebar.id = "cart-sidebar";
  sidebar.className = "cart-sidebar"; // tu CSS ya tiene .cart-sidebar
  sidebar.innerHTML = `
    <div class="cart-header">
      <h2>🛍️ Tu carrito</h2>
      <button class="cerrar-carrito" aria-label="Cerrar carrito">&times;</button>
    </div>
    <div class="cart-body">
      <div class="cart-items" id="cart-items"></div>
      <div class="cart-empty" id="cart-empty" style="display:none;">Tu carrito está vacío</div>
    </div>
    <div class="cart-footer">
      <div class="cart-total">Total: <strong id="cart-total">$0</strong></div>
      <div class="cart-actions">
        <button id="vaciar-carrito" class="btn-pago">Vaciar</button>
        <button id="checkout" class="btn-pago">Finalizar compra</button>
      </div>
    </div>
  `;
  document.body.appendChild(sidebar);

  const cartItemsEl = document.getElementById("cart-items");
  const cartTotalEl = document.getElementById("cart-total");
  const cartEmptyEl = document.getElementById("cart-empty");
  const closeBtn = sidebar.querySelector(".cerrar-carrito");
  const vaciarBtn = document.getElementById("vaciar-carrito");
  const checkoutBtn = document.getElementById("checkout");

  // --- Helpers ---
  function formatearCOP(valor) {
    return `$${Number(valor).toLocaleString("es-CO")}`;
  }

  function guardarCarrito() {
    localStorage.setItem("carrito", JSON.stringify(carrito));
    actualizarContador();
  }

  function actualizarContador() {
    const totalCant = carrito.reduce((s, p) => s + p.cantidad, 0);
    CART_COUNT.textContent = totalCant;
  }

  // --- Render carrito en sidebar ---
  function renderCarrito() {
    cartItemsEl.innerHTML = "";
    if (carrito.length === 0) {
      cartEmptyEl.style.display = "block";
      cartTotalEl.textContent = "$0";
      return;
    }
    cartEmptyEl.style.display = "none";

    carrito.forEach((p, idx) => {
      const item = document.createElement("div");
      item.className = "cart-item";
      item.innerHTML = `
        <img class="cart-img" src="${p.imagen}" alt="${escapeHtml(p.nombre)}" />
        <div class="cart-info">
          <p class="cart-name">${escapeHtml(p.nombre)}</p>
          <p class="cart-price">${formatearCOP(p.precio)}</p>
          <div class="cart-qty">
            <label>Cantidad:</label>
            <input class="cantidad-input" type="number" min="1" value="${p.cantidad}" data-index="${idx}">
            <button class="eliminar-item" data-index="${idx}" aria-label="Eliminar">Eliminar</button>
          </div>
          <p class="cart-sub">Subtotal: <strong>${formatearCOP(p.precio * p.cantidad)}</strong></p>
        </div>
      `;
      cartItemsEl.appendChild(item);
    });

    // add listeners for inputs and buttons
    document.querySelectorAll(".cantidad-input").forEach(inp => {
      inp.addEventListener("change", (e) => {
        const i = Number(e.target.dataset.index);
        let val = parseInt(e.target.value);
        if (isNaN(val) || val < 1) { val = 1; e.target.value = 1; }
        carrito[i].cantidad = val;
        guardarCarrito();
        renderCarrito();
      });
    });

    document.querySelectorAll(".eliminar-item").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const i = Number(e.target.dataset.index);
        carrito.splice(i, 1);
        guardarCarrito();
        renderCarrito();
      });
    });

    const total = carrito.reduce((s, it) => s + it.precio * it.cantidad, 0);
    cartTotalEl.textContent = formatearCOP(total);
  }

  // escape pequeño para innerHTML seguro en nombres
  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  // --- Agregar producto al carrito (desde promociones) ---
  // Añadiremos un botón "Agregar" a cada .promociones .caja (si no existe)
  document.querySelectorAll(PROMO_SELECTOR).forEach((caja) => {
    // extraer datos
    const img = caja.querySelector("img");
    const imgSrc = img ? img.src : "";
    const nombre = img ? img.alt || "Producto" : "Producto";
    const precioEl = caja.querySelector(".precio-descuento");
    let precio = 0;
    if (precioEl) {
      // convertir "$35.000" -> 35000
      precio = Number(precioEl.textContent.replace(/[^\d]/g, ""));
    }

    // crear botón si no existe
    if (!caja.querySelector(".btn-agregar")) {
      const btn = document.createElement("button");
      btn.className = "btn-agregar";
      btn.type = "button";
      btn.textContent = "Agregar al carrito";
      btn.addEventListener("click", (e) => {
        e.stopPropagation(); // evita que el click propague si caja tiene listeners
        agregarAlCarrito({ nombre, precio, imagen: imgSrc });
      });
      caja.appendChild(btn);
    }
  });

  function agregarAlCarrito({ nombre, precio, imagen }) {
    if (!nombre || !precio) {
      alert("Producto inválido.");
      return;
    }
    const existente = carrito.find(p => p.nombre === nombre);
    if (existente) existente.cantidad += 1;
    else carrito.push({ id: Date.now() + Math.random(), nombre, precio, imagen, cantidad: 1 });

    guardarCarrito();
    renderCarrito();
    // abrir sidebar breve para feedback
    openSidebar();
  }

  // --- Sidebar open/close ---
  function openSidebar() { sidebar.classList.add("open"); }
  function closeSidebar() { sidebar.classList.remove("open"); }

  CART_ICON.addEventListener("click", (e) => {
    e.preventDefault();
    sidebar.classList.toggle("open");
    renderCarrito();
  });

  closeBtn.addEventListener("click", closeSidebar);

  // vaciar carrito
  vaciarBtn.addEventListener("click", () => {
    if (!confirm("¿Vaciar todo el carrito?")) return;
    carrito = [];
    guardarCarrito();
    renderCarrito();
  });

   // --- CHECKOUT: Redirección a link de pago simple ---
  checkoutBtn.addEventListener("click", () => {
    if (carrito.length === 0) {
      alert("🛒 Tu carrito está vacío");
      return;
    }

    // Guardar el carrito por si el usuario vuelve
    guardarCarrito();

    // 💳 Redirige directamente a tu link de pago
    const linkPago = "https://link.mercadopago.com.co/bellezamay"; // <-- reemplaza este link por el tuyo real
    window.open(linkPago, "_blank"); // abre en una nueva pestaña (o usa window.location.href si prefieres en la misma)
  });

  // Inicializar UI
  actualizarContador();
  renderCarrito();
});
// --- CHECKOUT: Redirección con monto total incluido ---
checkoutBtn.addEventListener("click", () => {
  if (carrito.length === 0) {
    alert("🛒 Tu carrito está vacío");
    return;
  }

  // Calcular el total
  const total = carrito.reduce((sum, p) => sum + p.precio * p.cantidad, 0);
  const totalFormateado = total.toLocaleString("es-CO", { style: "currency", currency: "COP" });

  // Guardar el carrito en localStorage por si vuelve
  guardarCarrito();

  // Mostrar confirmación antes de pagar
  const confirmar = confirm(`El total a pagar es ${totalFormateado}. ¿Deseas continuar con el pago?`);
  if (!confirmar) return;

  // Link base de pago (creado en MercadoPago)
  const baseLink = "https://link.mercadopago.com.co/bellezamay";

  // Adjuntar el monto total como parámetro (solo informativo)
  const linkConTotal = `${baseLink}?monto=${encodeURIComponent(totalFormateado)}`;

  // Redirigir al link de pago
  window.open(linkConTotal, "_blank");
});
