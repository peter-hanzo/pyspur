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
  Avatar, Input
} from "@nextui-org/react";
import { Button } from '@nextui-org/react';
import { RiPlayFill, RiShareFill, RiUploadCloud2Line } from '@remixicon/react';
import { runWorkflow } from '../utils/api';

const Header = () => {
  // Access nodes and edges from Redux state
  const nodes = useSelector((state) => state.flow.nodes);
  const edges = useSelector((state) => state.flow.edges);

  const handleRunWorkflow = async () => {
    try {
      const formattedData = {
        workflow: {
          nodes: nodes.slice(0, Math.ceil(nodes.length / 2)).map(node => ({
            config: node.data?.config || {},
            id: node.id,
            type: node.type
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
            "user_message": "okay, give it to me", "city": "Jabalpur", "units": "celsius"
          }}
      };

      console.log('Data passed to API:', formattedData);
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

      <NavbarContent>
        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <Avatar
              isBordered
              as="button"
              className="transition-transform"
              color="secondary"
              name="Jason Hughes"
              size="sm"
              src="https://i.pravatar.cc/150?u=a042581f4e29026704d"
            />
          </DropdownTrigger>
          <DropdownMenu aria-label="Profile Actions" variant="flat">
            <DropdownItem key="profile" className="h-14 gap-2">
              <p className="font-semibold">Signed in as</p>
              <p className="font-semibold">zoey@example.com</p>
            </DropdownItem>
            <DropdownItem key="settings">My Settings</DropdownItem>
            <DropdownItem key="team_settings">Team Settings</DropdownItem>
            <DropdownItem key="analytics">Analytics</DropdownItem>
            <DropdownItem key="system">System</DropdownItem>
            <DropdownItem key="configurations">Configurations</DropdownItem>
            <DropdownItem key="help_and_feedback">Help & Feedback</DropdownItem>
            <DropdownItem key="logout" color="danger">
              Log Out
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </NavbarContent>

      <NavbarContent justify="end">
        <NavbarItem>
          <Button auto flat css={{ marginRight: '20px' }} onClick={handleRunWorkflow}>
            <RiPlayFill />
            Run Test
          </Button>
          <Button auto flat css={{ marginRight: '20px' }}>
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
