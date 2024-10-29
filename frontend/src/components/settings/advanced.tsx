"use client";

import type { CardProps } from "@nextui-org/react";

import React from "react";
import { Card, CardBody } from "@nextui-org/react";

import SwitchCell from "./switch-cell";

export default function Component(props: CardProps) {
  return (
    <Card className="w-full max-w-lg p-2" {...props}>
      <CardBody className="space-y-2">
        {/* Two-Factor Authentication */}
        <SwitchCell
          defaultSelected
          description="Add an extra layer of security to your account."
          label="Two-Factor Authentication"
        />
        {/* Password Reset Protection */}
        <SwitchCell
          description="Require additional information to reset your password."
          label="Password Reset Protection"
        />
        {/* Require Pin */}
        <SwitchCell
          defaultSelected
          description="Require a pin to access your account."
          label="Require Pin"
        />

      </CardBody>
    </Card>
  );
}
