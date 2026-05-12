import React, { useState } from 'react'
import Dashboard from './components/Dashboard'
import AdminUpload from './components/AdminUpload'
import './index.css'

function App() {
  const [projectData, setProjectData] = useState(null);

  if (!projectData) {
    return <AdminUpload onDataParsed={(data) => setProjectData(data)} />
  }

  return (
    <Dashboard data={projectData} />
  )
}

export default App
