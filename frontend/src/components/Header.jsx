import React from 'react';
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
import { Button } from '@nextui-org/react'; // Import NextUI Button component
import { RiPlayFill, RiShareFill, RiUploadCloud2Line } from '@remixicon/react'; // Import icons

const Header = () => {
  return (
    <Navbar isBordered>
      <NavbarContent justify="start">

        <NavbarBrand>
          <p className="font-bold text-inherit">PySpur</p> {/* Placeholder text */}
        </NavbarBrand>
      </NavbarContent>
      <NavbarContent className="hidden sm:flex" justify="center">
        {/* Highlighted Project Title */}
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
        {/* Add Toolbar buttons */}

        {/* Existing Avatar Dropdown */}
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
          <Button auto flat css={{ marginRight: '20px' }}>
            <RiPlayFill />
            Run
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