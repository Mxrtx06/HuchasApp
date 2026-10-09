
"use strict";




const MONEDAS = [10, 20, 50, 100, 200];
const BILLETES = [500, 1000, 2000, 5000];

const CLAVE = "mis-huchas-v2";

let huchas = [];
let actual = null;



function obtenerImagenCerdito(tipo) {
  const imagenes = {
    viaje: "viaje.png",
    ropa: "ropa.png",
    regalos: "regalo.png",
    tecnologia: "tecnologia.png",
    otro: "otro.png"
  };

  return imagenes[tipo] || imagenes.otro;
}


function cargar() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE));

    if (Array.isArray(guardado)) {
      return guardado.map(h => ({
        ...h,
        meta: Number(h.meta) || 0,
        ahorrado: Number(h.ahorrado) || 0
      }));
    }

    const vieja = JSON.parse(localStorage.getItem("mis-huchas"));

    if (vieja && vieja.nombre && vieja.meta) {
      return [{
        id: Date.now(),
        tipo: "otro",
        nombre: vieja.nombre,
        meta: Number(vieja.meta) || 0,
        ahorrado: Number(vieja.ahorrado) || 0,
        imagen: null
      }];
    }
  } catch (error) {
    console.error("No se pudieron cargar las huchas:", error);
  }

  return [];
}




function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(huchas));
  } catch (error) {
    alert("No se han podido guardar los cambios. Puede que el almacenamiento esté lleno.");
    console.error(error);
  }
}


function reducirImagen(archivo) {
  return new Promise((resolve) => {
    const lector = new FileReader();

    lector.onload = () => {
      const img = new Image();

      img.onload = () => {
        const escala = Math.min(
          1,
          700 / Math.max(img.width, img.height)
        );

        const lienzo = document.createElement("canvas");

        lienzo.width = Math.round(img.width * escala);
        lienzo.height = Math.round(img.height * escala);

        const contexto = lienzo.getContext("2d");

        if (!contexto) {
          resolve(null);
          return;
        }

        contexto.drawImage(
          img,
          0,
          0,
          lienzo.width,
          lienzo.height
        );

        resolve(lienzo.toDataURL("image/jpeg", 0.75));
      };

      img.onerror = () => resolve(null);
      img.src = lector.result;
    };

    lector.onerror = () => resolve(null);
    lector.readAsDataURL(archivo);
  });
}



const euros = (centimos) =>
  (centimos / 100).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR"
  });

const $ = (id) => document.getElementById(id);



function mostrar(pantalla) {
  $("pantalla-lista").hidden = pantalla !== "lista";
  $("pantalla-nueva").hidden = pantalla !== "nueva";
  $("pantalla-hucha").hidden = pantalla !== "hucha";

  const abierta = pantalla === "hucha" && actual !== null;

  document.body.className = abierta
    ? "fondo-" + actual.tipo + (actual.imagen ? " con-imagen" : "")
    : "";

  document.body.style.backgroundImage =
    abierta && actual.imagen
      ? 'url("' + actual.imagen + '")'
      : "";
}



