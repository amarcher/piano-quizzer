import { Link, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { MiloMode } from './modes/MiloMode';
import { AdvancedMode } from './modes/AdvancedMode';
import './App.css';

function Shell() {
  const { pathname } = useLocation();
  const onHome = pathname === '/';
  return (
    <div className="app">
      <header className="app__nav">
        <Link to="/" className="app__brand">
          <span className="app__logo">🎹</span>
          Piano Quizzer
        </Link>
        {!onHome && (
          <nav className="app__modes">
            <NavLink to="/milo" className={({ isActive }) => `app__mode ${isActive ? 'is-on' : ''}`}>
              Milo
            </NavLink>
            <NavLink to="/advanced" className={({ isActive }) => `app__mode ${isActive ? 'is-on' : ''}`}>
              Advanced
            </NavLink>
          </nav>
        )}
      </header>
      <main className="app__main">
        <Outlet />
      </main>
    </div>
  );
}

function Home() {
  return (
    <div className="home">
      <h1 className="home__title">Let's learn some music.</h1>
      <p className="home__sub">
        Flashcards, scale drills, and ear training for piano —
        tuned for one small learner and one grown-up learner.
      </p>
      <div className="home__cards">
        <Link to="/milo" className="home__card home__card--milo">
          <span className="home__emoji">🐣</span>
          <h2>Milo</h2>
          <p>Learn the letters on the staff, note lengths, and what <em>forte</em> means.</p>
          <span className="home__go">Start →</span>
        </Link>
        <Link to="/advanced" className="home__card home__card--adv">
          <span className="home__emoji">🎼</span>
          <h2>Advanced</h2>
          <p>Read any key at a glance. Scales, fingerings, and ear training.</p>
          <span className="home__go">Start →</span>
        </Link>
      </div>
      <footer className="home__foot">
        Tip: plug in a MIDI keyboard and the app will listen for your notes.
      </footer>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        <Route path="/milo" element={<MiloMode />} />
        <Route path="/advanced" element={<AdvancedMode />} />
      </Route>
    </Routes>
  );
}
