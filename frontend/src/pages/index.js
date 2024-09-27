import React from 'react';
import FlowCanvas from '../components/canvas/FlowCanvas';
import TextEditor from '../components/textEditor/TextEditor';
// import Table from '../components/table';
import Header from '../components/Header'; // Import the Header component

const Home = () => {
  return (
    <div className="App pt-16 relative">
      <Header />
      <FlowCanvas />
      <TextEditor />
      {/* <Table /> */}
    </div>
  );
};

export default Home;