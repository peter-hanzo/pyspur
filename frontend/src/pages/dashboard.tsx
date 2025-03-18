import React from 'react'

import Dashboard from '../components/Dashboard'
import Header from '../components/Header'

const DashboardPage: React.FC = () => {
    return (
        <div className="App relative">
            <Header activePage="dashboard" />
            <Dashboard />
        </div>
    )
}

export default DashboardPage
