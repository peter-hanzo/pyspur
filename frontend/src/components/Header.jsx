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
  Input
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


      <NavbarContent justify="end">

        <NavbarItem>
          <Button auto flat>
            <RiPlayFill />
            Run
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