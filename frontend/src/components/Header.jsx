import React from 'react';
import { useSelector } from 'react-redux'; // Import useSelector to access Redux state
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Link,
  DropdownItem,
  DropdownTrigger,
  Dropdown,
  DropdownMenu,
  Input
} from "@nextui-org/react";
import { Button } from '@nextui-org/react';
import { RiPlayFill, RiShareFill, RiUploadCloud2Line } from '@remixicon/react';
import { runWorkflow, getNodeTypes } from '../utils/api';

const Header = () => {
  // Access nodes and edges from Redux state
  const nodes = useSelector((state) => state.flow.nodes);
  const edges = useSelector((state) => state.flow.edges);

  const handleRunWorkflow = async () => {
    try {
      const formattedData = {
        workflow: {
          nodes: nodes.map(node => ({
            config: node.data?.config || {},
            id: node.id,
            node_type: node.type
          })), // Pass only the first half of the nodes array with selected attributes
          links: edges.map(edge => ({
            source_id: edge.source,
            source_output_key: edge.sourceHandle,
            target_id: edge.target,
            target_input_key: edge.targetHandle
          }))
        },
        initial_inputs: {
          "1": {
            "user_message": "okay, give it to me", "city": "Jabalpur"
          },
          // "2": {},
          // "3": {
          //   "user_message": "please enlighten me", "city": "Jabalpur", "units": "celsius"
          // },
          // "4": { "user_message": "Why do politicians and actors not like to ride shotgun?" },
          // "5": { "user_message": "Complete this joke like Jimmy Carr: Why do politicians and actors not like to ride shotgun?" }
        }
      };


      // console.log('Data passed to API:', formattedData);
      // const nodeTypes = await getNodeTypes();
      // console.log('Node types:', nodeTypes);
      const result = await runWorkflow(formattedData);
      console.log('Workflow result:', result);
      // Handle the result as needed (e.g., update state, show a notification)
    } catch (error) {
      console.error('Error running workflow:', error);
      // Handle the error (e.g., show an error message to the user)
    }
  };

  return (
    <Navbar isBordered>
      <NavbarContent justify="start">
        <NavbarBrand>
          <p className="font-bold text-inherit">PySpur</p>
        </NavbarBrand>
      </NavbarContent>
      <NavbarContent className="hidden sm:flex" justify="center">
        <NavbarItem>
          <Input
            defaultValue="Paper Summarizer"
            color="primary"
            type="text"
            radius="lg"
          />
        </NavbarItem>
      </NavbarContent>


      <NavbarContent justify="end">
        <NavbarItem>
          <Button auto flat css={{ marginRight: '20px' }} onClick={handleRunWorkflow}>
            <RiPlayFill />
            Run Test
          </Button>
          <Button auto flat>
            <RiShareFill />
            Share
          </Button>
          <Button auto flat>
            <RiUploadCloud2Line />
            Publish
          </Button>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
};

export default Header;
