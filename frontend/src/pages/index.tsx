import React, { useEffect } from 'react';
import Header from '../components/Header';
import { useDispatch } from 'react-redux';
import Dashboard from '../components/Dashboard';
import { fetchNodeTypes } from '../store/nodeTypesSlice';
import { AppDispatch } from '../store/store';

const Home: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(fetchNodeTypes());
  }, [dispatch]);

  return (
    <div className="App relative">
      <Header activePage="home" />
      <Dashboard />
    </div>
  );
};

export default Home;