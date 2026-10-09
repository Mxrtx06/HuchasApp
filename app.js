// ---------- Datos ----------
// El dinero se guarda en CÉNTIMOS (números enteros): 1 € = 100.
const MONEDAS = [10, 20, 50, 100, 200];      // 0,10 € ... 2 €
const BILLETES = [500, 1000, 2000, 5000];    // 5 € ... 50 €
const CLAVE = "mis-huchas-v2";

let huchas = [];   // la lista con TODAS las huchas
let actual = null; // la hucha que tienes abierta ahora mismo

// Cada hucha es un objeto así:
// { id: 123, nombre: "Roma", tipo: "viaje", meta: 80000, ahorrado: 5000 }

function cargar() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE));
    if (guardado) return guardado;
    // Si tenías la hucha de la versión anterior, la convertimos en una de la lista
    const vieja = JSON.parse(localStorage.getItem("mis-huchas"));
    if (vieja) {
      return [{ id: Date.now(), tipo: "otro", nombre: vieja.nombre, meta: vieja.meta, ahorrado: vieja.ahorrado }];
    }
  } catch {}
  return [];
}

function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(huchas)); } catch {}
}

// Lee la imagen elegida y la hace más pequeña (máx. 700 px) para que quepa en el navegador.
// Devuelve el texto de la imagen (data URL) o null si algo falla.
function reducirImagen(archivo) {
  return new Promise((resolve) => {
    const lector = new FileReader();
    lector.onload = () => {
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, 700 / Math.max(img.width, img.height));
        const lienzo = document.createElement("canvas");
        lienzo.width = Math.round(img.width * escala);
        lienzo.height = Math.round(img.height * escala);
        lienzo.getContext("2d").drawImage(img, 0, 0, lienzo.width, lienzo.height);
        resolve(lienzo.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = () => resolve(null);
      img.src = lector.result;
    };
    lector.onerror = () => resolve(null);
    lector.readAsDataURL(archivo);
  });
}

