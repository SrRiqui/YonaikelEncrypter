# 🛡️ Vault Encrypter (YonaikelEncrypter)

Sistema profesional de encriptación y desencriptación de archivos en tiempo real para el navegador web, desarrollado con **Vue 3**, **TypeScript**, **Vite** y aceleración por hardware con **WebGL** y **Web Crypto API**.

---

## 📋 Comandos de Instalación y Ejecución

Para clonar y poner en marcha el proyecto en un entorno local, ejecuta los siguientes comandos en tu terminal:

```bash
# 1. Navegar al directorio del proyecto
cd "c:/Users/SrRiqui/Documents/Code/Crip T/YonaikelEncrypter"

# 2. Instalar todas las dependencias del proyecto
npm install

# 3. Iniciar el servidor de desarrollo local
npm run dev

# 4. (Opcional) Validar la compilación y tipos de TypeScript
npx vue-tsc --noEmit

# 5. (Opcional) Compilar la versión de producción
npm run build
```

Una vez ejecutado `npm run dev`, abre tu navegador en la URL indicada por la terminal (por defecto: `http://localhost:5173/`).

---

## 🏛️ Estructura Organizacional y Distribución de Archivos

El proyecto sigue una arquitectura limpia (**Clean Architecture**) separando la interfaz de usuario de la lógica matemática y los servicios criptográficos:

| Capa | Archivo / Directorio | Responsabilidad Técnica |
| :--- | :--- | :--- |
| **Modelos de Dominio** | `src/types/crypto.types.ts` | Definición de interfaces (`QueuedFile`, `EncryptedFileItem`, `DecryptedFileItem`, etc.). |
| **Utilidades de Archivo** | `src/utils/file.utils.ts` | Lectura asíncrona de bytes (`Uint8Array`), conversiones Base64 y triggers de descarga. |
| **Utilidades de Formato** | `src/utils/format.utils.ts` | Formateo dinámico de tamaños de archivo (B, KB, MB) y limpieza de nombres. |
| **Motor Criptográfico** | `src/services/crypto/aes.service.ts` | Cifrado simétrico autenticado de grado militar **AES-GCM (256-bit)**. |
| **Motor Criptográfico** | `src/services/crypto/custom.service.ts` | Cifrado didáctico multi-capa (**Clave de 16B + XOR + Rotación modular**). |
| **Motor Criptográfico** | `src/services/crypto/base64.service.ts` | Codificación estándar Base64 para serialización de archivos. |
| **Fachada de Servicios** | `src/services/crypto/index.ts` | Clase estática `CryptoEngine` que expone una API unificada a la interfaz. |
| **Componentes Comunes** | `src/components/common/AppNavbar.vue` | Barra de navegación superior estilo *glassmorphism* con indicador de pestaña activa. |
| **Componentes Comunes** | `src/components/common/ParticleCanvas.vue` | Fondo interactivo con 4.000 partículas aceleradas por hardware con **WebGL nativo**. |
| **Componentes Comunes** | `src/components/common/ScrambleTitle.vue` | Título animado con efecto *glitch scramble* tipográfico y resplandor neón. |
| **Módulos de Cripto** | `src/components/crypto/FileEncrypter.vue` | Flujo guiado en 4 pasos para la selección de algoritmo, carga, cifrado y descarga. |
| **Módulos de Cripto** | `src/components/crypto/FileDecryptor.vue` | Flujo guiado en 4 pasos para la desencriptación y recuperación del archivo original. |
| **Vistas Principales** | `src/views/MainHubView.vue` | Hub central con tarjetas de selección rápida para Encriptar o Desencriptar. |
| **Orquestador Raíz** | `src/App.vue` | Controlador del estado de navegación activa y transiciones fluidas de página. |
| **Punto de Entrada** | `src/main.ts` | Bootstrap de la aplicación Vue 3. |
| **Estilos Base** | `src/style.css` | Sistema de diseño oscuro y reseteo de márgenes del viewport. |

---

## 🔐 Comparativa de Algoritmos Criptográficos

| Característica | AES-GCM (256 bits) | Custom Multi-Layer | Base64 Encoding |
| :--- | :--- | :--- | :--- |
| **Nivel de Seguridad** | 🛡️ Máxima (Grado Militar / Bancario) | ⚙️ Media (Didáctico / Propio) | 📄 Ninguno (Solo transporte) |
| **Longitud de Clave** | 256 bits (32 bytes) derivada por SHA-256 | 128 bits (16 bytes) aleatorios | N/A (Sin clave secreta) |
| **Autenticación (AEAD)**| Sí (Tag de autenticación de 16 bytes) | No (Solo ofuscación) | No |
| **Mecanismo Central** | Cifrado por bloques con Galois Counter Mode | Operaciones XOR + Rotación cíclica | División de 24 bits en bloques de 6 bits |
| **Vector de Inicialización**| IV de 12 bytes aleatorios por cada archivo | Shift dinámico derivado de la clave | N/A |
| **Resistencia a Ataques** | Inmune a ataques de repetición y fuerza bruta | Resistente a inspección visual simple | Fácilmente reversible por cualquiera |
| **Uso Recomendado** | Documentos confidenciales, fotos, PDFs | Demostraciones didácticas y pruebas | Intercambio de texto liviano |

