"use client";

import type { CardProps } from "@nextui-org/react";
import React from "react";
import { Card, Tabs, Tab, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, useDisclosure } from "@nextui-org/react";
import { Icon } from "@iconify/react";

import APIKeys from "./api-keys";
import AdvancedSettings from "./advanced";

export default function SettingsCard(props: CardProps) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  return (
    <>
      {/* Button to open the modal */}
      <Button onPress={onOpen} variant="light" isIconOnly>
        <Icon className="text-default-500" icon="solar:settings-linear" width={24} />
      </Button>

      {/* Modal containing the settings */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Settings</ModalHeader>
              <ModalBody>
                <Card {...props}>
                  <Tabs
                    classNames={{
                      tabList: "mx-4 mt-6 text-medium",
                      tabContent: "text-small",
                    }}
                    size="lg"
                  >
                    <Tab
                      key="api-keys"
                      textValue="API Keys"
                      title={
                        <div className="flex items-center gap-1.5">
                          <Icon icon="solar:user-id-bold" width={20} />
                          <p>API Keys</p>
                        </div>
                      }
                    >
                      <APIKeys className="p-2 shadow-none" />
                    </Tab>
                    <Tab
                      key="advanced-settings"
                      textValue="Advanced Settings"
                      title={
                        <div className="flex items-center gap-1.5">
                          <Icon icon="solar:shield-keyhole-bold" width={20} />
                          <p>Advanced</p>
                        </div>
                      }
                    >
                      <AdvancedSettings className="p-2 shadow-none" />
                    </Tab>
                  </Tabs>
                </Card>
              </ModalBody>
              <ModalFooter><Button radius="full" variant="bordered">
                Cancel
              </Button>
                <Button color="primary" radius="full">
                  Save
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
