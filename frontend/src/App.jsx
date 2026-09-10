import './App.css'

function App() {
  return (
    <div className="app">
      <header>
        <h1>📚 BiblioSur</h1>

        <nav>
          <button>Inicio</button>
          <button>Catálogo</button>
          <button>Préstamos</button>
          <button>Usuarios</button>
        </nav>
      </header>

      <main>
        <section className="hero">
          <h2>Sistema Inteligente de Gestión de Biblioteca</h2>
          <p>Administra libros, usuarios y préstamos de forma sencilla.</p>

          <input
            type="text"
            placeholder="🔎 Buscar un libro..."
          />
        </section>

        <section className="cards">
          <div className="card">
            <span>📖</span>
            <h3>Catálogo</h3>
            <p>Consulta los libros disponibles.</p>
          </div>

          <div className="card">
            <span>📋</span>
            <h3>Préstamos</h3>
            <p>Controla préstamos y devoluciones.</p>
          </div>

          <div className="card">
            <span>👥</span>
            <h3>Usuarios</h3>
            <p>Gestiona los usuarios de la biblioteca.</p>
          </div>

          <div className="card">
            <span>📊</span>
            <h3>Informes</h3>
            <p>Consulta estadísticas de BiblioSur.</p>
          </div>
        </section>
      </main>

      <footer>
        <p>© 2026 BiblioSur - Gestión de Biblioteca</p>
      </footer>
    </div>
  )
}

export default App