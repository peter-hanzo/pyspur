import React from "react";
import { Card, CardBody, CardFooter, Button } from "@nextui-org/react";
import { Icon } from "@iconify/react";

export default function TemplateCard({ title, description, features, onUse }) {
  return (
    <Card className="relative w-full max-w-[300px]">
      <CardBody className="relative min-h-[200px] bg-gradient-to-br from-content1 to-default-100/50 p-8">
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-default-500 text-sm mb-4">{description}</p>
        <ul>
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-1 mb-1">
              <Icon className="text-default-600" icon="ci:check" width={20} />
              <p className="text-small text-default-500">{feature}</p>
            </li>
          ))}
        </ul>
      </CardBody>
      <CardFooter className="border-t-1 border-default-100 justify-end">
        <Button
          color="primary"
          variant="flat"
          onPress={onUse}
          startContent={<Icon icon="lucide:copy" width={16} />}
        >
          Use Template
        </Button>
      </CardFooter>
    </Card>
  );
}