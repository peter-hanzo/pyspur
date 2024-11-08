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
} from "@nextui-org/react";
import { Icon } from "@iconify/react";
import SettingsCard from './settings/Settings';
import { setProjectName, clearCanvas, updateNodeData } from '../store/flowSlice'; // Ensure updateNodeData is imported
import DebugModal from './DebugModal';

const Header = ({ activePage }) => {
    const dispatch = useDispatch();
    const nodes = useSelector((state) => state.flow.nodes);
    const edges = useSelector((state) => state.flow.edges);
    const projectName = useSelector((state) => state.flow.projectName);
    const [isRunning, setIsRunning] = useState(false);
    const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);

    const updateWorkflowStatus = async (runID) => {
        const checkStatusInterval = setInterval(async () => {
            try {
                const statusResponse = await getRunStatus(runID);
                const outputs = statusResponse.outputs;
                console.log('Status Response:', statusResponse);

                // Update nodes based on outputs
                if (outputs) {
                    Object.entries(outputs).forEach(([nodeId, data]) => {
                        const node = nodes.find((node) => node.id === nodeId);
                        if (data) {
                            dispatch(updateNodeData({ id: nodeId, data: { run: { ...node.data.run, data } } }));
                        }
                    });
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

    const workflowID = useSelector((state) => state.flow.workflowID);

    const inputNodeValues = useSelector((state) => state.flow.inputNodeValues);

    const executeWorkflow = async (inputValues) => {
        try {
            const result = await startRun(workflowID, inputValues, null, 'interactive');
            setIsRunning(true);
            updateWorkflowStatus(result.id);
        } catch (error) {
            console.error('Error starting workflow run:', error);
        }
    };

    const handleRunWorkflow = async () => {
        setIsDebugModalOpen(true);
    };

    const handleProjectNameChange = (e) => {
        dispatch(setProjectName(e.target.value));
    };

    const handleDownloadWorkflow = async () => {
        try {
            // Get the current workflow using the workflowID from Redux state
            const workflow = await getWorkflow(workflowID);

            // Create a JSON blob from the workflow data
            const blob = new Blob([JSON.stringify(workflow, null, 2)], {
                type: 'application/json'
            });

            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${projectName.replace(/\s+/g, '_')}.json`; // Use project name for the file

            // Trigger download
            document.body.appendChild(a);
            a.click();

            // Cleanup
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading workflow:', error);
            // You might want to add some user feedback here
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
                    {activePage !== "home" && (
                        <NavbarItem isActive={activePage === "workflow"}>
                            Editor
                        </NavbarItem>
                    )}
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
                            <Button
                                isIconOnly
                                radius="full"
                                variant="light"
                                onClick={handleDownloadWorkflow}
                            >
                                <Icon
                                    className="text-default-500"
                                    icon="solar:download-linear"
                                    width={24}
                                />
                            </Button>
                        </NavbarItem>
                        <NavbarItem className="hidden sm:flex">
                            <SettingsCard />
                        </NavbarItem>
                    </NavbarContent>
                )}
            </Navbar>
            <DebugModal
                isOpen={isDebugModalOpen}
                onOpenChange={setIsDebugModalOpen}
                onRun={async (selectedInputs) => {
                    await executeWorkflow(selectedInputs);
                    setIsDebugModalOpen(false);
                }}
            />
        </>
    );
};

export default Header;