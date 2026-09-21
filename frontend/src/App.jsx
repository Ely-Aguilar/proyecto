import { useEffect, useState } from 'react'
import './App.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const ROLES = ['ESTUDIANTE', 'DOCENTE', 'BIBLIOTECARIO', 'ADMINISTRADOR']
const CABECERAS_JSON = { 'Content-Type': 'application/json' }

async function pedir(ruta, opciones) {
  let respuesta
  try {
    respuesta = await fetch(`${API}${ruta}`, opciones)
  } catch {
    throw new Error('No se pudo conectar con el servidor.')
  }
  const datos = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) {
    throw new Error(datos.error || 'Ocurrió un error inesperado.')
  }
  return datos
}

const enviarJSON = (metodo, cuerpo) => ({
  method: metodo,
  headers: CABECERAS_JSON,
  body: JSON.stringify(cuerpo),
})

const fechaCorta = (fecha) => new Date(fecha).toLocaleDateString('es-BO')

function BotonVolver({ volver }) {
  return (
    <button type="button" className="volver" onClick={volver}>
      ← Volver
    </button>
  )
}

function Modal({ titulo, cerrar, children }) {
  useEffect(() => {
    const alTeclear = (e) => {
      if (e.key === 'Escape') cerrar()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [cerrar])

  return (
    <div
      className="modal-fondo"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) cerrar()
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="barra">
          <h3>{titulo}</h3>
          <button type="button" className="volver" onClick={cerrar}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ---------- Catálogo ----------

const LIBRO_VACIO = { titulo: '', autor: '', isbn: '', categoria: '', stock: '1' }

function FormLibro({ inicial, enviar, cancelar }) {
  const [form, setForm] = useState(inicial)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const guardar = async (evento) => {
    evento.preventDefault()
    setError('')
    setGuardando(true)
    try {
      await enviar({ ...form, stock: Number(form.stock) })
    } catch (e) {
      setError(e.message)
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar}>
      <label>Título</label>
      <input type="text" value={form.titulo} onChange={cambiar('titulo')} required />
      <label>Autor</label>
      <input type="text" value={form.autor} onChange={cambiar('autor')} required />
      <label>ISBN</label>
      <input type="text" value={form.isbn} onChange={cambiar('isbn')} required />
      <label>Categoría</label>
      <input type="text" value={form.categoria} onChange={cambiar('categoria')} required />
      <label>Ejemplares disponibles (stock)</label>
      <input
        type="number"
        min="0"
        step="1"
        value={form.stock}
        onChange={cambiar('stock')}
        required
      />
      {error && <p className="aviso error">{error}</p>}
      <div className="acciones">
        <button type="submit" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
        <button type="button" className="volver" onClick={cancelar}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

// HU01 (consultar catálogo), HU02 (buscar) + agregar, editar y eliminar libros
function Catalogo({ busqueda, setBusqueda, volver }) {
  const [libros, setLibros] = useState([])
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [version, setVersion] = useState(0)
  const [mensaje, setMensaje] = useState(null)
  const [modal, setModal] = useState(null)

  useEffect(() => {
    let activo = true
    const temporizador = setTimeout(async () => {
      setCargando(true)
      try {
        const datos = await pedir(
          `/api/libros?titulo=${encodeURIComponent(busqueda)}`
        )
        if (!activo) return
        setLibros(datos)
        setError('')
      } catch (e) {
        if (activo) setError(e.message)
      } finally {
        if (activo) setCargando(false)
      }
    }, 300)
    return () => {
      activo = false
      clearTimeout(temporizador)
    }
  }, [busqueda, version])

  const guardar = async (datos) => {
    if (modal.libro) {
      await pedir(`/api/libros/${modal.libro.id}`, enviarJSON('PUT', datos))
      setMensaje({ tipo: 'ok', texto: `Libro actualizado: "${datos.titulo}".` })
    } else {
      await pedir('/api/libros', enviarJSON('POST', datos))
      setMensaje({ tipo: 'ok', texto: `Libro agregado: "${datos.titulo}".` })
    }
    setModal(null)
    setVersion((v) => v + 1)
  }

  const eliminar = async (libro) => {
    const confirmado = window.confirm(
      `¿Eliminar "${libro.titulo}"? También se borrará su historial de préstamos y no se puede deshacer.`
    )
    if (!confirmado) return
    setMensaje(null)
    try {
      await pedir(`/api/libros/${libro.id}`, { method: 'DELETE' })
      setMensaje({ tipo: 'ok', texto: `Libro eliminado: "${libro.titulo}".` })
      setVersion((v) => v + 1)
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message })
    }
  }

  return (
    <section className="panel">
      <div className="barra">
        <h2>📖 Catálogo</h2>
        <div className="acciones">
          <BotonVolver volver={volver} />
          <button type="button" onClick={() => setModal({ libro: null })}>
            ➕ Agregar libro
          </button>
        </div>
      </div>

      {mensaje && <p className={`aviso ${mensaje.tipo}`}>{mensaje.texto}</p>}

      <input
        type="text"
        placeholder="🔎 Buscar por título o autor..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />
      {error && <p className="aviso error">{error}</p>}
      {cargando && <p>Cargando...</p>}
      {!cargando && !error && libros.length === 0 && (
        <p>No se encontraron libros.</p>
      )}
      {libros.length > 0 && (
        <table className="tabla">
          <thead>
            <tr>
              <th>Título</th>
              <th>Autor</th>
              <th>Categoría</th>
              <th>Disponibilidad</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {libros.map((libro) => (
              <tr key={libro.id}>
                <td>{libro.titulo}</td>
                <td>{libro.autor}</td>
                <td>{libro.categoria}</td>
                <td>
                  <span className={`etiqueta ${libro.disponible ? 'ok' : 'atrasado'}`}>
                    {libro.disponible
                      ? `Disponible (${libro.stock})`
                      : 'No disponible'}
                  </span>
                </td>
                <td>
                  <div className="acciones">
                    <button type="button" onClick={() => setModal({ libro })}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="peligro"
                      onClick={() => eliminar(libro)}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && (
        <Modal
          titulo={modal.libro ? 'Editar libro' : 'Agregar libro'}
          cerrar={() => setModal(null)}
        >
          <FormLibro
            inicial={
              modal.libro
                ? { ...modal.libro, stock: String(modal.libro.stock) }
                : LIBRO_VACIO
            }
            enviar={guardar}
            cancelar={() => setModal(null)}
          />
        </Modal>
      )}
    </section>
  )
}

// ---------- Préstamos ----------

function FormPrestamo({ usuarios, libros, enviar, cancelar }) {
  const [usuarioId, setUsuarioId] = useState('')
  const [libroId, setLibroId] = useState('')
  const [dias, setDias] = useState('7')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const guardar = async (evento) => {
    evento.preventDefault()
    setError('')
    setGuardando(true)
    try {
      await enviar({
        usuarioId: Number(usuarioId),
        libroId: Number(libroId),
        dias: Number(dias),
      })
    } catch (e) {
      setError(e.message)
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar}>
      <label>Usuario</label>
      <select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)}>
        <option value="" disabled>
          Selecciona un usuario
        </option>
        {usuarios.map((usuario) => (
          <option key={usuario.id} value={usuario.id}>
            {usuario.nombre} ({usuario.rol})
          </option>
        ))}
      </select>

      <label>Libro (solo disponibles)</label>
      <select value={libroId} onChange={(e) => setLibroId(e.target.value)}>
        <option value="" disabled>
          {libros.length === 0 ? 'No hay libros disponibles' : 'Selecciona un libro'}
        </option>
        {libros.map((libro) => (
          <option key={libro.id} value={libro.id}>
            {libro.titulo} — {libro.stock} disponibles
          </option>
        ))}
      </select>

      <label>Días de préstamo</label>
      <input
        type="number"
        min="1"
        max="60"
        step="1"
        value={dias}
        onChange={(e) => setDias(e.target.value)}
        required
      />

      {error && <p className="aviso error">{error}</p>}
      <div className="acciones">
        <button type="submit" disabled={!usuarioId || !libroId || guardando}>
          {guardando ? 'Registrando...' : 'Registrar préstamo'}
        </button>
        <button type="button" className="volver" onClick={cancelar}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

function estadoDe(prestamo) {
  if (prestamo.estado === 'DEVUELTO') return { texto: 'Devuelto', clase: '' }
  if (prestamo.atrasado) return { texto: 'Atrasado', clase: 'atrasado' }
  return { texto: 'Activo', clase: 'ok' }
}

// HU03: registrar préstamos + devolución y marca de atraso
function Prestamos({ volver }) {
  const [usuarios, setUsuarios] = useState([])
  const [libros, setLibros] = useState([])
  const [prestamos, setPrestamos] = useState([])
  const [mensaje, setMensaje] = useState(null)
  const [modal, setModal] = useState(false)

  const cargar = async () => {
    try {
      const [u, l, p] = await Promise.all([
        pedir('/api/usuarios'),
        pedir('/api/libros'),
        pedir('/api/prestamos'),
      ])
      setUsuarios(u)
      setLibros(l)
      setPrestamos(p)
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message })
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const registrar = async (datos) => {
    const nuevo = await pedir('/api/prestamos', enviarJSON('POST', datos))
    setMensaje({
      tipo: 'ok',
      texto: `Préstamo registrado: "${nuevo.libro.titulo}" para ${nuevo.usuario.nombre}.`,
    })
    setModal(false)
    await cargar()
  }

  const devolver = async (prestamo) => {
    setMensaje(null)
    try {
      await pedir(`/api/prestamos/${prestamo.id}/devolver`, { method: 'PATCH' })
      setMensaje({
        tipo: 'ok',
        texto: `Devolución registrada: "${prestamo.libro.titulo}".`,
      })
      await cargar()
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message })
    }
  }

  return (
    <section className="panel">
      <div className="barra">
        <h2>📋 Préstamos</h2>
        <div className="acciones">
          <BotonVolver volver={volver} />
          <button type="button" onClick={() => setModal(true)}>
            ➕ Nuevo préstamo
          </button>
        </div>
      </div>

      {mensaje && <p className={`aviso ${mensaje.tipo}`}>{mensaje.texto}</p>}

      {prestamos.length === 0 ? (
        <p>Aún no hay préstamos registrados.</p>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Libro</th>
              <th>Fecha límite</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {prestamos.map((prestamo) => {
              const estado = estadoDe(prestamo)
              return (
                <tr key={prestamo.id}>
                  <td>{prestamo.usuario.nombre}</td>
                  <td>{prestamo.libro.titulo}</td>
                  <td>{fechaCorta(prestamo.fechaLimite)}</td>
                  <td>
                    <span className={`etiqueta ${estado.clase}`}>{estado.texto}</span>
                  </td>
                  <td>
                    {prestamo.estado === 'DEVUELTO' ? (
                      <span>
                        {prestamo.fechaDevolucion
                          ? fechaCorta(prestamo.fechaDevolucion)
                          : '—'}
                      </span>
                    ) : (
                      <button type="button" onClick={() => devolver(prestamo)}>
                        Marcar devuelto
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {modal && (
        <Modal titulo="Nuevo préstamo" cerrar={() => setModal(false)}>
          <FormPrestamo
            usuarios={usuarios}
            libros={libros.filter((libro) => libro.disponible)}
            enviar={registrar}
            cancelar={() => setModal(false)}
          />
        </Modal>
      )}
    </section>
  )
}

// ---------- Usuarios ----------

const USUARIO_VACIO = { nombre: '', email: '', password: '', rol: 'ESTUDIANTE' }

function FormUsuario({ inicial, editando, enviar, cancelar }) {
  const [form, setForm] = useState(inicial)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const guardar = async (evento) => {
    evento.preventDefault()
    setError('')
    setGuardando(true)
    try {
      await enviar(form)
    } catch (e) {
      setError(e.message)
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar}>
      <label>Nombre</label>
      <input type="text" value={form.nombre} onChange={cambiar('nombre')} required />
      <label>Correo</label>
      <input type="email" value={form.email} onChange={cambiar('email')} required />
      <label>
        {editando
          ? 'Contraseña nueva (déjala vacía para no cambiarla)'
          : 'Contraseña (mínimo 6 caracteres)'}
      </label>
      <input
        type="password"
        autoComplete="new-password"
        minLength={editando ? undefined : 6}
        value={form.password}
        onChange={cambiar('password')}
        required={!editando}
      />
      <label>Rol</label>
      <select value={form.rol} onChange={cambiar('rol')}>
        {ROLES.map((rol) => (
          <option key={rol} value={rol}>
            {rol}
          </option>
        ))}
      </select>
      {error && <p className="aviso error">{error}</p>}
      <div className="acciones">
        <button type="submit" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
        <button type="button" className="volver" onClick={cancelar}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

function Usuarios({ volver }) {
  const [usuarios, setUsuarios] = useState([])
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const [mensaje, setMensaje] = useState(null)
  const [modal, setModal] = useState(null)

  useEffect(() => {
    let activo = true
    pedir('/api/usuarios')
      .then((datos) => {
        if (!activo) return
        setUsuarios(datos)
        setError('')
      })
      .catch((e) => {
        if (activo) setError(e.message)
      })
    return () => {
      activo = false
    }
  }, [version])

  const guardar = async (datos) => {
    if (modal.usuario) {
      await pedir(`/api/usuarios/${modal.usuario.id}`, enviarJSON('PUT', datos))
      setMensaje({ tipo: 'ok', texto: `Usuario actualizado: ${datos.nombre}.` })
    } else {
      await pedir('/api/usuarios', enviarJSON('POST', datos))
      setMensaje({ tipo: 'ok', texto: `Usuario agregado: ${datos.nombre}.` })
    }
    setModal(null)
    setVersion((v) => v + 1)
  }

  const eliminar = async (usuario) => {
    const confirmado = window.confirm(
      `¿Eliminar a ${usuario.nombre}? También se borrará su historial de préstamos y no se puede deshacer.`
    )
    if (!confirmado) return
    setMensaje(null)
    try {
      await pedir(`/api/usuarios/${usuario.id}`, { method: 'DELETE' })
      setMensaje({ tipo: 'ok', texto: `Usuario eliminado: ${usuario.nombre}.` })
      setVersion((v) => v + 1)
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message })
    }
  }

  return (
    <section className="panel">
      <div className="barra">
        <h2>👥 Usuarios</h2>
        <div className="acciones">
          <BotonVolver volver={volver} />
          <button type="button" onClick={() => setModal({ usuario: null })}>
            ➕ Agregar usuario
          </button>
        </div>
      </div>

      {mensaje && <p className={`aviso ${mensaje.tipo}`}>{mensaje.texto}</p>}
      {error && <p className="aviso error">{error}</p>}

      {usuarios.length > 0 && (
        <table className="tabla">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => (
              <tr key={usuario.id}>
                <td>{usuario.nombre}</td>
                <td>{usuario.email}</td>
                <td>
                  <span className="etiqueta">{usuario.rol}</span>
                </td>
                <td>
                  <div className="acciones">
                    <button type="button" onClick={() => setModal({ usuario })}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="peligro"
                      onClick={() => eliminar(usuario)}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && (
        <Modal
          titulo={modal.usuario ? 'Editar usuario' : 'Agregar usuario'}
          cerrar={() => setModal(null)}
        >
          <FormUsuario
            editando={Boolean(modal.usuario)}
            inicial={
              modal.usuario
                ? {
                    nombre: modal.usuario.nombre,
                    email: modal.usuario.email,
                    password: '',
                    rol: modal.usuario.rol,
                  }
                : USUARIO_VACIO
            }
            enviar={guardar}
            cancelar={() => setModal(null)}
          />
        </Modal>
      )}
    </section>
  )
}

// ---------- Informes ----------

function Informes({ volver }) {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let activo = true
    pedir('/api/informes')
      .then((respuesta) => {
        if (!activo) return
        setDatos(respuesta)
        setError('')
      })
      .catch((e) => {
        if (activo) setError(e.message)
      })
    return () => {
      activo = false
    }
  }, [version])

  const contadores = datos
    ? [
        ['Títulos en catálogo', datos.titulos],
        ['Ejemplares disponibles', datos.ejemplaresDisponibles],
        ['Ejemplares prestados', datos.prestados],
        ['Préstamos atrasados', datos.atrasados],
        ['Usuarios', datos.usuarios],
        ['Préstamos registrados', datos.prestamos],
      ]
    : []

  return (
    <section className="panel">
      <div className="barra">
        <h2>📊 Informes</h2>
        <div className="acciones">
          <BotonVolver volver={volver} />
          <button type="button" onClick={() => setVersion((v) => v + 1)}>
            🔄 Actualizar
          </button>
        </div>
      </div>

      {error && <p className="aviso error">{error}</p>}
      {!datos && !error && <p>Cargando...</p>}

      {datos && (
        <>
          <div className="contadores">
            {contadores.map(([etiqueta, valor]) => (
              <div className="contador" key={etiqueta}>
                <strong>{valor}</strong>
                <span>{etiqueta}</span>
              </div>
            ))}
          </div>

          <h3>Libros más prestados</h3>
          {datos.masPrestados.length === 0 ? (
            <p>Aún no hay préstamos para mostrar.</p>
          ) : (
            <table className="tabla">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Autor</th>
                  <th>Veces prestado</th>
                </tr>
              </thead>
              <tbody>
                {datos.masPrestados.map((libro) => (
                  <tr key={libro.titulo}>
                    <td>{libro.titulo}</td>
                    <td>{libro.autor}</td>
                    <td>{libro.veces}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  )
}

// ---------- App ----------

function App() {
  const [vista, setVista] = useState('inicio')
  const [historial, setHistorial] = useState([])
  const [busqueda, setBusqueda] = useState('')

  const ir = (destino) => {
    if (destino === vista) return
    setHistorial([...historial, vista])
    setVista(destino)
  }

  const volver = () => {
    const anterior = historial[historial.length - 1] ?? 'inicio'
    setHistorial(historial.slice(0, -1))
    setVista(anterior)
  }

  const abrir = (destino) => ({
    onClick: () => ir(destino),
    onKeyDown: (e) => {
      if (e.key === 'Enter') ir(destino)
    },
    role: 'button',
    tabIndex: 0,
  })

  return (
    <div className="app">
      <header>
        <h1>📚 BiblioSur</h1>

        <nav>
          <button
            className={vista === 'inicio' ? 'activo' : ''}
            onClick={() => ir('inicio')}
          >
            Inicio
          </button>
          <button
            className={vista === 'catalogo' ? 'activo' : ''}
            onClick={() => ir('catalogo')}
          >
            Catálogo
          </button>
          <button
            className={vista === 'prestamos' ? 'activo' : ''}
            onClick={() => ir('prestamos')}
          >
            Préstamos
          </button>
          <button
            className={vista === 'usuarios' ? 'activo' : ''}
            onClick={() => ir('usuarios')}
          >
            Usuarios
          </button>
          <button
            className={vista === 'informes' ? 'activo' : ''}
            onClick={() => ir('informes')}
          >
            Informes
          </button>
        </nav>
      </header>

      <main>
        {vista === 'inicio' && (
          <>
            <section className="hero">
              <h2>Sistema Inteligente de Gestión de Biblioteca</h2>
              <p>Administra libros, usuarios y préstamos de forma sencilla.</p>

              <input
                type="text"
                placeholder="🔎 Buscar un libro por título o autor..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') ir('catalogo')
                }}
              />
            </section>

            <section className="cards">
              <div className="card" {...abrir('catalogo')}>
                <span>📖</span>
                <h3>Catálogo</h3>
                <p>Consulta los libros disponibles.</p>
              </div>

              <div className="card" {...abrir('prestamos')}>
                <span>📋</span>
                <h3>Préstamos</h3>
                <p>Controla préstamos y devoluciones.</p>
              </div>

              <div className="card" {...abrir('usuarios')}>
                <span>👥</span>
                <h3>Usuarios</h3>
                <p>Gestiona los usuarios de la biblioteca.</p>
              </div>

              <div className="card" {...abrir('informes')}>
                <span>📊</span>
                <h3>Informes</h3>
                <p>Consulta estadísticas de BiblioSur.</p>
              </div>
            </section>
          </>
        )}

        {vista === 'catalogo' && (
          <Catalogo
            busqueda={busqueda}
            setBusqueda={setBusqueda}
            volver={volver}
          />
        )}
        {vista === 'prestamos' && <Prestamos volver={volver} />}
        {vista === 'usuarios' && <Usuarios volver={volver} />}
        {vista === 'informes' && <Informes volver={volver} />}
      </main>

      <footer>
        <p>© 2026 BiblioSur - Gestión de Biblioteca</p>
      </footer>
    </div>
  )
}

export default App
