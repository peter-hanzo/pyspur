import { Provider } from 'react-redux';
import store from './store/store';

function App() {
  return (
    <Provider store={store}>
      {/* ... existing components ... */}
    </Provider>
  );
}

export default App;