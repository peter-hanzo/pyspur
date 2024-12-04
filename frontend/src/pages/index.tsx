import React, { useEffect } from 'react';
import Header from '../components/Header';
import Dashboard from '../components/Dashboard';
import { fetchNodeTypes } from '../store/nodeTypesSlice';
import { useAppDispatch } from '../store/hooks';

const Home: React.FC = () => {
  const dispatch = useAppDispatch();

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