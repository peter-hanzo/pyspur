import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Input,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Link,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@nextui-org/react";
import { Icon } from "@iconify/react";
import { runWorkflow, getRunStatus, startRun } from '../utils/api'; // Ensure getRunStatus is imported
import SettingsCard from './settings/Settings';
import { setProjectName, clearCanvas, updateNodeData } from '../store/flowSlice'; // Ensure updateNodeData is imported

const Header = ({ activePage }) => {
  const dispatch = useDispatch();
  const nodes = useSelector((state) => state.flow.nodes);
  const edges = useSelector((state) => state.flow.edges);
  const projectName = useSelector((state) => state.flow.projectName);
  const [isRunning, setIsRunning] = useState(false);

  const updateWorkflowStatus = async (runID) => {
    const checkStatusInterval = setInterval(async () => {
      try {
        const statusResponse = await getRunStatus(runID);
        const outputs = statusResponse.outputs;
        console.log('Status Response:', statusResponse);

        // Update nodes based on outputs
        for (const [nodeId, nodeStatus] of Object.entries(outputs)) {
          dispatch(updateNodeData({
            id: nodeId,
            data: { run: nodeStatus.output }
          }));
        }
        if (statusResponse.status !== 'RUNNING') {
          setIsRunning(false);
          clearInterval(checkStatusInterval);
        }
      } catch (error) {
        console.error('Error fetching workflow status:', error);
        clearInterval(checkStatusInterval);
      }
    }, 10000);
  };

  const handleRunWorkflow = async () => {
    try {
      // Extract workflowID from the URL
      const url = new URL(window.location.href);
      const pathSegments = url.pathname.split('/');
      const workflowID = pathSegments[pathSegments.indexOf('workflows') + 1];

      // Start the run using the workflowID
      const result = await startRun(workflowID);
      console.log('Start Run result:', result);

      // Start the status updater function using the returned runID
      setIsRunning(true);
      updateWorkflowStatus(result.id);

    } catch (error) {
      console.error('Error starting workflow run:', error);
    }
  };

  const handleProjectNameChange = (e) => {
    dispatch(setProjectName(e.target.value));
  };

  const handleClearCanvas = () => {
    if (window.confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
      dispatch(clearCanvas());
    }
  };

  return (
    <>
      <Navbar
        classNames={{
          base: "lg:bg-background lg:backdrop-filter-none",
          item: "data-[active=true]:text-primary",
          wrapper: "px-4 sm:px-6",
        }}
        height="60px"
      >
        <NavbarBrand>
          {activePage === "home" ? (
            <p className="font-bold text-inherit cursor-pointer">PySpur</p>
          ) : (
            <Link href="/" className="cursor-pointer">
              <p className="font-bold text-inherit">PySpur</p>
            </Link>
          )}
        </NavbarBrand>

        {activePage === "workflow" && (
          <NavbarContent
            className="ml-4 hidden h-12 w-full max-w-fit gap-4 rounded-full bg-content2 px-4 dark:bg-content1 sm:flex"
            justify="center"
          >
            <Input
              type="text"
              placeholder="Project Name"
              className="w-full"
              value={projectName}
              onChange={handleProjectNameChange}
            />
          </NavbarContent>
        )}
        <NavbarContent
          className="ml-4 hidden h-12 w-full max-w-fit gap-4 rounded-full bg-content2 px-4 dark:bg-content1 sm:flex"
          justify="start"
        >
          <NavbarItem isActive={activePage === "home"}>
            <Link className="flex gap-2 text-inherit" href="/">
              Home
            </Link>
          </NavbarItem>
          <NavbarItem isActive={activePage === "workflow"}>
            <Link aria-current="page" className="flex gap-2 text-inherit" href="/workflow">
              Editor
            </Link>
          </NavbarItem>
        </NavbarContent>
        {activePage === "workflow" && (
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
              <Button isIconOnly radius="full" variant="light" onClick={handleClearCanvas}>
                <Icon className="text-default-500" icon="solar:trash-bin-trash-linear" width={22} />
              </Button>
            </NavbarItem>
            <NavbarItem className="hidden sm:flex">
              <Dropdown>
                <DropdownTrigger>
                  <Button isIconOnly radius="full" variant="light">
                    <Icon className="text-default-500" icon="solar:download-linear" width={24} />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="Export Options">
                  <DropdownItem
                    key="export-json"
                    startContent={<Icon className="text-xl text-default-500 pointer-events-none flex-shrink-0" icon="carbon:json" />}
                  >
                    Export JSON
                  </DropdownItem>
                  <DropdownItem
                    key="export-code"
                    startContent={<Icon className="text-xl text-default-500 pointer-events-none flex-shrink-0" icon="carbon:code" />}
                  >
                    Export Code
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </NavbarItem>
            <NavbarItem className="hidden sm:flex">
              {/* Directly render the SettingsCard component */}
              <SettingsCard />
            </NavbarItem>
          </NavbarContent>
        )}
      </Navbar>
    </>
  );
};

export default Header;