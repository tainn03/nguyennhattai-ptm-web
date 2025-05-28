"use client";

import { useCallback, useState } from "react";

import { Checkbox } from "@/components/atoms";
import { CheckboxGroup, PageHeader } from "@/components/molecules";
import { CheckboxItem } from "@/components/molecules/CheckboxGroup/CheckboxGroup";

const CHECKBOX_WITH_SUB_ITEMS: CheckboxItem[] = [
  {
    value: "1",
    label: "Checkbox Item 1",
    subLabel: "Checkbox Item 1 Sub Label",
    checked: true,
  },
  {
    value: "2",
    label: "Checkbox Item 2",
    subLabel: "Checkbox Item 2 Sub Label",
    checked: false,
  },
  {
    value: "3",
    label: "Checkbox Item 3",
    subLabel: "Checkbox Item 3 Sub Label",
    checked: false,
  },
  {
    value: "4",
    label: "Checkbox Item 4",
    subLabel: "Checkbox Item 4 Sub Label",
    checked: false,
  },
];

const CHECKBOX_ITEMS: CheckboxItem[] = [
  {
    value: "1",
    label: "Checkbox Item 1",
    checked: true,
  },
  {
    value: "2",
    label: "Checkbox Item 2",
    checked: false,
  },
  {
    value: "3",
    label: "Checkbox Item 3",
    checked: false,
  },
  {
    value: "4",
    label: "Checkbox Item 4",
    checked: false,
  },
];

const CHECKED_ALL_ITEMS: CheckboxItem[] = [
  {
    value: "1",
    label: "Checkbox Item 1",
    checked: true,
  },
  {
    value: "2",
    label: "Checkbox Item 2",
    checked: true,
  },
  {
    value: "3",
    label: "Checkbox Item 3",
    checked: true,
  },
  {
    value: "4",
    label: "Checkbox Item 4",
    checked: true,
  },
];

export default function Page() {
  const [checkbox1, setCheckbox1] = useState(true);
  const [checkbox2, setCheckbox2] = useState(CHECKBOX_ITEMS);
  const [checkbox3, setCheckbox3] = useState(CHECKBOX_ITEMS);
  const [checkbox4, setCheckbox4] = useState(CHECKED_ALL_ITEMS);
  const [checkbox5, setCheckbox5] = useState(CHECKBOX_ITEMS);
  const [checkbox6, setCheckbox6] = useState(CHECKBOX_WITH_SUB_ITEMS);
  const [checkbox7, setCheckbox7] = useState(CHECKBOX_WITH_SUB_ITEMS);

  const getCheckedValues = useCallback(
    (values: CheckboxItem[]) =>
      `[${values
        .filter(({ checked }) => checked)
        .map(({ value }) => value)
        .join(", ")}]`,
    []
  );

  return (
    <div>
      <PageHeader title="Checkbox component" actionHorizontal />

      <div className="mt-10 flex flex-col gap-x-4 gap-y-6">
        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Single Checkbox</h2>
          <div className="space-x-6">
            <Checkbox
              name="SingleCheckbox"
              value="1"
              label="Checkbox Item 1"
              direction="row"
              checked={checkbox1}
              onChange={() => setCheckbox1((prevChecked) => !prevChecked)}
            />
            Checked: {checkbox1 ? "true" : "false"}
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-x-4 gap-y-6">
        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Direction Row</h2>
          <div className="space-x-6">
            <CheckboxGroup
              name="checkboxDirectionRow"
              direction="row"
              items={checkbox2}
              onChange={(values) => setCheckbox2(values)}
            />
            Value: {getCheckedValues(checkbox2)}
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-x-4 gap-y-6">
        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Direction Column</h2>
          <div className="space-x-6">
            <CheckboxGroup
              name="checkboxDirectionColumn"
              direction="column"
              items={checkbox3}
              onChange={(values) => setCheckbox3(values)}
            />
            Value: {getCheckedValues(checkbox3)}
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-x-4 gap-y-6">
        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Direction Auto & Initial Value</h2>
          <div className="space-x-6">
            <CheckboxGroup name="checkboxInitialValue" items={checkbox4} onChange={(values) => setCheckbox4(values)} />
            Value: {getCheckedValues(checkbox4)}
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-x-4 gap-y-6">
        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Label & subLabel</h2>
          <div className="space-x-6">
            <CheckboxGroup
              label="Label & subLabel"
              description="Direction for Label & subLabel"
              name="checkboxLabelSubLabel"
              items={checkbox5}
              onChange={(values) => setCheckbox5(values)}
            />
            Value: {getCheckedValues(checkbox5)}
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-x-4 gap-y-6">
        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Row with description</h2>
          <div className="space-x-6">
            <CheckboxGroup
              name="checkboxLabelSubLabelRow"
              items={checkbox6}
              onChange={(values) => setCheckbox6(values)}
            />
            Value: {getCheckedValues(checkbox6)}
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-x-4 gap-y-6">
        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Column with description</h2>
          <div className="space-x-6">
            <CheckboxGroup
              name="checkboxLabelSubLabelColumn"
              direction="column"
              items={checkbox7}
              onChange={(values) => setCheckbox7(values)}
            />
            Value: {getCheckedValues(checkbox7)}
          </div>
        </div>
      </div>
    </div>
  );
}
