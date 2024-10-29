import React from 'react';
import { useSelector } from 'react-redux';
import {
  Input,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Link,
  Button,
} from "@nextui-org/react";
import { Icon } from "@iconify/react";
import { runWorkflow } from '../utils/api';
import SettingsCard from './settings/Settings'; // Import the updated SettingsCard component

const Header = () => {
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
          })),
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
          }
        }
      };

      const result = await runWorkflow(formattedData);
      console.log('Workflow result:', result);
    } catch (error) {
      console.error('Error running workflow:', error);
    }
  };

  return (
    <>
      <Navbar
        classNames={{
          base: "lg:bg-transparent lg:backdrop-filter-none",
          item: "data-[active=true]:text-primary",
          wrapper: "px-4 sm:px-6",
        }}
        height="60px"
      >
        <NavbarBrand>
          <p className="font-bold text-inherit">PySpur</p>
        </NavbarBrand>

        {/* New NavbarContent for project title input */}
        <NavbarContent
          className="ml-4 hidden h-12 w-full max-w-fit gap-4 rounded-full bg-content2 px-4 dark:bg-content1 sm:flex"
          justify="start"
        >
          <Input
            type="text"
            placeholder="Project Name"
            className="w-full"
          />
        </NavbarContent>

        <NavbarContent
          className="ml-4 hidden h-12 w-full max-w-fit gap-4 rounded-full bg-content2 px-4 dark:bg-content1 sm:flex"
          justify="start"
        >
          <NavbarItem isActive>
            <Link className="flex gap-2 text-inherit" href="#">
              Canvas
            </Link>
          </NavbarItem>
          <NavbarItem >
            <Link aria-current="page" className="flex gap-2 text-inherit" href="#">
              Batch Mode
            </Link>
          </NavbarItem>
        </NavbarContent>

        <NavbarContent
          className="ml-auto flex h-12 max-w-fit items-center gap-0 rounded-full p-0 lg:bg-content2 lg:px-1 lg:dark:bg-content1"
          justify="end"
        >
          <NavbarItem className="hidden sm:flex">
            <Button isIconOnly radius="full" variant="light" onClick={handleRunWorkflow}>
              <Icon className="text-default-500" icon="solar:play-linear" width={22} />
            </Button>
          </NavbarItem>
          <NavbarItem className="hidden sm:flex">
            <Button isIconOnly radius="full" variant="light">
              <Icon className="text-default-500" icon="solar:download-linear" width={24} />
            </Button>
          </NavbarItem>
          <NavbarItem className="hidden sm:flex">
            {/* Directly render the SettingsCard component */}
            <SettingsCard />
          </NavbarItem>
        </NavbarContent>
      </Navbar>
    </>
  );
};

export default Header;
