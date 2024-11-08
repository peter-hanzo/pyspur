// frontend/src/components/Header.jsx
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
import SettingsCard from './settings/Settings';
import useWorkflow from '../hooks/useWorkflow';

const Header = ({ activePage }) => {
    const {
        handleRunWorkflow,
        handleDownloadWorkflow,
        handleClearCanvas,
        handleProjectNameChange
    } = useWorkflow();

    const projectName = useSelector((state) => state.flow.projectName);

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
                            <Button isIconOnly radius="full" variant="light" onClick={handleClearCanvas}>
                                <Icon className="text-default-500" icon="solar:trash-bin-trash-linear" width={22} />
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
        </>
    );
};

export default Header;