const euros = (c) => (c / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
const $ = (id) => document.getElementById(id);

// ---------- Pantallas ----------
// Enseña una pantalla ("lista", "nueva" o "hucha") y esconde las otras.
function mostrar(pantalla) {
  $("pantalla-lista").hidden = pantalla !== "lista";
  $("pantalla-nueva").hidden = pantalla !== "nueva";
  $("pantalla-hucha").hidden = pantalla !== "hucha";
  // El fondo de la página cambia según el tipo de la hucha abierta
  const abierta = pantalla === "hucha";
  document.body.className = abierta
    ? "fondo-" + actual.tipo + (actual.imagen ? " con-imagen" : "")
    : "";
  document.body.style.backgroundImage = abierta && actual.imagen
    ? "url(" + actual.imagen + ")"
    : "";
}

// Dibuja los cuadrados de la pantalla principal
function pintarLista() {
  const cont = $("lista");
  cont.innerHTML = "";

  huchas.forEach((h) => {
    const pct = Math.min(h.ahorrado / h.meta, 1) * 100;
    const cuadrado = document.createElement("button");
    cuadrado.className = "tile";
    cuadrado.innerHTML = "<span class='pestana'></span><span class='cuerpo'><strong></strong><small></small><span class='mini'><span></span></span></span>";
    // El estilo (colores o cuadros) depende del tipo de hucha
    cuadrado.classList.add("carpeta-" + h.tipo);
    const cuerpo = cuadrado.querySelector(".cuerpo");
    if (h.imagen) { // si elegiste imagen, rellena la carpeta
      cuerpo.classList.add("con-imagen");
      cuerpo.style.backgroundImage = "url(" + h.imagen + ")";
    }
    cuadrado.querySelector("strong").textContent = h.nombre;
    cuadrado.querySelector("small").textContent = euros(h.ahorrado) + " de " + euros(h.meta);
    cuadrado.querySelector(".mini span").style.width = pct + "%";
    cuadrado.addEventListener("click", () => abrir(h));
    cont.appendChild(cuadrado);
  });

  // El cuadrado del final, para crear una hucha nueva
  const nueva = document.createElement("button");
  nueva.className = "tile tile-nueva";
  nueva.textContent = "+";
  nueva.setAttribute("aria-label", "Crear hucha nueva");
  nueva.addEventListener("click", () => {
    $("form-meta").reset();
    mostrar("nueva");
  });
  cont.appendChild(nueva);
}

// Abre una hucha de la lista
function abrir(h) {
  actual = h;
  pintar();
  mostrar("hucha");
}

// Pone los números de la hucha abierta (cantidad, barra, nivel del cerdito)
function pintar() {
  const pct = Math.min(actual.ahorrado / actual.meta, 1);
  $("titulo").textContent = actual.nombre;
  $("ahorrado").textContent = euros(actual.ahorrado);
  $("objetivo").textContent = euros(actual.meta);
  $("relleno").style.width = pct * 100 + "%";
  $("barra").setAttribute("aria-valuenow", Math.round(pct * 100));

  // El nivel sube dentro del cerdito (el cuerpo va de y=66 a y=192)
  const alto = 126 * pct;
  $("nivel").setAttribute("y", 192 - alto);
  $("nivel").setAttribute("height", alto);

  $("mensaje").textContent = pct >= 1
    ? "¡Meta conseguida! 🎉"
    : "Te faltan " + euros(actual.meta - actual.ahorrado);
}

// ---------- Botones de dinero ----------
function crearBotones() {
  const cont = $("dinero");
  cont.innerHTML = "";
  [...MONEDAS.map((v) => [v, "moneda"]), ...BILLETES.map((v) => [v, "billete"])]
    .forEach(([valor, tipo]) => {
      const b = document.createElement("button");
      b.className = tipo;
      b.textContent = (valor / 100).toLocaleString("es-ES") + " €";
      b.setAttribute("aria-label", "Meter " + euros(valor));
      b.addEventListener("click", () => meterDinero(valor, tipo));
      cont.appendChild(b);
    });
}

// ---------- Animación ----------
function meterDinero(valor, tipo) {
  const destino = actual; // nos acordamos de en qué hucha estabas al pulsar

  const pieza = document.createElement("div");
  pieza.className = "pieza " + tipo;
  pieza.textContent = (valor / 100).toLocaleString("es-ES");
  $("escenario").appendChild(pieza);

  // Cuando termina de caer, se suma el dinero
  pieza.addEventListener("animationend", () => {
    pieza.remove();
    destino.ahorrado += valor;
    guardar();
    if (actual === destino) { // solo si sigues en esa hucha
      pintar();
      const g = $("hucha");
      g.classList.remove("temblar");
      void g.getBoundingClientRect(); // reinicia la animación si pulsas rápido
      g.classList.add("temblar");
    }
  });
}

// ---------- Eventos ----------
// Crear una hucha nueva
$("form-meta").addEventListener("submit", async (e) => {
  e.preventDefault();
  const archivo = $("imagen").files[0];
  const imagen = archivo ? await reducirImagen(archivo) : null;
  huchas.push({
    imagen: imagen,
    id: Date.now(),
    nombre: $("nombre").value.trim(),
    tipo: $("tipo").value,
    meta: Math.round(parseFloat($("meta").value) * 100),
    ahorrado: 0,
  });
  guardar();
  pintarLista();
  mostrar("lista");
});

$("cancelar").addEventListener("click", () => mostrar("lista"));

// Volver a la pantalla principal
$("volver").addEventListener("click", () => {
  actual = null;
  pintarLista();
  mostrar("lista");
});

// Borrar SOLO la hucha que tienes abierta
$("borrar").addEventListener("click", () => {
  if (!confirm("¿Borrar esta hucha? No se puede deshacer.")) return;
  huchas = huchas.filter((h) => h !== actual);
  actual = null;
  guardar();
  pintarLista();
  mostrar("lista");
});

// ---------- Arranque ----------
crearBotones();
huchas = cargar();
pintarLista();
mostrar("lista");