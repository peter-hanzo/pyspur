import React from 'react';
import FlowCanvas from '../components/canvas/FlowCanvas';
import Header from '../components/Header'; // Import the Header component
import Dashboard from '../components/Home';

const Home = () => {
  return (
    <div className="App relative">
      <Header activePage="home" />
      <Dashboard />
      {/* <FlowCanvas /> */}
    </div>
  );
};

export default Home;