import React from 'react';
import Header from '../components/Header'; // Import the Header component
import Dashboard from '../components/Dashboard';

const Home = () => {
  return (
    <div className="App relative">
      <Header activePage="home" />
      <Dashboard />
    </div>
  );
};

export default Home;