import { useEffect, useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { addNode } from '../store/flowSlice';
import { createNode } from '../components/nodes/nodeFactory'; // Import createNode

export const useKeyboardShortcuts = (selectedNodeID, nodes, dispatch) => {
  const [copiedNode, setCopiedNode] = useState(null); // State to store the copied node

  const handleKeyDown = useCallback(
    (event) => {
      if (event.metaKey || event.ctrlKey) {
        switch (event.key) {
          case 'c': // CMD + C or CTRL + C
            if (selectedNodeID) {
              const nodeToCopy = nodes.find((node) => node.id === selectedNodeID);
              if (nodeToCopy) {
                setCopiedNode(nodeToCopy);
              }
            }
            break;
          case 'v': // CMD + V or CTRL + V
            if (copiedNode) {
              const newNode = createNode(
                copiedNode.type, // Use the type from the copied node
                uuidv4(),        // Generate a new unique ID for the pasted node
                {
                  x: copiedNode.position.x + 50, // Offset the position slightly
                  y: copiedNode.position.y + 50,
                },
                copiedNode.data  // Pass the copied node's data as additionalData
              );
              dispatch(addNode({ node: newNode })); // Dispatch action to add the new node
            }
            break;
          default:
            break;
        }
      }
    },
    [selectedNodeID, copiedNode, nodes, dispatch]
  );

  useEffect(() => {
    // Add event listener for keydown
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return { copiedNode, setCopiedNode };
};
