"use client";

import type { CardProps } from "@nextui-org/react";

import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  CardFooter,
} from "@nextui-org/react";

const apiProviders = {
  openai: "OpenAI API Key",
  azure: "Azure API Key",
  anthropic: "Anthropic API Key",
  cohere: "Cohere API Key",
  huggingface: "HuggingFace API Key",
  google: "Google AI API Key",
  together: "Together API Key",
};

export default function Component(props: CardProps) {
  const [apiKeys, setApiKeys] = useState(
    Object.keys(apiProviders).reduce((acc, key) => {
      acc[key] = "";
      return acc;
    }, {} as Record<string, string>)
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setApiKeys({ ...apiKeys, [name]: value });
  };

  const saveApiKeys = () => {
    // Implement save logic here, e.g., localStorage or API call
    console.log("API Keys saved:", apiKeys);
  };

  return (
    <Card className="max-w-xl p-2" {...props}>
      <CardBody className="grid grid-cols-1 gap-4">
        {Object.entries(apiProviders).map(([key, label]) => (
          <Input
            key={key}
            label={label}
            labelPlacement="outside"
            placeholder={`Enter ${label}`}
            name={key}
            value={apiKeys[key]}
            onChange={handleInputChange}
          />
        ))}
      </CardBody>
    </Card>
  );
}
