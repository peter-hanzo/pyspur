import React from 'react';
import FlowCanvas from '../components/canvas/FlowCanvas';
import Header from '../components/Header'; // Import the Header component

const Home = () => {
  return (
    <div className="App relative">
      <Header activePage="canvas" /> {/* Pass 'canvas' as the active page */}
      <FlowCanvas />
    </div>
  );
};

export default Home;