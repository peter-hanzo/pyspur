import React from 'react';
import FlowCanvas from '../components/canvas/FlowCanvas';
import Header from '../components/Header'; // Import the Header component
import BatchMode from '../components/Home';

const Home = () => {
  return (
    <div className="App relative">
      <Header activePage="home" />
      <BatchMode />
      {/* <FlowCanvas /> */}
    </div>
  );
};

export default Home;