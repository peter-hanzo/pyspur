import { useSelector } from 'react-redux';

function Comment({ nodeId }) {
  // Access node data
  const node = useSelector((state) => state.nodes.find((n) => n.id === nodeId));

  // ... use node data as needed ...
}

export default Comment;
