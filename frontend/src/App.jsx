import { useEffect, useState } from 'react'
import './App.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

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

// HU01 (consultar catálogo) y HU02 (buscar por título)
function Catalogo({ busqueda, setBusqueda }) {
  const [libros, setLibros] = useState([])
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

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
  }, [busqueda])

  return (
    <section className="panel">
      <h2>📖 Catálogo</h2>
      <input
        type="text"
        placeholder="🔎 Buscar por título..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />
      {error && <p className="aviso error">{error}</p>}
      {cargando && <p>Cargando...</p>}
      {!cargando && !error && libros.length === 0 && (
        <p>No se encontraron libros con ese título.</p>
      )}
      {libros.length > 0 && (
        <table className="tabla">
          <thead>
            <tr>
              <th>Título</th>
              <th>Autor</th>
              <th>Categoría</th>
              <th>Disponibilidad</th>
            </tr>
          </thead>
          <tbody>
            {libros.map((libro) => (
              <tr key={libro.id}>
                <td>{libro.titulo}</td>
                <td>{libro.autor}</td>
                <td>{libro.categoria}</td>
                <td>
                  <span className="etiqueta">
                    {libro.disponible
                      ? `Disponible (${libro.stock})`
                      : 'No disponible'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

// HU03: registrar un préstamo
function Prestamos() {
  const [usuarios, setUsuarios] = useState([])
  const [libros, setLibros] = useState([])
  const [prestamos, setPrestamos] = useState([])
  const [usuarioId, setUsuarioId] = useState('')
  const [libroId, setLibroId] = useState('')
  const [mensaje, setMensaje] = useState(null)

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

  const registrar = async (evento) => {
    evento.preventDefault()
    setMensaje(null)
    try {
      const nuevo = await pedir('/api/prestamos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuarioId: Number(usuarioId),
          libroId: Number(libroId),
        }),
      })
      setMensaje({
        tipo: 'ok',
        texto: `Préstamo registrado: "${nuevo.libro.titulo}" para ${nuevo.usuario.nombre}.`,
      })
      setLibroId('')
      await cargar()
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message })
    }
  }

  return (
    <section className="panel">
      <h2>📋 Préstamos</h2>

      <form onSubmit={registrar}>
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

        <label>Libro</label>
        <select value={libroId} onChange={(e) => setLibroId(e.target.value)}>
          <option value="" disabled>
            Selecciona un libro
          </option>
          {libros.map((libro) => (
            <option key={libro.id} value={libro.id} disabled={!libro.disponible}>
              {libro.titulo} —{' '}
              {libro.disponible
                ? `${libro.stock} disponibles`
                : 'No disponible'}
            </option>
          ))}
        </select>

        <button type="submit" disabled={!usuarioId || !libroId}>
          Registrar préstamo
        </button>
      </form>

      {mensaje && <p className={`aviso ${mensaje.tipo}`}>{mensaje.texto}</p>}

      <h3>Préstamos registrados</h3>
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
            </tr>
          </thead>
          <tbody>
            {prestamos.map((prestamo) => (
              <tr key={prestamo.id}>
                <td>{prestamo.usuario.nombre}</td>
                <td>{prestamo.libro.titulo}</td>
                <td>
                  {new Date(prestamo.fechaLimite).toLocaleDateString('es-BO')}
                </td>
                <td>
                  <span className="etiqueta">{prestamo.estado}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    pedir('/api/usuarios')
      .then(setUsuarios)
      .catch((e) => setError(e.message))
  }, [])

  return (
    <section className="panel">
      <h2>👥 Usuarios</h2>
      {error && <p className="aviso error">{error}</p>}
      {usuarios.length > 0 && (
        <table className="tabla">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
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
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function Informes() {
  return (
    <section className="panel">
      <h2>📊 Informes</h2>
      <p className="aviso">
        Este módulo aún no tiene historia de usuario asignada. Se implementará
        en un próximo sprint.
      </p>
    </section>
  )
}

function App() {
  const [vista, setVista] = useState('inicio')
  const [busqueda, setBusqueda] = useState('')

  const abrir = (destino) => ({
    onClick: () => setVista(destino),
    onKeyDown: (e) => {
      if (e.key === 'Enter') setVista(destino)
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
            onClick={() => setVista('inicio')}
          >
            Inicio
          </button>
          <button
            className={vista === 'catalogo' ? 'activo' : ''}
            onClick={() => setVista('catalogo')}
          >
            Catálogo
          </button>
          <button
            className={vista === 'prestamos' ? 'activo' : ''}
            onClick={() => setVista('prestamos')}
          >
            Préstamos
          </button>
          <button
            className={vista === 'usuarios' ? 'activo' : ''}
            onClick={() => setVista('usuarios')}
          >
            Usuarios
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
                placeholder="🔎 Buscar un libro..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setVista('catalogo')
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
          <Catalogo busqueda={busqueda} setBusqueda={setBusqueda} />
        )}
        {vista === 'prestamos' && <Prestamos />}
        {vista === 'usuarios' && <Usuarios />}
        {vista === 'informes' && <Informes />}
      </main>

      <footer>
        <p>© 2026 BiblioSur - Gestión de Biblioteca</p>
      </footer>
    </div>
  )
}

export default App
