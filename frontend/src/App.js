import { Provider } from 'react-redux';
import store from './store/store';
import Editor from './components/textEditor/Editor';

function App() {
  return (
    <Provider store={store}>
      {/* ... existing components ... */}
      <Editor />
    </Provider>
  );
}

export default App;