---

## 🔍 Detalle del Funcionamiento Interno de los Algoritmos

### 1. AES-GCM (Galois/Counter Mode - 256 bits)
* **Archivo de implementación:** `src/services/crypto/aes.service.ts`
* **Proceso de Cifrado:**
  1. El archivo se convierte a un arreglo de bytes crudos (`Uint8Array`) con `FileReader.readAsArrayBuffer()`.
  2. La frase secreta se procesa con **SHA-256** para derivar una clave simétrica de 256 bits (`CryptoKey`).
  3. Se genera un **Vector de Inicialización (IV)** aleatorio de 12 bytes (`crypto.getRandomValues`).
  4. La Web Crypto API ejecuta `crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plainBytes)`.
  5. Se empaquetan los bytes en una sola estructura: `[IV (12 bytes)] + [Texto Cifrado + Tag (16 bytes)]`.
  6. El resultado combinado se exporta como una cadena Base64 lista para ser descargada.
* **Proceso de Descifrado:**
  1. Se decodifica la cadena Base64.
  2. Se extraen los primeros 12 bytes (IV) y el resto del bloque (Ciphertext + Tag).
  3. Se ejecuta `crypto.subtle.decrypt()`. Si el archivo sufrió alguna alteración (incluso de un solo bit), el descifrado falla inmediatamente garantizando integridad absoluta.

---

### 2. Custom Multi-Layer Cipher
* **Archivo de implementación:** `src/services/crypto/custom.service.ts`
* **Proceso de Cifrado:**
  1. Genera una clave efímera fresca de 16 bytes aleatorios.
  2. Calcula un valor de rotación dinámico (*Shift*) sumando los bytes de la clave módulo 256.
  3. **Capa 1:** Aplica una operación XOR bit a bit entre cada byte del archivo y el byte correspondiente de la clave:
     $$\text{xored}_i = \text{plainByte}_i \oplus \text{key}_{i \pmod{16}}$$
  4. **Capa 2:** Aplica un desplazamiento modular en anillo:
     $$\text{transformed}_i = (\text{xored}_i + \text{shift}) \pmod{256}$$
  5. Empaqueta la clave de 16 bytes junto a los bytes transformados y los codifica en Base64.
* **Proceso de Descifrado:**
  1. Extrae los primeros 16 bytes para recuperar la clave.
  2. Recalcula el *Shift*.
  3. Invierte la rotación modular restando el desplazamiento:
     $$\text{unrotated}_i = (\text{transformed}_i - \text{shift} + 256) \pmod{256}$$
  4. Aplica XOR con la clave para restaurar el byte original.

---

### 3. Base64 Encoding
* **Archivo de implementación:** `src/services/crypto/base64.service.ts`
* **Proceso:**
  1. Convierte el flujo binario a una representación alfanumérica de 64 caracteres imprimibles (`A-Z`, `a-z`, `0-9`, `+`, `/`).
  2. Permite guardar cualquier tipo de archivo binario (PDF, imágenes, ejecutables) en un formato plano de texto `.txt`.

---

## 💻 Flujo de Usuario en la Interfaz Web

1. **Pantalla Principal (Main Hub):**
   * El usuario observa el fondo de partículas WebGL y el título con efecto scramble.
   * Selecciona entre dos tarjetas interactivas con resplandor neón: **Encriptar** o **Desencriptar**.
2. **Módulo de Encriptación:**
   * **Paso 1:** Selecciona el algoritmo deseado (Base64, AES-GCM o Custom).
   * **Paso 2:** Arrastra el archivo o hace clic en el área para examinar su equipo.
   * **Paso 3:** Presiona **"Encriptar Ahora"**; una barra de progreso reactiva muestra el avance del procesamiento en memoria.
   * **Paso 4:** Aparece la tabla de archivos completados con el botón **"Descargar"** (`encrypted_[nombre_original]`).
3. **Módulo de Desencriptación:**
   * **Paso 1:** Selecciona el algoritmo correspondiente.
   * **Paso 2:** Carga el archivo encriptado.
   * **Paso 3:** Presiona **"Desencriptar Ahora"**.
   * **Paso 4:** Descarga el archivo restaurado en su formato original.
