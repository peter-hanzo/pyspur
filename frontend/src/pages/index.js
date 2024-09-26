import React from 'react';
import FlowCanvas from '../components/canvas';
import TextEditor from '../components/textEditor';
import Table from '../components/table';

const Home = () => {
  return (
    <div className="App">
      <FlowCanvas />
      <TextEditor />
      <Table />
    </div>
  );
};

export default Home;