"use client";

import type { CardProps } from "@nextui-org/react";
import React from "react";
import { Card, Tabs, Tab, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, useDisclosure } from "@nextui-org/react";
import { Icon } from "@iconify/react";

import AccountDetails from "./account-details";
import NotificationsSettings from "./notifications-settings";
import SecuritySettings from "./security-settings";

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
                      key="account-settings"
                      textValue="Account Settings"
                      title={
                        <div className="flex items-center gap-1.5">
                          <Icon icon="solar:user-id-bold" width={20} />
                          <p>Account</p>
                        </div>
                      }
                    >
                      <AccountDetails className="p-2 shadow-none" />
                    </Tab>
                    <Tab
                      key="notifications-settings"
                      textValue="Notification Settings"
                      title={
                        <div className="flex items-center gap-1.5">
                          <Icon icon="solar:bell-bold" width={20} />
                          <p>Notifications</p>
                        </div>
                      }
                    >
                      <NotificationsSettings className="p-2 shadow-none" />
                    </Tab>
                    <Tab
                      key="security-settings"
                      textValue="Security Settings"
                      title={
                        <div className="flex items-center gap-1.5">
                          <Icon icon="solar:shield-keyhole-bold" width={20} />
                          <p>Security</p>
                        </div>
                      }
                    >
                      <SecuritySettings className="p-2 shadow-none" />
                    </Tab>
                  </Tabs>
                </Card>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
