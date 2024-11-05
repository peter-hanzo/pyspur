import { useState, useCallback, useEffect, useRef } from 'react';
import { useKeyPress, getConnectedEdges } from '@xyflow/react';
import { useDispatch, useSelector } from 'react-redux';
import { setNodes, setEdges } from '../store/flowSlice';

export function useCopyPaste() {
  const nodes = useSelector((state) => state.flow.nodes);
  const edges = useSelector((state) => state.flow.edges);
  const pasteTimeoutRef = useRef(null);

  // Set up the paste buffers to store the copied nodes and edges
  const [bufferedNodes, setBufferedNodes] = useState([]);
  const [bufferedEdges, setBufferedEdges] = useState([]);

  const dispatch = useDispatch();

  const copy = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected);
    const selectedEdges = getConnectedEdges(selectedNodes, edges).filter(
      (edge) => {
        const isExternalSource = selectedNodes.every(
          (n) => n.id !== edge.source
        );
        const isExternalTarget = selectedNodes.every(
          (n) => n.id !== edge.target
        );

        return !(isExternalSource || isExternalTarget);
      }
    );

    setBufferedNodes(selectedNodes);
    setBufferedEdges(selectedEdges);
  }, [nodes, edges]);

  const cut = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected);
    const selectedEdges = getConnectedEdges(selectedNodes, edges).filter(
      (edge) => {
        const isExternalSource = selectedNodes.every(
          (n) => n.id !== edge.source
        );
        const isExternalTarget = selectedNodes.every(
          (n) => n.id !== edge.target
        );

        return !(isExternalSource || isExternalTarget);
      }
    );

    setBufferedNodes(selectedNodes);
    setBufferedEdges(selectedEdges);

    // A cut action needs to remove the copied nodes and edges from the graph
    const updatedNodes = nodes.filter((node) => !node.selected);
    const updatedEdges = edges.filter((edge) => !selectedEdges.includes(edge));

    dispatch(setNodes({ nodes: updatedNodes }));
    dispatch(setEdges({ edges: updatedEdges }));
  }, [nodes, edges, dispatch]);

  const paste = useCallback(() => {
    if (bufferedNodes.length === 0 || pasteTimeoutRef.current) return;

    // Set a timeout to prevent multiple pastes
    pasteTimeoutRef.current = setTimeout(() => {
      pasteTimeoutRef.current = null;
    }, 300);

    // Calculate offset from the center of the viewport
    const viewportCenter = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };

    const minX = Math.min(...bufferedNodes.map((s) => s.position.x));
    const minY = Math.min(...bufferedNodes.map((s) => s.position.y));

    const now = Date.now();

    const newNodes = bufferedNodes.map((node) => {
      const id = `${node.id}-${now}`;
      const x = viewportCenter.x / 2 + (node.position.x - minX);
      const y = viewportCenter.y / 2 + (node.position.y - minY);

      return { ...node, id, position: { x, y } };
    });

    const newEdges = bufferedEdges.map((edge) => {
      const id = `${edge.id}-${now}`;
      const source = `${edge.source}-${now}`;
      const target = `${edge.target}-${now}`;

      return { ...edge, id, source, target };
    });

    const updatedNodes = [
      ...nodes.map((node) => ({ ...node, selected: false })),
      ...newNodes,
    ];

    const updatedEdges = [
      ...edges.map((edge) => ({ ...edge, selected: false })),
      ...newEdges,
    ];

    dispatch(setNodes({ nodes: updatedNodes }));
    dispatch(setEdges({ edges: updatedEdges }));
  }, [bufferedNodes, bufferedEdges, nodes, edges, dispatch]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (pasteTimeoutRef.current) {
        clearTimeout(pasteTimeoutRef.current);
      }
    };
  }, []);

  useShortcut(['Meta+x', 'Control+x'], cut);
  useShortcut(['Meta+c', 'Control+c'], copy);
  useShortcut(['Meta+v', 'Control+v'], paste);

  return { cut, copy, paste, bufferedNodes, bufferedEdges };
}

function useShortcut(keyCode, callback) {
  const shouldRun = useKeyPress(keyCode);

  useEffect(() => {
    if (shouldRun) {
      callback();
    }
  }, [shouldRun, callback]);
}

export default useCopyPaste;