function pintarLista() {
  const cont = $("lista");
  cont.innerHTML = "";

  huchas.forEach((h) => {
    const porcentaje = h.meta > 0
      ? Math.min(h.ahorrado / h.meta, 1) * 100
      : 0;

    const cuadrado = document.createElement("button");
    cuadrado.className = "tile";
    cuadrado.classList.add("carpeta-" + h.tipo);

    cuadrado.innerHTML = `
      <span class="pestana"></span>
      <span class="cuerpo">
        <strong></strong>
        <small></small>
        <span class="mini"><span></span></span>
      </span>
    `;

    const cuerpo = cuadrado.querySelector(".cuerpo");

    if (h.imagen) {
      cuerpo.classList.add("con-imagen");
      cuerpo.style.backgroundImage = 'url("' + h.imagen + '")';
    }

    cuadrado.querySelector("strong").textContent = h.nombre;

    cuadrado.querySelector("small").textContent =
      euros(h.ahorrado) + " de " + euros(h.meta);

    cuadrado.querySelector(".mini span").style.width =
      porcentaje + "%";

    cuadrado.addEventListener("click", () => abrir(h));

    cont.appendChild(cuadrado);
  });



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



function abrir(h) {
  actual = h;
  pintar();
  mostrar("hucha");
}



function pintar() {
  if (!actual) return;

  const porcentaje = actual.meta > 0
    ? Math.min(actual.ahorrado / actual.meta, 1)
    : 0;

  $("titulo").textContent = actual.nombre;
  $("ahorrado").textContent = euros(actual.ahorrado);
  $("objetivo").textContent = euros(actual.meta);



  const imagenCerdito = $("imagen-cerdito");

  imagenCerdito.src = obtenerImagenCerdito(actual.tipo);
  imagenCerdito.alt = "Cerdito para ahorrar: " + actual.nombre;

  

  $("relleno").style.width = porcentaje * 100 + "%";

  $("barra").setAttribute(
    "aria-valuenow",
    Math.round(porcentaje * 100)
  );



  $("mensaje").textContent = porcentaje >= 1
    ? "¡Meta conseguida!"
    : "Te faltan " + euros(actual.meta - actual.ahorrado);
}


function crearBotones() {
  const cont = $("dinero");
  cont.innerHTML = "";

  MONEDAS.forEach(valor => {
    crearBotonDinero(valor, "moneda");
  });

  BILLETES.forEach(valor => {
    crearBotonDinero(valor, "billete");
  });
}

function crearBotonDinero(valor, tipo) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = tipo;

  boton.textContent = euros(valor);
  boton.setAttribute("aria-label", "Meter " + euros(valor));

  boton.addEventListener("click", () => {
    meterDinero(valor, tipo);
  });

  $("dinero").appendChild(boton);
}




function meterDinero(valor, tipo) {
  if (!actual) return;

  const destino = actual;

  const pieza = document.createElement("div");
  pieza.className = "pieza " + tipo;
  pieza.textContent =
    (valor / 100).toLocaleString("es-ES") + " €";

  $("escenario").appendChild(pieza);



  pieza.addEventListener("animationend", () => {
    pieza.remove();

    destino.ahorrado += valor;

    guardar();
    pintarLista();

    if (actual === destino) {
      pintar();

      const imagen = $("imagen-cerdito");

      imagen.classList.remove("temblar");

   
      void imagen.offsetWidth;

      imagen.classList.add("temblar");
    }
  }, { once: true });
}



$("form-meta").addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const nombre = $("nombre").value.trim();
  const metaIntroducida = Number($("meta").value);
  const tipo = $("tipo").value;
  const archivo = $("imagen").files[0];

  if (!nombre || !Number.isFinite(metaIntroducida) || metaIntroducida <= 0) {
    alert("Escribe un nombre y una meta válida.");
    return;
  }

  let imagen = null;

  if (archivo) {
    imagen = await reducirImagen(archivo);

    if (!imagen) {
      alert("No se ha podido cargar la imagen de fondo.");
      return;
    }
  }

  huchas.push({
    id: Date.now(),
    nombre: nombre,
    tipo: tipo,
    meta: Math.round(metaIntroducida * 100),
    ahorrado: 0,
    imagen: imagen
  });

  guardar();
  pintarLista();
  mostrar("lista");
});



$("cancelar").addEventListener("click", () => {
  mostrar("lista");
});



$("volver").addEventListener("click", () => {
  actual = null;
  pintarLista();
  mostrar("lista");
});



$("borrar").addEventListener("click", () => {
  if (!actual) return;

  const confirmar = confirm(
    "¿Borrar esta hucha? No se puede deshacer."
  );

  if (!confirmar) return;

  huchas = huchas.filter((h) => h !== actual);

  actual = null;

  guardar();
  pintarLista();
  mostrar("lista");
});



crearBotones();

huchas = cargar();

pintarLista();

mostrar("lista");