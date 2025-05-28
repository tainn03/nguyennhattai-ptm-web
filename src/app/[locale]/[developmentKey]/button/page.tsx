"use client";

import { PlusIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

import { Button, PageHeader } from "@/components/molecules";

export default function Page() {
  return (
    <div>
      <PageHeader title="Button component" actionHorizontal />

      <div className="mt-10 flex flex-col gap-x-4 gap-y-6">
        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Variants</h2>
          <div className="space-x-6">
            <Button variant="contained">Contained</Button>
            <Button variant="outlined">Outlined</Button>
            <Button variant="text">Text</Button>
          </div>
        </div>

        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Sizes</h2>
          <div className="space-x-6">
            <Button size="small">Small</Button>
            <Button>Medium</Button>
            <Button size="large">Large</Button>
          </div>
        </div>

        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Colors</h2>
          <div className="space-x-6">
            <Button color="primary">Primary</Button>
            <Button color="secondary">Secondary</Button>
            <Button color="success">Success</Button>
            <Button color="info">Info</Button>
            <Button color="warning">Warning</Button>
            <Button color="error">Error</Button>
          </div>
          <div className="space-x-6">
            <Button variant="outlined" color="primary">
              Primary
            </Button>
            <Button variant="outlined" color="secondary">
              Secondary
            </Button>
            <Button variant="outlined" color="success">
              Success
            </Button>
            <Button variant="outlined" color="info">
              Info
            </Button>
            <Button variant="outlined" color="warning">
              Warning
            </Button>
            <Button variant="outlined" color="error">
              Error
            </Button>
          </div>
          <div className="space-x-6">
            <Button variant="text" color="primary">
              Primary
            </Button>
            <Button variant="text" color="secondary">
              Secondary
            </Button>
            <Button variant="text" color="success">
              Success
            </Button>
            <Button variant="text" color="info">
              Info
            </Button>
            <Button variant="text" color="warning">
              Warning
            </Button>
            <Button variant="text" color="error">
              Error
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Rounded</h2>
          <div className="flex gap-x-6">
            <Button>Normal</Button>
            <Button shape="pill">Pill Button</Button>
            <Button shape="circle">
              <PlusIcon className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Icon</h2>
          <div className="flex items-center space-x-6">
            <Button icon={CheckCircleIcon}>Start Icon</Button>
            <Button icon={CheckCircleIcon} loading>
              Start Icon with Loading
            </Button>
            <Button icon={PlusIcon} iconPlacement="end">
              End Icon
            </Button>
            <Button loading>Loading</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
