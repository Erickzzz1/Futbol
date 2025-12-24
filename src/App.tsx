import React, { useState } from 'react'
import { Dashboard } from './components/Dashboard'
import { Admin } from './components/Admin'

function App(): JSX.Element {
    const [view, setView] = useState('dashboard');
    return (
        <div>
            <button
                className="fixed top-2 right-2 p-2 bg-gray-800 text-white rounded opacity-50 hover:opacity-100 z-50 text-xs shadow-lg"
                onClick={() => setView(view === 'dashboard' ? 'admin' : 'dashboard')}
            >
                {view === 'dashboard' ? 'Admin Panel' : 'Back to Dashboard'}
            </button>
            {view === 'dashboard' ? <Dashboard /> : <Admin />}
        </div>
    )
}

export default App
