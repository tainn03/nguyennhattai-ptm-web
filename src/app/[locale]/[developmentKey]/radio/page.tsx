"use client";

import { useState } from "react";

import { PageHeader, RadioGroup } from "@/components/molecules";
import { RadioItem } from "@/components/molecules/RadioGroup/RadioGroup";

const RADIO_WITH_SUB_ITEMS: RadioItem[] = [
  {
    value: "1",
    label: "Radio Item 1",
    subLabel: "Radio Item 1 Sub Label",
  },
  {
    value: "2",
    label: "Radio Item 2",
    subLabel: "Radio Item 2 Sub Label",
  },
  {
    value: "3",
    label: "Radio Item 3",
    subLabel: "Radio Item 3 Sub Label",
  },
  {
    value: "4",
    label: "Radio Item 4",
    subLabel: "Radio Item 4 Sub Label",
  },
];

const RADIO_ITEMS: RadioItem[] = [
  {
    value: "1",
    label: "Radio Item 1",
  },
  {
    value: "2",
    label: "Radio Item 2",
  },
  {
    value: "3",
    label: "Radio Item 3",
  },
  {
    value: "4",
    label: "Radio Item 4",
  },
];

export default function Page() {
  const [radio1, setRadio1] = useState<string>("1");
  const [radio2, setRadio2] = useState<string>("1");
  const [radio3, setRadio3] = useState<string>("3");
  const [radio4, setRadio4] = useState<string>("1");
  const [radio5, setRadio5] = useState<string>("3");
  const [radio6, setRadio6] = useState<string>("3");

  return (
    <div>
      <PageHeader title="Radio component" />

      <div className="mt-10 flex flex-col gap-x-4 gap-y-6">
        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Direction Row</h2>
          <div className="space-x-6">
            <RadioGroup
              name="radioDirectionRow"
              items={RADIO_ITEMS}
              direction="row"
              value={radio1}
              onChange={(value) => setRadio1(value.value)}
            />
            Value: {radio1}
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-x-4 gap-y-6">
        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Direction Column</h2>
          <div className="space-x-6">
            <RadioGroup
              name="radioDirectionColumn"
              items={RADIO_ITEMS}
              direction="column"
              value={radio2}
              onChange={(value) => setRadio2(value.value)}
            />
            Value: {radio2}
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-x-4 gap-y-6">
        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Direction Auto & Initial Value</h2>
          <div className="space-x-6">
            <RadioGroup
              name="radioInitialValue"
              items={RADIO_ITEMS}
              value={radio3}
              onChange={(value) => setRadio3(value.value)}
            />
            Value: {radio3}
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-x-4 gap-y-6">
        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Label & subLabel</h2>
          <div className="space-x-6">
            <RadioGroup
              label="Label & subLabel"
              description="Direction for Label & subLabel"
              name="radioLabelSubLabel"
              items={RADIO_ITEMS}
              value={radio4}
              onChange={(value) => setRadio4(value.value)}
            />
            Value: {radio4}
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-x-4 gap-y-6">
        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Row with description</h2>
          <div className="space-x-6">
            <RadioGroup
              name="radioLabelSubLabelRow"
              items={RADIO_WITH_SUB_ITEMS}
              value={radio5}
              onChange={(value) => setRadio5(value.value)}
            />
            Value: {radio5}
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-x-4 gap-y-6">
        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Column with description</h2>
          <div className="space-x-6">
            <RadioGroup
              name="radioLabelSubLabelColumn"
              items={RADIO_WITH_SUB_ITEMS}
              direction="column"
              value={radio6}
              onChange={(value) => setRadio6(value.value)}
            />
            Value: {radio6}
          </div>
        </div>
      </div>
    </div>
  );
}
