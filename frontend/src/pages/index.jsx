import React, { useEffect } from 'react';
import Header from '../components/Header'; // Import the Header component
import { useDispatch } from 'react-redux';
import Dashboard from '../components/Dashboard';
import { fetchNodeTypes } from '../store/nodeTypesSlice';

const Home = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchNodeTypes());
  }, []);

  return (
    <div className="App relative">
      <Header activePage="home" />
      <Dashboard />
    </div>
  );
};

export default Home;