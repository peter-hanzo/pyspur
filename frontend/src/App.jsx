import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { fetchNodeTypes } from './store/nodeTypesSlice';

const App = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchNodeTypes());
  }, [dispatch]);

  return (
    <Home />
  );
}

export default App;